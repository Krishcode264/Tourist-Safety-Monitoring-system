import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

import { View, Text, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send, Camera, Image as ImageIcon, AlertCircle, X, CheckCircle, ChevronLeft, ShieldAlert } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import axios from 'axios';
import { useAtom } from 'jotai';
import { userAtom } from '../atoms/auth';
import { BACKEND_URL } from '../constants/Config';


const INCIDENT_TYPES = [
    { label: 'Theft / Crime', value: 'THEFT', icon: 'shield-off' },
    { label: 'Medical Emergency', value: 'MEDICAL', icon: 'heart-pulse' },
    { label: 'Accident', value: 'ACCIDENT', icon: 'car' },
    { label: 'Harassment', value: 'HARASSMENT', icon: 'user-x' },
    { label: 'Lost & Found', value: 'LOST_FOUND', icon: 'search' },
    { label: 'Other', value: 'OTHER', icon: 'help-circle' }
];

const SEVERITIES = [
    { label: 'Low', value: 'INFO', color: '#10b981' },
    { label: 'Medium', value: 'WARNING', color: '#f59e0b' },
    { label: 'Critical', value: 'CRITICAL', color: '#ef4444' }
];

export default function IncidentReportScreen() {
    const { id } = useLocalSearchParams();
    const [user] = useAtom(userAtom);
    const [step, setStep] = useState<'form' | 'chat'>(id ? 'chat' : 'form');
    const [description, setDescription] = useState('');
    const [type, setType] = useState('OTHER');
    const [severity, setSeverity] = useState('INFO');
    const [isLoading, setIsLoading] = useState(false);
    const [caseId, setCaseId] = useState(id || '');
    
    const [media, setMedia] = useState<string[]>([]);
    const [message, setMessage] = useState('');
    const [chat, setChat] = useState<{ id: string, role: 'user'|'system'|'admin', text: string, time: string }[]>([
        { id: '1', role: 'system', text: 'You are connected to Tourism Safety Support.', time: 'Now' },
    ]);

    const [isOfficerTyping, setIsOfficerTyping] = useState(false);
    const typingTimeoutRef = useRef<any>(null);
    const remoteTypingTimeoutRef = useRef<any>(null);
    const socketRef = useRef<Socket | null>(null);
    const router = useRouter();

    useEffect(() => {
        if (step === 'chat' && caseId) {
            // Fetch history
            axios.get(`${BACKEND_URL}/api/incidents/${caseId}/messages`)
                .then(res => {
                    if (res.data.success && res.data.data.length > 0) {
                        const history = res.data.data.map((msg: any) => ({
                            id: msg.id,
                            role: msg.senderRole === 'TOURIST' ? 'user' : msg.senderRole === 'SYSTEM' ? 'system' : 'admin',
                            text: msg.content,
                            time: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        }));
                        setChat(history);
                    }
                })
                .catch(err => console.error('Failed to load chat history:', err));

            // Connect to Socket
            socketRef.current = io(BACKEND_URL, {
                auth: { userId: user?.id, role: 'tourist' }
            });

            socketRef.current.on('connect', () => {
                socketRef.current?.emit('chat:join', caseId);
            });

            socketRef.current.on('chat:typing', (data: { incidentId: string; isTyping: boolean; senderRole: string }) => {
                if (data?.senderRole !== 'TOURIST') {
                    setIsOfficerTyping(!!data?.isTyping);
                    if (remoteTypingTimeoutRef.current) clearTimeout(remoteTypingTimeoutRef.current);
                    if (data?.isTyping) {
                        remoteTypingTimeoutRef.current = setTimeout(() => {
                            setIsOfficerTyping(false);
                        }, 3500);
                    }
                }
            });

            socketRef.current.on('chat:receive', (msg) => {
                setIsOfficerTyping(false);
                setChat(prev => {
                    return [...prev, {
                        id: msg.id,
                        role: msg.senderRole === 'TOURIST' ? 'user' : msg.senderRole === 'SYSTEM' ? 'system' : 'admin',
                        text: msg.content,
                        time: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }];
                });
            });

            return () => {
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                if (remoteTypingTimeoutRef.current) clearTimeout(remoteTypingTimeoutRef.current);
                socketRef.current?.disconnect();
            };
        }
    }, [step, caseId]);

    const handleReport = async () => {
        if (!description) return;
        setIsLoading(true);

        try {
            // 1. Get current location
            const { status } = await Location.requestForegroundPermissionsAsync();
            let locationData = { latitude: 15.4989, longitude: 73.8278 }; // Default to Panjim

            if (status === 'granted') {
                const loc = await Location.getCurrentPositionAsync({});
                locationData = {
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude
                };
            }

            // 2. Submit to Backend
            const response = await axios.post(`${BACKEND_URL}/api/incidents`, {
                type,
                severity,
                description,
                latitude: locationData.latitude,
                longitude: locationData.longitude,
                touristId: user?.id,
                status: 'OPEN'
            });

            if (response.data.success) {
                const newId = response.data.data.id;
                setCaseId(newId);
                setStep('chat');
                setChat([...chat, { id: Date.now().toString(), role: 'system', text: `Incident #${newId.slice(0, 8)} reported. Monitoring active.`, time: 'Now' }]);
            }

        } catch (error) {
            console.error('Report failed:', error);
            alert('Failed to file report. Please check connection.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleTextChange = (text: string) => {
        setMessage(text);
        if (!caseId || !socketRef.current) return;

        socketRef.current.emit('chat:typing', {
            incidentId: caseId,
            isTyping: text.trim().length > 0,
            senderRole: 'TOURIST',
            senderName: user?.fullName || 'Tourist'
        });

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        if (text.trim().length > 0) {
            typingTimeoutRef.current = setTimeout(() => {
                socketRef.current?.emit('chat:typing', {
                    incidentId: caseId,
                    isTyping: false,
                    senderRole: 'TOURIST'
                });
            }, 2500);
        }
    };

    const sendMessage = () => {
        if (!message.trim()) return;

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        socketRef.current?.emit('chat:typing', {
            incidentId: caseId,
            isTyping: false,
            senderRole: 'TOURIST'
        });

        socketRef.current?.emit('chat:send', {
            incidentId: caseId,
            content: message.trim(),
            senderRole: 'TOURIST',
            senderId: user?.id
        });

        setMessage('');
    };

    if (step === 'form') {
        return (
            <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
                <ScrollView className="flex-1 p-6">
                    <View className="flex-row items-center mb-6">
                        <TouchableOpacity onPress={() => router.back()} className="mr-4">
                            <ChevronLeft size={24} color="#64748b" />
                        </TouchableOpacity>
                        <Text className="text-xl font-bold text-slate-900">New Safety Report</Text>
                    </View>

                    <View className="items-center mb-8">
                        <View className="w-16 h-16 bg-amber-100 rounded-full items-center justify-center mb-4">
                            <AlertCircle size={32} color="#f59e0b" />
                        </View>
                        <Text className="text-slate-500 text-center mt-1">Provide details for authorities to assist you.</Text>
                    </View>

                    <View className="mb-6">
                        <Text className="text-slate-700 font-bold mb-3">Incident Type</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                            {INCIDENT_TYPES.map((t) => (
                                <TouchableOpacity 
                                    key={t.value} 
                                    onPress={() => setType(t.value)}
                                    className={`mr-3 px-5 py-3 rounded-2xl border ${type === t.value ? 'bg-slate-900 border-slate-900' : 'bg-slate-50 border-slate-100'}`}
                                >
                                    <Text className={`font-bold text-xs ${type === t.value ? 'text-white' : 'text-slate-500'}`}>{t.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    <View className="mb-6">
                        <Text className="text-slate-700 font-bold mb-3">Severity Level</Text>
                        <View className="flex-row gap-3">
                            {SEVERITIES.map((s) => (
                                <TouchableOpacity 
                                    key={s.value} 
                                    onPress={() => setSeverity(s.value)}
                                    className="flex-1 p-4 rounded-2xl border items-center shadow-sm"
                                    style={{ 
                                        backgroundColor: severity === s.value ? s.color : '#f8fafc',
                                        borderColor: severity === s.value ? s.color : '#f1f5f9'
                                    }}
                                >
                                    <Text className={`font-bold text-sm ${severity === s.value ? 'text-white' : 'text-slate-400'}`}>{s.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View className="mb-6">
                        <Text className="text-slate-700 font-bold mb-2">Description</Text>
                        <TextInput
                            className="bg-slate-50 border border-slate-100 rounded-2xl p-4 min-h-[120px] text-slate-800"
                            placeholder="What is happening? Describe the situation..."
                            multiline
                            textAlignVertical="top"
                            value={description}
                            onChangeText={setDescription}
                        />
                    </View>

                    <TouchableOpacity
                        onPress={handleReport}
                        className={`py-5 rounded-3xl ${description && !isLoading ? 'bg-slate-900' : 'bg-slate-200'} mb-10 flex-row justify-center items-center`}
                        disabled={!description || isLoading}
                    >
                        {isLoading ? <ActivityIndicator color="white" className="mr-2" /> : null}
                        <Text className={`text-center font-bold text-lg ${description ? 'text-white' : 'text-slate-400'}`}>
                            {isLoading ? 'Reporting...' : 'File Incident Report'}
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                className="flex-1 bg-white"
            >
                <View className="bg-slate-50 p-4 pt-2 border-b border-slate-100 flex-row items-center gap-3">
                    <TouchableOpacity onPress={() => router.back()} className="mr-1">
                        <ChevronLeft size={24} color="#64748b" />
                    </TouchableOpacity>
                    <View className="w-10 h-10 bg-emerald-100 rounded-full items-center justify-center">
                        <ShieldAlert size={20} color="#10b981" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-slate-900 font-bold">Case: #{caseId.slice(0, 8)}</Text>
                        <Text className="text-emerald-600 text-[10px] font-bold tracking-tighter">DISPATCH IN PROGRESS</Text>
                    </View>
                    <TouchableOpacity onPress={() => setStep('form')} className="bg-white border border-slate-100 px-3 py-1.5 rounded-full">
                        <Text className="text-slate-600 text-[10px] font-bold">VIEW REPORT</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    className="flex-1 p-4"
                    contentContainerStyle={{ paddingBottom: 20 }}
                    showsVerticalScrollIndicator={false}
                >
                    {chat.map((item) => (
                        <View
                            key={item.id}
                            className={`mb-4 max-w-[85%] ${item.role === 'user' ? 'self-end bg-emerald-500 rounded-2xl rounded-tr-none shadow-sm' : item.role === 'system' ? 'self-center bg-slate-100 px-4 py-2 rounded-full mt-2' : 'self-start bg-slate-50 rounded-2xl rounded-tl-none border border-slate-100'}`}
                        >
                            <View className="p-3">
                                <Text className={`${item.role === 'user' ? 'text-white font-medium' : item.role === 'system' ? 'text-slate-500 text-xs text-center' : 'text-slate-800'}`}>
                                    {item.text}
                                </Text>
                                {item.role !== 'system' && (
                                    <Text className={`text-[10px] mt-1 ${item.role === 'user' ? 'text-emerald-100 text-right opacity-80' : 'text-slate-400'}`}>
                                        {item.time}
                                    </Text>
                                )}
                            </View>
                        </View>
                    ))}
                </ScrollView>

                {isOfficerTyping && (
                    <View className="px-4 py-2 flex-row items-center gap-2 bg-slate-50 border-t border-slate-100">
                        <View className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <Text className="text-xs text-slate-500 italic">Dispatch officer is typing...</Text>
                    </View>
                )}

                <View className="p-4 border-t border-slate-100 flex-row items-center gap-3 bg-white">
                    <TouchableOpacity className="p-2 bg-slate-50 rounded-full border border-slate-100">
                        <ImageIcon size={20} color="#64748b" />
                    </TouchableOpacity>
                    <View className="flex-1 bg-slate-50 rounded-3xl flex-row items-center px-4 py-1 border border-slate-100">
                        <TextInput
                            placeholder="Type a message..."
                            className="flex-1 py-2 text-slate-800 max-h-24"
                            value={message}
                            onChangeText={handleTextChange}
                            multiline
                        />
                        <TouchableOpacity onPress={sendMessage}>
                            <Send size={20} color={message ? "#10b981" : "#cbd5e1"} />
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
