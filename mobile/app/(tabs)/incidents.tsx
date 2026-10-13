import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageSquare, AlertTriangle, ChevronRight, Siren } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import axios from 'axios';
import { useAtom } from 'jotai';
import { userAtom } from '../../atoms/auth';
import { BACKEND_URL } from '../../constants/Config';

const isSOS = (item: any) => item.type?.toUpperCase() === 'SOS';

function statusColor(status: string) {
    switch (status?.toUpperCase()) {
        case 'RESOLVED': return '#10b981';
        case 'RESPONDING': return '#f59e0b';
        default: return '#ef4444';
    }
}

export default function IncidentsScreen() {
    const router = useRouter();
    const [user] = useAtom(userAtom);
    const [incidents, setIncidents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'all' | 'sos'>('all');

    useFocusEffect(
        useCallback(() => {
            const fetchIncidents = async () => {
                if (!user?.id) return;
                try {
                    setLoading(true);
                    const res = await axios.get(`${BACKEND_URL}/api/incidents/tourist/${user.id}`);
                    if (res.data.success) setIncidents(res.data.data);
                } catch (error) {
                    console.error('Failed to fetch tourist incidents', error);
                } finally {
                    setLoading(false);
                }
            };
            fetchIncidents();
        }, [user])
    );

    const sosList = incidents.filter(isSOS);
    const normalList = incidents.filter((i) => !isSOS(i));
    const displayed = activeTab === 'sos' ? sosList : normalList;

    return (
        <SafeAreaView style={styles.screen} edges={['top']}>
            <View style={styles.flex}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>My Reports</Text>
                    <Text style={styles.subtitle}>History of your safety reports and chats.</Text>

                    {/* Tabs */}
                    <View style={styles.tabRow}>
                        {([
                            { key: 'all' as const, label: 'All Reports', count: normalList.length, danger: false },
                            { key: 'sos' as const, label: '🆘 SOS', count: sosList.length, danger: true },
                        ]).map(({ key, label, count, danger }) => (
                            <TouchableOpacity
                                key={key}
                                onPress={() => setActiveTab(key)}
                                style={[
                                    styles.tab,
                                    activeTab === key && (danger ? styles.tabActiveDanger : styles.tabActive),
                                ]}
                            >
                                <Text style={[
                                    styles.tabText,
                                    activeTab === key && (danger ? styles.tabTextActiveDanger : styles.tabTextActive),
                                ]}>
                                    {label}
                                </Text>
                                {count > 0 && (
                                    <View style={[
                                        styles.tabBadge,
                                        danger ? styles.tabBadgeDanger : styles.tabBadgeNormal,
                                    ]}>
                                        <Text style={styles.tabBadgeText}>{count}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {loading ? (
                    <View style={styles.loadingWrap}>
                        <ActivityIndicator size="large" color="#10b981" />
                    </View>
                ) : (
                    <FlatList
                        data={displayed}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.list}
                        renderItem={({ item }) => {
                            const sos = isSOS(item);
                            const dateStr = new Date(item.createdAt).toLocaleDateString([], {
                                month: 'short', day: 'numeric',
                                hour: '2-digit', minute: '2-digit',
                            });
                            const lastMessage = item.messages?.[0]?.content || 'Waiting for admin response…';
                            const color = statusColor(item.status);

                            if (sos) {
                                return (
                                    <TouchableOpacity
                                        onPress={() => router.push({ pathname: '/incident-report', params: { id: item.id } })}
                                        style={styles.sosCard}
                                    >
                                        <View style={styles.sosCardInner}>
                                            <View style={styles.sosIconWrap}>
                                                <Siren size={22} color="#ffffff" />
                                            </View>
                                            <View style={styles.sosContent}>
                                                <View style={styles.sosTopRow}>
                                                    <View style={styles.sosLabelWrap}>
                                                        <Text style={styles.sosLabel}>🆘 SOS EMERGENCY</Text>
                                                        {item.status !== 'RESOLVED' && (
                                                            <View style={styles.liveDot} />
                                                        )}
                                                    </View>
                                                    <Text style={styles.sosDate}>{dateStr}</Text>
                                                </View>
                                                <Text style={styles.sosDesc} numberOfLines={2}>
                                                    {item.description || 'Emergency SOS submitted'}
                                                </Text>
                                                <View style={[styles.statusPill, { backgroundColor: color + '20', borderColor: color }]}>
                                                    <Text style={[styles.statusPillText, { color }]}>{item.status}</Text>
                                                </View>
                                            </View>
                                            <ChevronRight size={16} color="#fca5a5" />
                                        </View>
                                    </TouchableOpacity>
                                );
                            }

                            return (
                                <TouchableOpacity
                                    onPress={() => router.push({ pathname: '/incident-report', params: { id: item.id } })}
                                    style={styles.normalCard}
                                >
                                    <View style={styles.normalTopRow}>
                                        <View style={styles.statusDotRow}>
                                            <View style={[styles.statusDot, { backgroundColor: color }]} />
                                            <Text style={[styles.statusText, { color }]}>{item.status}</Text>
                                        </View>
                                        <Text style={styles.dateText}>{dateStr}</Text>
                                    </View>
                                    <View style={styles.normalBody}>
                                        <View style={styles.normalIconWrap}>
                                            <AlertTriangle size={22} color={color} />
                                        </View>
                                        <View style={styles.normalContent}>
                                            <Text style={styles.normalType}>{item.type}</Text>
                                            <Text style={styles.normalMsg} numberOfLines={1}>{lastMessage}</Text>
                                        </View>
                                        <ChevronRight size={18} color="#cbd5e1" />
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                        ListEmptyComponent={() => (
                            <View style={styles.empty}>
                                <MessageSquare size={48} color="#e2e8f0" />
                                <Text style={styles.emptyText}>
                                    {activeTab === 'sos'
                                        ? 'No SOS emergencies recorded.'
                                        : "No incident reports. Use 'Report' on Home if you need help."}
                                </Text>
                            </View>
                        )}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#f8fafc' },
    flex: { flex: 1 },

    header: {
        backgroundColor: '#ffffff',
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    title: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
    subtitle: { fontSize: 13, color: '#64748b', marginTop: 2, marginBottom: 14 },

    tabRow: { flexDirection: 'row', gap: 8 },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: '#f1f5f9',
    },
    tabActive: { backgroundColor: '#0f172a' },
    tabActiveDanger: { backgroundColor: '#dc2626' },
    tabText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
    tabTextActive: { color: '#ffffff' },
    tabTextActiveDanger: { color: '#ffffff' },
    tabBadge: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
    tabBadgeNormal: { backgroundColor: '#e2e8f0' },
    tabBadgeDanger: { backgroundColor: '#ef4444' },
    tabBadgeText: { fontSize: 10, fontWeight: '800', color: '#ffffff' },

    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    list: { padding: 16, gap: 10 },

    // ── SOS card ──
    sosCard: {
        borderRadius: 18,
        backgroundColor: '#fff1f2',
        borderWidth: 2,
        borderColor: '#fca5a5',
        overflow: 'hidden',
        shadowColor: '#ef4444',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 3,
    },
    sosCardInner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
    },
    sosIconWrap: {
        width: 46,
        height: 46,
        borderRadius: 14,
        backgroundColor: '#dc2626',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        shadowColor: '#dc2626',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 3,
    },
    sosContent: { flex: 1 },
    sosTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    sosLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    sosLabel: { fontSize: 11, fontWeight: '800', color: '#dc2626', letterSpacing: 0.5 },
    liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#dc2626' },
    sosDate: { fontSize: 10, color: '#ef4444' },
    sosDesc: { fontSize: 13, color: '#7f1d1d', fontWeight: '500', marginBottom: 8 },
    statusPill: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
    },
    statusPillText: { fontSize: 10, fontWeight: '700' },

    // ── Normal card ──
    normalCard: {
        backgroundColor: '#ffffff',
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    normalTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    statusDotRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    statusDot: { width: 7, height: 7, borderRadius: 4 },
    statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
    dateText: { fontSize: 10, color: '#94a3b8' },
    normalBody: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    normalIconWrap: {
        width: 44,
        height: 44,
        backgroundColor: '#f8fafc',
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    normalContent: { flex: 1 },
    normalType: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
    normalMsg: { fontSize: 13, color: '#64748b' },

    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 32 },
    emptyText: { color: '#94a3b8', marginTop: 14, fontWeight: '500', textAlign: 'center', lineHeight: 20 },
});
