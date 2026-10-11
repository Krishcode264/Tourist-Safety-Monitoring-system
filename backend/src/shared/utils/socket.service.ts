import { Server, Socket } from 'socket.io';
import { prisma } from '../db/client';
import { GeofenceService } from '../../features/geofences/geofence.service';

function isPointInPolygon(point: {lat: number, lng: number}, vs: {lat: number, lng: number}[]) {
    let x = point.lng, y = point.lat;
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        let xi = vs[i].lng, yi = vs[i].lat;
        let xj = vs[j].lng, yj = vs[j].lat;
        let intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}


export class SocketService {
    private static instance: SocketService;
    private io: Server | null = null;
    private connectedUsers: Map<string, string> = new Map(); // socketId -> userId
    private lastAlerted: Map<string, number> = new Map(); // key: userId:geofenceId -> timestamp
    private mutedBreaches: Set<string> = new Set(); // key: userId:geofenceId

    private constructor() { }

    static getInstance(): SocketService {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    }

    initialize(io: Server) {
        this.io = io;
        this.io.on('connection', (this.handleConnection.bind(this)));
    }

    private handleConnection(socket: Socket) {
        console.log(`Socket connected: ${socket.id}`);

        // Auth handshake (basic implementation)
        const userId = socket.handshake.auth.userId;
        if (userId) {
            this.connectedUsers.set(socket.id, userId);
            socket.join(`user:${userId}`);
            console.log(`User ${userId} authenticated on socket ${socket.id}`);
        }

        const role = socket.handshake.auth.role;
        if (role) {
            socket.join(`role:${role}`);
        }

        const regionId = socket.handshake.auth.regionId;
        if (regionId) {
            socket.join(`region:${regionId}`);
            console.log(`User joint region room: region:${regionId}`);
        }

        socket.on('disconnect', () => {
            this.connectedUsers.delete(socket.id);
            console.log(`Socket disconnected: ${socket.id}`);
        });

        // Cache for Geofences to avoid DB pressure
        let cachedFences: any[] = [];
        let lastCacheUpdate = 0;
        const CACHE_TTL = 30000; // 30 seconds

        const getFences = async () => {
            const now = Date.now();
            if (now - lastCacheUpdate > CACHE_TTL || cachedFences.length === 0) {
                const gfService = new GeofenceService();
                cachedFences = await gfService.getActiveGeofences();
                lastCacheUpdate = now;
                console.log(`🔄 Geofence Cache Refreshed: ${cachedFences.length} fences`);
            }
            return cachedFences;
        };

        // Handle incoming tracking updates from Tourist App
        socket.on('tourist:location_update', async (data) => {
            console.log(`📡 Telemetry from ${data.id}: Lat ${data.lat}, Lng ${data.lng}`);
            // Broadcast to specific roles and also a generic live event
            this.broadcastToRole('L2', 'live:tourist_update', data);
            this.broadcastToRole('L3', 'live:tourist_update', data);
            this.broadcastToRole('L4', 'live:tourist_update', data);
            
            // Generic broadcast for dashboard map
            this.io?.emit('live:tourist_update', data);

            // Real-time Geofence Breach Detection
            try {
                const fences = await getFences();
                if (fences) {
                    for (const gf of fences) {
                        const inPolygon = isPointInPolygon({lat: data.lat, lng: data.lng}, gf.coordinates);
                        const breachKey = `${data.id}:${gf.id}`;

                        if (inPolygon) {
                            // Check for throttling and muting
                            const now = Date.now();
                            const lastTime = this.lastAlerted.get(breachKey) || 0;
                            const COOLDOWN = 5 * 60 * 1000; // 5 minutes

                            if (now - lastTime > COOLDOWN && !this.mutedBreaches.has(breachKey)) {
                                const payload = {
                                    touristId: data.id,
                                    touristName: data.name,
                                    geofenceId: gf.id,
                                    geofenceName: gf.name,
                                    riskLevel: gf.riskLevel,
                                    type: gf.type,
                                    timestamp: new Date()
                                };
                                
                                // 1) Emit to Administrators via Roles
                                this.broadcastToRole('L2', 'alert:geofence_breach', payload);
                                this.broadcastToRole('L3', 'alert:geofence_breach', payload);
                                this.broadcastToRole('L4', 'alert:geofence_breach', payload);
                                
                                // 2) Emit directly to the Tourist who breached it
                                socket.emit('alert:user_geofence_breach', payload);
                                
                                // Fallback global targeting
                                this.io?.to(`user:${data.id}`).emit('alert:user_geofence_breach', payload);

                                // Update last alerted time
                                this.lastAlerted.set(breachKey, now);
                            }
                        } else {
                            // If user is outside, remove from muted breaches so it can trigger again on re-entry
                            if (this.mutedBreaches.has(breachKey)) {
                                this.mutedBreaches.delete(breachKey);
                                console.log(`🔓 Breach unmuted (user left zone): ${breachKey}`);
                            }
                            // Also clear alert history if they've been out for a while (optional)
                        }
                    }
                }
            } catch (err) {
                console.error('Error in geofence breach detection:', err);
            }
        });

        // Dashboard Acknowledge Breach
        socket.on('admin:acknowledge_breach', (data: { userId: string, geofenceId: string }) => {
            const breachKey = `${data.userId}:${data.geofenceId}`;
            this.mutedBreaches.add(breachKey);
            console.log(`🔕 Breach muted by admin: ${breachKey}`);
            
            // Broadcast acknowledgment back to admins so UI can update
            this.broadcastToRole('L2', 'admin:breach_acknowledged', data);
            this.broadcastToRole('L3', 'admin:breach_acknowledged', data);
            this.broadcastToRole('L4', 'admin:breach_acknowledged', data);
        });

        // Handle Panic
        socket.on('tourist:panic', (data) => {
            this.broadcastToRole('L2', 'alert:panic', data);
            this.broadcastToRole('L3', 'alert:panic', data);
        });

        // --- Chat Features ---
        // Join Chat Room
        socket.on('chat:join', (incidentId: string) => {
            socket.join(`incident:${incidentId}`);
            console.log(`Socket ${socket.id} joined chat room incident:${incidentId}`);
        });

        // Send Chat Message
        socket.on('chat:send', async (data: { incidentId: string, content: string, senderRole: string, senderId?: string }) => {
            try {
                // Save to database
                const message = await prisma.incidentMessage.create({
                    data: {
                        incidentId: data.incidentId,
                        content: data.content,
                        senderRole: data.senderRole,
                        senderId: data.senderId
                    }
                });

                // Broadcast to everyone in the incident room
                this.io?.to(`incident:${data.incidentId}`).emit('chat:receive', message);
            } catch (error) {
                console.error('Failed to save or broadcast chat message:', error);
            }
        });

        // Typing Indicator in Chat
        socket.on('chat:typing', (data: { incidentId: string; isTyping: boolean; senderRole: string; senderName?: string; senderId?: string }) => {
            if (data?.incidentId) {
                socket.to(`incident:${data.incidentId}`).emit('chat:typing', data);
            }
        });
    }

