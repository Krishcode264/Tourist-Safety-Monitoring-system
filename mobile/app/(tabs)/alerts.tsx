import React, { useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    Bell,
    AlertTriangle,
    ShieldAlert,
    ShieldCheck,
    X,
    MapPin,
    BellOff,
} from 'lucide-react-native';
import { useAtom } from 'jotai';
import { geofenceAlertsAtom, GeofenceAlert } from '@/atoms/geofenceAlerts';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(ts: number): string {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
    return `${Math.floor(hrs / 24)} day(s) ago`;
}

interface AlertStyle {
    bg: string;
    border: string;
    iconBg: string;
    dot: string;
    label: string;
    labelColor: string;
}

function getStyle(type: string): AlertStyle {
    switch (type) {
        case 'DANGER':
            return {
                bg: '#fff5f5',
                border: '#fecaca',
                iconBg: '#fee2e2',
                dot: '#ef4444',
                label: 'DANGER ZONE',
                labelColor: '#dc2626',
            };
        case 'RESTRICTED':
            return {
                bg: '#fffbeb',
                border: '#fde68a',
                iconBg: '#fef3c7',
                dot: '#f59e0b',
                label: 'RESTRICTED',
                labelColor: '#d97706',
            };
        case 'SAFE':
            return {
                bg: '#f0fdf4',
                border: '#bbf7d0',
                iconBg: '#dcfce7',
                dot: '#22c55e',
                label: 'SAFE ZONE',
                labelColor: '#16a34a',
            };
        default:
            return {
                bg: '#f8fafc',
                border: '#e2e8f0',
                iconBg: '#f1f5f9',
                dot: '#8b5cf6',
                label: 'MONITORED',
                labelColor: '#7c3aed',
            };
    }
}

function AlertIcon({ type }: { type: string }) {
    switch (type) {
        case 'DANGER':
            return <AlertTriangle size={20} color="#dc2626" />;
        case 'RESTRICTED':
            return <ShieldAlert size={20} color="#d97706" />;
        case 'SAFE':
            return <ShieldCheck size={20} color="#16a34a" />;
        default:
            return <MapPin size={20} color="#7c3aed" />;
    }
}

// ─── Alert Card ───────────────────────────────────────────────────────────────

