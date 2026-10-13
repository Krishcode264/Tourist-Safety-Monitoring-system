import { useEffect, useRef, useCallback } from 'react';
import { useAtom } from 'jotai';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import axios from 'axios';
import { BACKEND_URL } from '@/constants/Config';
import {
    geofenceAlertsAtom,
    activeFenceIdsAtom,
    GeofenceAlert,
} from '@/atoms/geofenceAlerts';

// ── Geometry helper: point-in-polygon (ray casting) ──────────────────────────
function pointInPolygon(
    lat: number,
    lng: number,
    polygon: { lat: number; lng: number }[]
): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].lat, yi = polygon[i].lng;
        const xj = polygon[j].lat, yj = polygon[j].lng;
        const intersect =
            yi > lng !== yj > lng &&
            lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
    }
    return inside;
}

// ── Message per fence type ────────────────────────────────────────────────────
function buildMessage(name: string, type: string): string {
    switch (type) {
        case 'DANGER':
            return `⚠️ DANGER ZONE: You have entered "${name}". Please leave immediately.`;
        case 'RESTRICTED':
            return `🚫 RESTRICTED ZONE: You are in "${name}". Access may be limited.`;
        case 'SAFE':
            return `✅ SAFE ZONE: You are inside "${name}". You are in a monitored safe area.`;
        default:
            return `📍 MONITORED ZONE: You have entered "${name}".`;
    }
}

// ── Hook ──────────────────────────────────────────────────────────────────────
const POLL_INTERVAL_MS = 15_000; // check location every 15 s
const FENCE_REFRESH_MS = 60_000; // re-fetch fence list every 60 s

export function useGeofenceWatcher() {
    const [, setAlerts] = useAtom(geofenceAlertsAtom);
    const [, setActiveFenceIds] = useAtom(activeFenceIdsAtom);

    // ── Refs (always fresh inside intervals — no stale closure) ──────────────
    const geofencesRef = useRef<any[]>([]);
    const soundRef = useRef<Audio.Sound | null>(null);
    const locationPermGranted = useRef(false);

    /**
     * KEY FIX: Store the "currently inside" fence IDs in a ref, NOT in React
     * state. This means setInterval callbacks always read the latest value
     * without being re-created or capturing a stale closure.
     *
     * The atom (activeFenceIdsAtom) is still updated so the Alerts screen
     * can display which zones the user is currently in, but the GUARD CHECK
     * uses the ref directly.
     */
    const activeFenceIdsRef = useRef<Set<string>>(new Set<string>());

    // ── Load alert sound once ────────────────────────────────────────────────
    const loadSound = useCallback(async () => {
        try {
            await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
            const { sound } = await Audio.Sound.createAsync(
                { uri: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg' },
                { shouldPlay: false }
            );
            soundRef.current = sound;
        } catch (e) {
            console.warn('[GeofenceWatcher] Could not load alert sound:', e);
        }
    }, []);

    const playAlert = useCallback(async () => {
        try {
            if (soundRef.current) {
                await soundRef.current.setPositionAsync(0);
                await soundRef.current.playAsync();
            }
        } catch (e) {
            console.warn('[GeofenceWatcher] Sound play error:', e);
        }
    }, []);

    // ── Fetch geofences ──────────────────────────────────────────────────────
    const fetchFences = useCallback(async () => {
        try {
            const res = await axios.get(`${BACKEND_URL}/api/geofences`);
            if (res.data?.success && Array.isArray(res.data.data)) {
                geofencesRef.current = res.data.data;
            }
        } catch (e) {
            console.warn('[GeofenceWatcher] Failed to fetch geofences:', e);
        }
    }, []);

    // ── Check location against all fences ────────────────────────────────────
    // NOTE: No dependencies on React state — uses only refs so the same
    // function reference works correctly inside setInterval forever.
    const checkLocation = useCallback(async () => {
        if (!locationPermGranted.current) return;
        if (geofencesRef.current.length === 0) return;

        let loc: Location.LocationObject;
        try {
            loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
        } catch {
            return;
        }

        const { latitude: userLat, longitude: userLng } = loc.coords;

        // Build the set of fences the user is CURRENTLY inside
        const nowInside = new Set<string>();

        for (const gf of geofencesRef.current) {
            if (!Array.isArray(gf.coordinates) || gf.coordinates.length < 3) continue;

            const coords = gf.coordinates.map((c: any) => ({
                lat: Number(c.lat),
                lng: Number(c.lng),
            }));

            const inside = pointInPolygon(userLat, userLng, coords);

            if (inside) {
                nowInside.add(gf.id);

                // ✅ Guard check uses REF — always fresh, never stale
                // Only fires alert on ENTRY (first detection inside this fence)
                if (!activeFenceIdsRef.current.has(gf.id)) {
                    const alert: GeofenceAlert = {
                        id: `${gf.id}-${Date.now()}`,
                        fenceId: gf.id,
                        fenceName: gf.name,
                        fenceType: gf.type,
                        message: buildMessage(gf.name, gf.type),
                        timestamp: Date.now(),
                        read: false,
                    };
                    // Push to atom so Alerts screen sees it
                    setAlerts((prev) => [alert, ...prev].slice(0, 50));
                    // Play sound
                    playAlert();
                    console.log(`[GeofenceWatcher] ENTERED: ${gf.name} (${gf.type})`);
                }
                // else: user already inside → do nothing (no duplicate alert)
            } else {
                // User has exited this fence
                if (activeFenceIdsRef.current.has(gf.id)) {
                    console.log(`[GeofenceWatcher] EXITED: ${gf.name}`);
                }
            }
        }

        // ✅ Update the ref immediately (synchronous) — next interval will see the new set
        activeFenceIdsRef.current = nowInside;

        // Also sync to atom so Alerts screen can show "currently inside" badges
        setActiveFenceIds(new Set(nowInside));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // ← Empty deps: function is stable, reads everything through refs

    // ── Mount ────────────────────────────────────────────────────────────────
    useEffect(() => {
        let locationTimer: ReturnType<typeof setInterval>;
        let fenceTimer: ReturnType<typeof setInterval>;

        (async () => {
            // 1. Request location permission
            const { status } = await Location.requestForegroundPermissionsAsync();
            locationPermGranted.current = status === 'granted';

            // 2. Load alert sound
            await loadSound();

            // 3. Initial fence fetch + first location check
            await fetchFences();
            await checkLocation();

            // 4. Recurring timers
            locationTimer = setInterval(checkLocation, POLL_INTERVAL_MS);
            fenceTimer    = setInterval(fetchFences,   FENCE_REFRESH_MS);
        })();

        return () => {
            clearInterval(locationTimer);
            clearInterval(fenceTimer);
            soundRef.current?.unloadAsync();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Mount once — all mutable state lives in refs
}
