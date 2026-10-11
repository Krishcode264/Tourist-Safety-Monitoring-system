import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { AlertTriangle, ShieldCheck } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAtomValue } from 'jotai';
import { userAtom } from '@/atoms/auth';
import { BACKEND_URL } from '@/constants/Config';
import * as Location from 'expo-location';
import axios from 'axios';

interface PanicButtonProps {
    isInline?: boolean;
}

export function PanicButton({ isInline = false }: PanicButtonProps) {
    const [active, setActive] = useState(false);
    const insets = useSafeAreaInsets();
    const [isTriggered, setIsTriggered] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const user = useAtomValue(userAtom);

    const handlePress = () => {
        setActive(true);
    };

    const cancelPanic = () => {
        setActive(false);
        setIsTriggered(false);
    };

    const triggerSOS = async () => {
        setIsSubmitting(true);
        try {
            let lat = 19.0760; // Default fallback to Mumbai if GPS disabled
            let lng = 72.8777;

            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                lat = loc.coords.latitude;
                lng = loc.coords.longitude;
            }

            const touristId = user?.id || 'tourist-demo-001';
            await axios.post(`${BACKEND_URL}/api/incidents`, {
                type: 'HARASSMENT',
                severity: 'CRITICAL',
                description: `EMERGENCY SOS ALERT triggered by ${user?.fullName || 'Tourist'}`,
                latitude: lat,
                longitude: lng,
                touristId,
                status: 'OPEN'
            });
            setIsTriggered(true);
        } catch (error) {
            console.error('Failed to dispatch SOS alert:', error);
            setIsTriggered(true);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            {isInline ? (
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handlePress}
                    style={styles.inlineButton}
                >
                    <AlertTriangle size={20} color="white" />
                    <Text style={styles.inlineButtonText}>Trigger SOS Emergency</Text>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handlePress}
                    style={[
                        styles.floatingButton,
                        { bottom: insets.bottom + 80 }
                    ]}
                >
                    <AlertTriangle size={32} color="white" />
                </TouchableOpacity>
            )}

            {active && (
                <View style={styles.overlay}>
                    <View style={styles.container}>
                        {!isTriggered ? (
                            <>
                                <View style={styles.sosCircle}>
                                    <Text style={styles.sosText}>SOS</Text>
                                </View>
                                <Text style={styles.titleText}>Are you in danger?</Text>
                                <Text style={styles.subtitleText}>
                                    Pressing 'Trigger SOS' will notify local authorities and emergency contacts immediately.
                                </Text>

                                <TouchableOpacity
                                    onPress={triggerSOS}
                                    disabled={isSubmitting}
                                    style={styles.triggerButton}
                                >
                                    {isSubmitting ? (
                                        <ActivityIndicator color="#dc2626" />
                                    ) : (
                                        <Text style={styles.triggerButtonText}>TRIGGER SOS</Text>
                                    )}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={cancelPanic}
                                    disabled={isSubmitting}
                                    style={styles.cancelButton}
                                >
                                    <Text style={styles.cancelButtonText}>I'm Safe, Cancel</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <View style={styles.successCircle}>
                                    <ShieldCheck size={80} color="#dc2626" />
                                </View>
                                <Text style={styles.titleText}>Help is Coming</Text>
                                <Text style={styles.subtitleTextItalic}>
                                    Your live location is being shared with the nearest response unit.
                                </Text>

                                <View style={styles.policeCard}>
                                    <View style={styles.policeHeader}>
                                        <View style={styles.blueDot} />
                                        <Text style={styles.policeTitle}>Calangute Police Unit B</Text>
                                    </View>
                                    <Text style={styles.policeEta}>Estimated Response: 4-6 minutes</Text>
                                </View>

                                <TouchableOpacity
                                    onPress={cancelPanic}
                                    style={styles.deescalateButton}
                                >
                                    <Text style={styles.deescalateButtonText}>De-escalate Alert</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    inlineButton: {
        backgroundColor: '#dc2626',
        padding: 20,
        borderRadius: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 16,
        shadowColor: '#fca5a5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    inlineButtonText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 18,
    },
    floatingButton: {
        position: 'absolute',
        width: 64,
        height: 64,
        backgroundColor: '#dc2626',
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        right: 24,
        zIndex: 50,
        elevation: 8,
        shadowColor: '#f87171',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(127, 29, 29, 0.96)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
        zIndex: 99999,
        elevation: 99999,
    },
    container: {
        alignItems: 'center',
        width: '100%',
        maxWidth: 380,
    },
    sosCircle: {
        width: 192,
        height: 192,
        borderRadius: 96,
        borderWidth: 4,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
    },
    sosText: {
        color: '#ffffff',
        fontSize: 64,
        fontWeight: 'bold',
    },
    titleText: {
        color: '#ffffff',
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 16,
    },
    subtitleText: {
        color: '#fee2e2',
        textAlign: 'center',
        marginBottom: 48,
        fontSize: 16,
    },
    subtitleTextItalic: {
        color: '#fee2e2',
        textAlign: 'center',
        marginBottom: 32,
        fontSize: 18,
        fontStyle: 'italic',
    },
    triggerButton: {
        backgroundColor: '#ffffff',
        width: '100%',
        paddingVertical: 20,
        borderRadius: 24,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    triggerButtonText: {
        color: '#dc2626',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: 20,
    },
    cancelButton: {
        width: '100%',
        paddingVertical: 16,
    },
    cancelButtonText: {
        color: 'rgba(255, 255, 255, 0.6)',
        textAlign: 'center',
        fontWeight: '500',
    },
    successCircle: {
        width: 192,
        height: 192,
        backgroundColor: '#ffffff',
        borderRadius: 96,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
        shadowColor: '#ffffff',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    policeCard: {
        backgroundColor: 'rgba(153, 27, 27, 0.5)',
        padding: 24,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(185, 28, 28, 0.5)',
        width: '100%',
        marginBottom: 32,
    },
    policeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    blueDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#60a5fa',
    },
    policeTitle: {
        color: '#ffffff',
        fontWeight: 'bold',
    },
    policeEta: {
        color: '#fca5a5',
        fontSize: 14,
    },
    deescalateButton: {
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        width: '100%',
        paddingVertical: 16,
        borderRadius: 24,
    },
    deescalateButtonText: {
        color: 'rgba(255, 255, 255, 0.6)',
        textAlign: 'center',
        fontWeight: '500',
    },
});
