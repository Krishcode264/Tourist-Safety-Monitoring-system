import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin } from 'lucide-react-native';
import MapView, { Marker, Polygon, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import axios from 'axios';
import { BACKEND_URL } from '../../constants/Config';

export default function MapScreen() {
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [geofences, setGeofences] = useState<any[]>([]);

    useEffect(() => {
        let isMounted = true;

        (async () => {
            try {
                // 1. Request location permissions safely
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                    if (isMounted) setLocation(loc);
                } else {
                    if (isMounted) setErrorMsg('Permission to access location was denied');
                }
            } catch (err) {
                console.warn('Location request error:', err);
            }

            // 2. Fetch Geofences safely
            try {
                const response = await axios.get(`${BACKEND_URL}/api/geofences`);
                if (response.data?.success && Array.isArray(response.data.data)) {
                    if (isMounted) setGeofences(response.data.data);
                }
            } catch (err) {
                console.warn('Error fetching geofences:', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        })();

        return () => {
            isMounted = false;
        };
    }, []);

    const initialRegion = location ? {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
    } : {
        latitude: 15.5494, // Default to Goa
        longitude: 73.7535,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
            <View className="flex-1 relative">
                {loading ? (
                    <View className="flex-1 items-center justify-center bg-slate-100">
                        <ActivityIndicator size="large" color="#10b981" />
                        <Text className="text-slate-500 mt-4 font-medium">Loading Safety Map...</Text>
                    </View>
                ) : (
                    <MapView
                        style={StyleSheet.absoluteFillObject}
                        provider={PROVIDER_DEFAULT}
                        initialRegion={initialRegion}
                        showsUserLocation={!!location}
                        showsMyLocationButton={true}
                    >
                        {location && (
                            <Marker
                                coordinate={{
                                    latitude: location.coords.latitude,
                                    longitude: location.coords.longitude,
                                }}
                                title="Your Location"
                                description="You are currently in a monitored zone"
                                tracksViewChanges={false}
                            >
                                <View className="bg-emerald-500 p-2 rounded-full border-2 border-white shadow-lg">
                                    <MapPin size={24} color="white" fill="white" />
                                </View>
                            </Marker>
                        )}

                        {geofences.map((gf) => {
                            if (!gf || !Array.isArray(gf.coordinates) || gf.coordinates.length === 0) {
                                return null;
                            }

                            const polygonCoords = gf.coordinates.map((c: any) => ({
                                latitude: typeof c.lat === 'number' ? c.lat : Number(c.lat || 0),
                                longitude: typeof c.lng === 'number' ? c.lng : Number(c.lng || 0)
                            }));

                            const firstCoord = polygonCoords[0];

                            return (
                                <React.Fragment key={gf.id || Math.random().toString()}>
                                    <Polygon
                                        coordinates={polygonCoords}
                                        fillColor={
                                            gf.type === 'DANGER' ? 'rgba(239, 68, 68, 0.3)' :
                                            gf.type === 'RESTRICTED' ? 'rgba(245, 158, 11, 0.3)' :
                                            'rgba(16, 185, 129, 0.3)'
                                        }
                                        strokeColor={
                                            gf.type === 'DANGER' ? 'rgb(239, 68, 68)' :
                                            gf.type === 'RESTRICTED' ? 'rgb(245, 158, 11)' :
                                            'rgb(16, 185, 129)'
                                        }
                                        strokeWidth={2}
                                    />
                                    {firstCoord && (
                                        <Marker
                                            coordinate={firstCoord}
                                            title={gf.name}
                                            description={`${gf.type} ZONE`}
                                            tracksViewChanges={false}
                                        >
                                            <View className="bg-white/90 px-2 py-1 rounded-md border border-slate-200">
                                                <Text className="text-[10px] font-bold text-slate-800">{gf.name}</Text>
                                            </View>
                                        </Marker>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </MapView>
                )}
            </View>
        </SafeAreaView>
    );
}