    // --- Emitters matching Data Contract Section 8 ---

    notifyNewIncident(incident: any, targetedRegionIds?: string[]) {
        if (!this.io) return;
        
        const payload = {
            type: 'incident:new',
            entityId: incident.id,
            timestamp: new Date(),
            payload: {
                type: incident.type,
                priority: incident.severity,
                location: { lat: incident.latitude, lng: incident.longitude }
            }
        };

        if (targetedRegionIds && targetedRegionIds.length > 0) {
            // Broadcast to all relevant regions in the hierarchy
            for (const rid of targetedRegionIds) {
                this.io.to(`region:${rid}`).emit('incident:new', payload);
            }
        } else {
            // Fallback: Global broadcast
            this.io.emit('incident:new', payload);
        }
    }

    notifyIncidentStatusChange(incidentId: string, status: string, oldStatus: string) {
        if (!this.io) return;
        this.io.emit('incident:update', {
            type: 'incident:status_change',
            entityId: incidentId,
            timestamp: new Date(),
            payload: { status, oldStatus }
        });
    }

    broadcastToRole(role: string, event: string, data: any) {
        if (!this.io) return;
        this.io.to(`role:${role}`).emit(event, data);
    }

    broadcastToRegion(regionId: string, event: string, data: any) {
        if (!this.io) return;
        this.io.to(`region:${regionId}`).emit(event, data);
    }
}
