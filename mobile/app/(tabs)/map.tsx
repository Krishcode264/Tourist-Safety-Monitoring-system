import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, RefreshCw, Layers } from 'lucide-react-native';
import MapView, { Marker, Polygon, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import axios from 'axios';
import { BACKEND_URL } from '../../constants/Config';

// ─── Types ────────────────────────────────────────────────────────────────────

type FenceType = 'DANGER' | 'RESTRICTED' | 'SAFE' | 'MONITORED';

interface Geofence {
    id: string;
    name: string;
    type: FenceType;
    coordinates: { lat: number; lng: number }[];
}

// ─── Colors per type ──────────────────────────────────────────────────────────

const FENCE_COLORS: Record<FenceType, { fill: string; stroke: string; label: string }> = {
    DANGER:     { fill: 'rgba(239,68,68,0.25)',    stroke: '#ef4444', label: 'Danger' },
    RESTRICTED: { fill: 'rgba(245,158,11,0.25)',   stroke: '#f59e0b', label: 'Restricted' },
    SAFE:       { fill: 'rgba(16,185,129,0.25)',   stroke: '#10b981', label: 'Safe' },
    MONITORED:  { fill: 'rgba(139,92,246,0.20)',   stroke: '#8b5cf6', label: 'Monitored' },
};

const FENCE_REFRESH_MS = 30_000; // refresh every 30 s

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MapScreen() {
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [geofences, setGeofences] = useState<Geofence[]>([]);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [showLegend, setShowLegend] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // ── Fetch geofences ────────────────────────────────────────────────────
    const fetchGeofences = useCallback(async (showSpinner = false) => {
        if (showSpinner) setRefreshing(true);
        try {
            const response = await axios.get(`${BACKEND_URL}/api/geofences`);
            if (response.data?.success && Array.isArray(response.data.data)) {
                setGeofences(response.data.data);
                setLastUpdated(new Date());
            }
        } catch (err) {
            console.warn('Error fetching geofences:', err);
        } finally {
            if (showSpinner) setRefreshing(false);
        }
    }, []);

    // ── Init ───────────────────────────────────────────────────────────────
    useEffect(() => {
        let isMounted = true;
        let timer: ReturnType<typeof setInterval>;

        (async () => {
            // Location permission
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    const loc = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.Balanced,
                    });
                    if (isMounted) setLocation(loc);
                } else {
                    if (isMounted) setErrorMsg('Location permission denied');
                }
            } catch (err) {
                console.warn('Location error:', err);
            }

            // Initial fence fetch
            await fetchGeofences();
            if (isMounted) setLoading(false);

            // Live refresh
            timer = setInterval(() => {
                if (isMounted) fetchGeofences();
            }, FENCE_REFRESH_MS);
        })();

        return () => {
            isMounted = false;
            clearInterval(timer);
        };
    }, [fetchGeofences]);

    // ── Region ─────────────────────────────────────────────────────────────
    const initialRegion = location
        ? {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
          }
        : {
              latitude: 15.5494,
              longitude: 73.7535,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
          };

    // ─── Render ────────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.screen} edges={['top']}>
            <View style={styles.flex}>
                {loading ? (
                    <View style={styles.loadingWrap}>
                        <ActivityIndicator size="large" color="#10b981" />
                        <Text style={styles.loadingText}>Loading Safety Map…</Text>
                    </View>
                ) : (
                    <>
                        <MapView
                            style={StyleSheet.absoluteFillObject}
                            provider={PROVIDER_DEFAULT}
                            initialRegion={initialRegion}
                            showsUserLocation={!!location}
                            showsMyLocationButton={true}
                        >
                            {/* User marker */}
                            {location && (
                                <Marker
                                    coordinate={{
                                        latitude: location.coords.latitude,
                                        longitude: location.coords.longitude,
                                    }}
                                    title="Your Location"
                                    description="You are in a monitored zone"
                                    tracksViewChanges={false}
                                >
                                    <View style={styles.userMarker}>
                                        <MapPin size={22} color="white" fill="white" />
                                    </View>
                                </Marker>
                            )}

                            {/* Geofence polygons */}
                            {geofences.map((gf) => {
                                if (
                                    !gf ||
                                    !Array.isArray(gf.coordinates) ||
                                    gf.coordinates.length < 3
                                )
                                    return null;

                                const type: FenceType =
                                    (gf.type as FenceType) in FENCE_COLORS
                                        ? (gf.type as FenceType)
                                        : 'MONITORED';
                                const colors = FENCE_COLORS[type];

                                const polygonCoords = gf.coordinates.map((c) => ({
                                    latitude: Number(c.lat),
                                    longitude: Number(c.lng),
                                }));

                                return (
                                    <React.Fragment key={gf.id}>
                                        <Polygon
                                            coordinates={polygonCoords}
                                            fillColor={colors.fill}
                                            strokeColor={colors.stroke}
                                            strokeWidth={2.5}
                                        />
                                        <Marker
                                            coordinate={polygonCoords[0]}
                                            title={gf.name}
                                            description={`${type} ZONE`}
                                            tracksViewChanges={false}
                                            anchor={{ x: 0.5, y: 0.5 }}
                                        >
                                            <View
                                                style={[
                                                    styles.fenceLabel,
                                                    { borderColor: colors.stroke },
                                                ]}
                                            >
                                                <View
                                                    style={[
                                                        styles.fenceLabelDot,
                                                        { backgroundColor: colors.stroke },
                                                    ]}
                                                />
                                                <Text style={styles.fenceLabelText}>
                                                    {gf.name}
                                                </Text>
                                            </View>
                                        </Marker>
                                    </React.Fragment>
                                );
                            })}
                        </MapView>

                        {/* ── Top bar ── */}
                        <View style={styles.topBar}>
                            <View style={styles.topBarLeft}>
                                <Text style={styles.topBarTitle}>Safety Map</Text>
                                {lastUpdated && (
                                    <Text style={styles.topBarSub}>
                                        Updated {lastUpdated.toLocaleTimeString()}
                                    </Text>
                                )}
                            </View>
                            <View style={styles.topBarRight}>
                                {/* Refresh */}
                                <TouchableOpacity
                                    style={styles.iconBtn}
                                    onPress={() => fetchGeofences(true)}
                                    disabled={refreshing}
                                >
                                    <RefreshCw
                                        size={16}
                                        color={refreshing ? '#94a3b8' : '#0f172a'}
                                    />
                                </TouchableOpacity>
                                {/* Toggle legend */}
                                <TouchableOpacity
                                    style={[
                                        styles.iconBtn,
                                        showLegend && styles.iconBtnActive,
                                    ]}
                                    onPress={() => setShowLegend((v) => !v)}
                                >
                                    <Layers
                                        size={16}
                                        color={showLegend ? '#10b981' : '#0f172a'}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* ── Legend ── */}
                        {showLegend && (
                            <View style={styles.legend}>
                                {(
                                    Object.entries(FENCE_COLORS) as [FenceType, typeof FENCE_COLORS[FenceType]][]
                                ).map(([type, c]) => (
                                    <View key={type} style={styles.legendRow}>
                                        <View
                                            style={[
                                                styles.legendSwatch,
                                                {
                                                    backgroundColor: c.fill,
                                                    borderColor: c.stroke,
                                                },
                                            ]}
                                        />
                                        <Text style={styles.legendLabel}>{c.label}</Text>
                                    </View>
                                ))}
                                <Text style={styles.legendCount}>
                                    {geofences.length} fence{geofences.length !== 1 ? 's' : ''} active
                                </Text>
                            </View>
                        )}

                        {/* ── Error overlay ── */}
                        {errorMsg && (
                            <View style={styles.errorBanner}>
                                <Text style={styles.errorText}>{errorMsg}</Text>
                            </View>
                        )}
                    </>
                )}
            </View>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#f8fafc' },
    flex: { flex: 1, position: 'relative' },

    loadingWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f1f5f9',
    },
    loadingText: {
        color: '#64748b',
        marginTop: 12,
        fontWeight: '500',
    },

    userMarker: {
        backgroundColor: '#10b981',
        padding: 8,
        borderRadius: 24,
        borderWidth: 2.5,
        borderColor: '#ffffff',
        shadowColor: '#10b981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
        elevation: 6,
    },

    fenceLabel: {
        backgroundColor: 'rgba(255,255,255,0.92)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    fenceLabelDot: { width: 6, height: 6, borderRadius: 3 },
    fenceLabelText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#1e293b',
        maxWidth: 100,
    },

    topBar: {
        position: 'absolute',
        top: 12,
        left: 12,
        right: 12,
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
    },
    topBarLeft: {},
    topBarTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
    topBarSub: { fontSize: 10, color: '#94a3b8', marginTop: 1 },
    topBarRight: { flexDirection: 'row', gap: 8 },
    iconBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconBtnActive: { backgroundColor: '#d1fae5' },

    legend: {
        position: 'absolute',
        bottom: 24,
        left: 12,
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 14,
        padding: 12,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
        minWidth: 140,
    },
    legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    legendSwatch: {
        width: 18,
        height: 12,
        borderRadius: 3,
        borderWidth: 1.5,
    },
    legendLabel: { fontSize: 12, color: '#334155', fontWeight: '500' },
    legendCount: {
        fontSize: 10,
        color: '#94a3b8',
        marginTop: 4,
        fontWeight: '500',
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        paddingTop: 6,
    },

    errorBanner: {
        position: 'absolute',
        bottom: 24,
        right: 12,
        left: 160,
        backgroundColor: '#fef2f2',
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    errorText: { fontSize: 11, color: '#dc2626', fontWeight: '500' },
});
