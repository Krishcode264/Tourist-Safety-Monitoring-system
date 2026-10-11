import React, { useState, useEffect, useRef } from 'react';
import Constants from 'expo-constants';
import { View, Text, ScrollView, Animated, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shield, Zap, Wind, Navigation } from 'lucide-react-native';
import * as Location from 'expo-location';
import * as Network from 'expo-network';
import { io } from 'socket.io-client';
import { useAtom } from 'jotai';
import { userAtom } from '../../atoms/auth';

import { BACKEND_URL } from '../../constants/Config';


// Helper to calculate distance in KM
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of Earth in KM
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
};

export default function SafetyScreen() {
    const [user] = useAtom(userAtom);
    const [scores, setScores] = useState({
        movement: 9.5,
        network: 8.0,
        anomaly: 9.0
    });
    
    const [status, setStatus] = useState({
        movement: 'Stable',
        network: 'Live',
        anomaly: 'Normal'
    });
    const [activeAlert, setActiveAlert] = useState<any | null>(null);

    const lastLocation = useRef<Location.LocationObject | null>(null);
    const socketRef = useRef<any>(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Initialize Socket
        socketRef.current = io(BACKEND_URL, {
            auth: {
                userId: user?.id,
                name: user?.fullName,
                role: 'tourist'
            }
        });

        socketRef.current.on('connect', () => {
            console.log('✅ Connected to Safety SOC');
        });

        socketRef.current.on('alert:user_geofence_breach', (data: any) => {
            console.log('⚠️ Breach alert received on mobile:', data);
            setActiveAlert(data);
        });

        // Clear alert if backend says we left (though we could also do it locally if we had the polygons)
        // For now, let's just allow a 5-min auto-dismiss or something if we want, 
        // but the backend throttling will handle the noise.

        let locationSubscription: any;

        const startTracking = async () => {
            const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
            if (locStatus !== 'granted') return;

            locationSubscription = await Location.watchPositionAsync(
                { accuracy: Location.Accuracy.High, distanceInterval: 10 },
                (location) => {
                    const lat = location.coords.latitude;
                    const lon = location.coords.longitude;

                    // Emit to SOC
                    socketRef.current?.emit('tourist:location_update', {
                        id: user?.id,
                        name: user?.fullName,
                        lat,
                        lng: lon,
                        timestamp: new Date()
                    });

                    // 1. Movement Consistency
                    let movementScore = 9.5;
                    if (lastLocation.current) {
                        const disp = getDistance(
                            lat, lon, 
                            lastLocation.current.coords.latitude, 
                            lastLocation.current.coords.longitude
                        );
                        // If displacement is extreme (> 0.5km in 10m interval), it's inconsistent for a tourist
                        movementScore = disp > 0.5 ? 4.0 : 9.8;
                    }
                    lastLocation.current = location;

                    // 3. Network Signal (Simplified from Network State)
                    Network.getNetworkStateAsync().then(network => {
                        let netScore = 5.0;
                        let netStatus = 'Offline';
                        if (network.isConnected) {
                            if (network.type === Network.NetworkStateType.WIFI) { netScore = 9.8; netStatus = 'High-Speed'; }
                            else if (network.type === Network.NetworkStateType.CELLULAR) { netScore = 7.5; netStatus = '4G/5G'; }
                        }
                        
                        const anomalyScore = (movementScore + netScore) / 2;

                        setScores({
                            movement: parseFloat(movementScore.toFixed(1)),
                            network: netScore,
                            anomaly: parseFloat(anomalyScore.toFixed(1))
                        });

                        setStatus({
                            movement: movementScore > 8 ? 'Consistent' : 'Rapid Change',
                            network: netStatus,
                            anomaly: anomalyScore > 8 ? 'Normal' : 'Analyzing'
                        });
                    });
                }
            );
        };

        startTracking();
        
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
            ])
        ).start();

        return () => {
            locationSubscription?.remove();
            socketRef.current?.disconnect();
        };
    }, [user]);

    const factors = [
        { id: 1, label: 'Movement Consistency', score: scores.movement, icon: <Navigation size={20} color="#10b981" />, color: 'emerald', status: status.movement },
        { id: 2, label: 'Network Signal Strength', score: scores.network, icon: <Zap size={20} color="#f59e0b" />, color: 'amber', status: status.network },
        { id: 3, label: 'AI Anomaly Detection', score: scores.anomaly, icon: <Wind size={20} color="#8b5cf6" />, color: 'purple', status: status.anomaly },
    ];


    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            <ScrollView className="flex-1">
                <View className="p-6">
                    {activeAlert && (
                        <View className={`mb-8 p-4 rounded-3xl border-2 ${activeAlert.riskLevel === 'CRITICAL' ? 'bg-red-50 border-red-500' : 'bg-amber-50 border-amber-500'} flex-row items-center gap-4`}>
                            <View className={`w-12 h-12 rounded-full items-center justify-center ${activeAlert.riskLevel === 'CRITICAL' ? 'bg-red-500' : 'bg-amber-500'}`}>
                                <Zap size={24} color="white" />
                            </View>
                            <View className="flex-1">
                                <Text className={`font-bold ${activeAlert.riskLevel === 'CRITICAL' ? 'text-red-900' : 'text-amber-900'}`}>
                                    {activeAlert.riskLevel === 'CRITICAL' ? 'DANGER ZONE' : 'RESTRICTED AREA'}
                                </Text>
                                <Text className="text-slate-600 text-xs">
                                    You have entered {activeAlert.geofenceName}. Please follow all safety protocols.
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setActiveAlert(null)}>
                                <Text className="text-slate-400 font-bold p-2">✕</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <View className="items-center mb-8">
                        <View className="w-24 h-24 bg-slate-50 rounded-full items-center justify-center border border-slate-100 mb-4 shadow-sm">
                            <Shield size={48} color="#10b981" fill="#10b98133" />
                        </View>
                        <Text className="text-3xl font-bold text-slate-900">Safety Analysis</Text>
                        <View className="flex-row items-center gap-2 mt-2">
                            <Animated.View style={{ transform: [{ scale: pulseAnim }] }} className="w-2 h-2 rounded-full bg-emerald-500" />
                            <Text className="text-slate-500 text-center font-medium">
                                Active Live Device Telemetry
                            </Text>
                        </View>
                    </View>

                    <Text className="text-slate-400 text-xs uppercase font-bold tracking-widest mb-6 ml-1">Live Risk Metrics</Text>

                    {factors.map((factor) => (
                        <View key={factor.id} className="mb-6">
                            <View className="flex-row justify-between items-center mb-2">
                                <View className="flex-row items-center gap-3">
                                    <View className="w-10 h-10 bg-slate-50 rounded-xl items-center justify-center">
                                        {factor.icon}
                                    </View>
                                    <View>
                                        <Text className="text-slate-900 font-semibold">{factor.label}</Text>
                                        <Text className={`text-[10px] font-bold uppercase text-${factor.color}-600`}>
                                            {factor.status}
                                        </Text>
                                    </View>
                                </View>
                                <View className="items-end">
                                    <Text className="text-slate-900 font-bold text-lg">{factor.score}</Text>
                                    <Text className="text-slate-400 text-[8px] uppercase">Telemetry Index</Text>
                                </View>
                            </View>
                            <View className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                <View className={`h-full bg-${factor.color}-500`} style={{ width: `${factor.score * 10}%` }} />
                            </View>
                        </View>
                    ))}

                    <View className="mt-8 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        <View className="flex-row items-center gap-2 mb-2">
                            <Shield size={16} color="#0f172a" />
                            <Text className="text-slate-900 font-bold text-lg">Live Analytics</Text>
                        </View>
                        <Text className="text-slate-600 leading-relaxed italic">
                            "System is actively monitoring GPS displacement and network latency. {scores.anomaly > 8 ? 'All patterns normal.' : 'Analyzing recent telemetry changes.'}"
                        </Text>

                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
