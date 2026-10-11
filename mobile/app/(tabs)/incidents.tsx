import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageSquare, AlertCircle, Clock, ChevronRight } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import axios from 'axios';
import { useAtom } from 'jotai';
import { userAtom } from '../../atoms/auth';
import { BACKEND_URL } from '../../constants/Config';


export default function IncidentsScreen() {
    const router = useRouter();
    const [user] = useAtom(userAtom);
    const [incidents, setIncidents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            const fetchIncidents = async () => {
                if (!user?.id) return;
                try {
                    setLoading(true);
                    const res = await axios.get(`${BACKEND_URL}/api/incidents/tourist/${user.id}`);
                    if (res.data.success) {
                        setIncidents(res.data.data);
                    }
                } catch (error) {
                    console.error('Failed to fetch tourist incidents', error);
                } finally {
                    setLoading(false);
                }
            };
            fetchIncidents();
        }, [user])
    );

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            <View className="flex-1">
                <View className="p-6 border-b border-slate-50">
                    <Text className="text-2xl font-bold text-slate-900">Incident Chats</Text>
                    <Text className="text-slate-500 mt-1">History of your safety reports and coordination.</Text>
                </View>

                {loading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="#10b981" />
                    </View>
                ) : (
                    <FlatList
                        data={incidents}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ padding: 20 }}
                        renderItem={({ item }) => {
                            const lastMessage = item.messages?.[0]?.content || "Waiting for admin response...";
                            const dateStr = new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                            return (
                                <TouchableOpacity
                                    onPress={() => router.push({ pathname: '/incident-report', params: { id: item.id } })}
                                    className="bg-slate-50 p-5 rounded-3xl mb-4 border border-slate-100"
                                >
                                    <View className="flex-row justify-between items-start mb-3">
                                        <View className="flex-row items-center gap-2">
                                            <View className={`w-2 h-2 rounded-full ${item.status === 'CLOSED' ? 'bg-slate-400' : 'bg-emerald-500'}`} />
                                            <Text className={`text-[10px] font-bold uppercase tracking-wider ${item.status === 'CLOSED' ? 'text-slate-500' : 'text-emerald-700'}`}>
                                                {item.status}
                                            </Text>
                                        </View>
                                        <Text className="text-slate-400 text-[10px]">{dateStr}</Text>
                                    </View>

                                    <View className="flex-row items-center gap-4">
                                        <View className="w-12 h-12 bg-white rounded-2xl items-center justify-center border border-slate-100 shadow-sm">
                                            <AlertCircle size={24} color={item.status === 'CLOSED' ? '#64748b' : '#10b981'} />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-slate-900 font-bold text-lg mb-0.5">{item.type}</Text>
                                            <Text className="text-slate-500 text-sm" numberOfLines={1}>{lastMessage}</Text>
                                        </View>
                                        <ChevronRight size={18} color="#cbd5e1" />
                                    </View>
                                </TouchableOpacity>
                            );
                        }}

                        ListEmptyComponent={() => (
                            <View className="flex-1 items-center justify-center pt-20">
                                <MessageSquare size={48} color="#e2e8f0" />
                                <Text className="text-slate-400 mt-4 font-medium text-center px-12">
                                    No incident reports found. Use the 'Report' button on Home if you need assistance.
                                </Text>
                            </View>
                        )}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}