function AlertCard({
    item,
    onDismiss,
    onRead,
}: {
    item: GeofenceAlert;
    onDismiss: (id: string) => void;
    onRead: (id: string) => void;
}) {
    const s = getStyle(item.fenceType);

    return (
        <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => onRead(item.id)}
            style={[
                styles.card,
                {
                    backgroundColor: s.bg,
                    borderColor: s.border,
                    opacity: item.read ? 0.7 : 1,
                },
            ]}
        >
            {/* Unread dot */}
            {!item.read && (
                <View style={[styles.unreadDot, { backgroundColor: s.dot }]} />
            )}

            {/* Icon */}
            <View style={[styles.iconWrap, { backgroundColor: s.iconBg }]}>
                <AlertIcon type={item.fenceType} />
            </View>

            {/* Text */}
            <View style={styles.textWrap}>
                <View style={styles.rowBetween}>
                    <Text style={[styles.label, { color: s.labelColor }]}>
                        {s.label}
                    </Text>
                    <Text style={styles.time}>{relativeTime(item.timestamp)}</Text>
                </View>
                <Text style={styles.fenceName}>{item.fenceName}</Text>
                <Text style={styles.message}>{item.message}</Text>
            </View>

            {/* Dismiss */}
            <TouchableOpacity
                onPress={() => onDismiss(item.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.dismissBtn}
            >
                <X size={14} color="#94a3b8" />
            </TouchableOpacity>
        </TouchableOpacity>
    );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AlertsScreen() {
    const [alerts, setAlerts] = useAtom(geofenceAlertsAtom);

    const unreadCount = alerts.filter((a) => !a.read).length;

    const handleDismiss = useCallback(
        (id: string) => {
            Vibration.vibrate(30);
            setAlerts((prev) => prev.filter((a) => a.id !== id));
        },
        [setAlerts]
    );

    const handleRead = useCallback(
        (id: string) => {
            setAlerts((prev) =>
                prev.map((a) => (a.id === id ? { ...a, read: true } : a))
            );
        },
        [setAlerts]
    );

    const markAllRead = useCallback(() => {
        setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
    }, [setAlerts]);

    const clearAll = useCallback(() => {
        Vibration.vibrate(40);
        setAlerts([]);
    }, [setAlerts]);

    return (
        <SafeAreaView style={styles.screen} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Safety Alerts</Text>
                    <Text style={styles.subtitle}>
                        {unreadCount > 0
                            ? `${unreadCount} new geofence alert${unreadCount > 1 ? 's' : ''}`
                            : 'Real-time geofence notifications'}
                    </Text>
                </View>
                {alerts.length > 0 && (
                    <View style={styles.headerActions}>
                        {unreadCount > 0 && (
                            <TouchableOpacity
                                onPress={markAllRead}
                                style={styles.headerBtn}
                            >
                                <Text style={styles.headerBtnText}>Mark all read</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            onPress={clearAll}
                            style={[styles.headerBtn, styles.clearBtn]}
                        >
                            <Text style={[styles.headerBtnText, { color: '#ef4444' }]}>
                                Clear all
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Legend */}
            <View style={styles.legend}>
                {[
                    { type: 'DANGER', color: '#ef4444', label: 'Danger' },
                    { type: 'RESTRICTED', color: '#f59e0b', label: 'Restricted' },
                    { type: 'SAFE', color: '#22c55e', label: 'Safe' },
                    { type: 'MONITORED', color: '#8b5cf6', label: 'Monitored' },
                ].map((l) => (
                    <View key={l.type} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                        <Text style={styles.legendLabel}>{l.label}</Text>
                    </View>
                ))}
            </View>

            {/* List */}
            <FlatList
                data={alerts}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => (
                    <AlertCard
                        item={item}
                        onDismiss={handleDismiss}
                        onRead={handleRead}
                    />
                )}
                ListEmptyComponent={() => (
                    <View style={styles.empty}>
                        <BellOff size={52} color="#cbd5e1" />
                        <Text style={styles.emptyTitle}>No alerts yet</Text>
                        <Text style={styles.emptySubtitle}>
                            You'll be notified instantly when you enter or exit a
                            geofenced zone defined by the safety admin.
                        </Text>
                    </View>
                )}
            />
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#f8fafc' },

    header: {
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 12,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: '#0f172a',
    },
    subtitle: {
        fontSize: 13,
        color: '#64748b',
        marginTop: 2,
    },
    headerActions: { flexDirection: 'column', alignItems: 'flex-end', gap: 4 },
    headerBtn: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: '#f1f5f9',
    },
    clearBtn: { backgroundColor: '#fff1f2' },
    headerBtnText: { fontSize: 12, fontWeight: '600', color: '#475569' },

    legend: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        paddingVertical: 10,
        backgroundColor: '#ffffff',
        gap: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendLabel: { fontSize: 11, color: '#64748b', fontWeight: '500' },

    list: { padding: 16, gap: 10 },

    card: {
        borderRadius: 16,
        borderWidth: 1.5,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    unreadDot: {
        position: 'absolute',
        top: 12,
        right: 32,
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    textWrap: { flex: 1 },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    label: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
    time: { fontSize: 10, color: '#94a3b8' },
    fenceName: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 3 },
    message: { fontSize: 12, color: '#475569', lineHeight: 17 },
    dismissBtn: {
        padding: 4,
        alignSelf: 'flex-start',
    },

    empty: {
        alignItems: 'center',
        paddingTop: 80,
        paddingHorizontal: 32,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#475569',
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 13,
        color: '#94a3b8',
        textAlign: 'center',
        lineHeight: 20,
    },
});
