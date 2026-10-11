import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Shield, Clock, MapPin, CheckCircle2, ChevronRight, ChevronLeft, User, Mail, Lock, Phone, Globe, Eye, EyeOff } from 'lucide-react-native';
import { useSetAtom } from 'jotai';
import { tokenAtom, userAtom } from '../atoms/auth';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BACKEND_URL } from '../constants/Config';


export default function OnboardingScreen() {
    let router: any = null;
    try {
        router = useRouter();
    } catch (e) {
        // Fallback for when context is not ready
        console.warn('Navigation context not ready in OnboardingScreen');
    }
    
    const setToken = useSetAtom(tokenAtom);

    const setUser = useSetAtom(userAtom);
    
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    
    // Combined form state
    const [form, setForm] = useState({
        email: '',
        password: '',
        fullName: '',
        phoneNumber: '',
        nationality: '',
        tripDuration: '',
        citiesExploring: ''
    });

    const handleNext = async () => {
        if (validateStep()) {
            if (step < 3) {
                setStep(step + 1);
            } else {
                await handleRegister();
            }
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
        } else {
            router.push('/auth/signup');
        }
    };

    const validateStep = () => {
        if (step === 1) {
            if (!form.email || !form.password) {
                Alert.alert('Required', 'Please fill in your account details.');
                return false;
            }
        } else if (step === 2) {
            if (!form.fullName || !form.phoneNumber || !form.nationality) {
                Alert.alert('Required', 'Please fill in your profile details.');
                return false;
            }
        } else if (step === 3) {
            if (!form.tripDuration || !form.citiesExploring) {
                Alert.alert('Required', 'Please fill in your trip details.');
                return false;
            }
        }
        return true;
    };

    const handleRegister = async () => {
        setLoading(true);
        try {
            console.log('Registering with data:', form);
            const response = await axios.post(
                `${BACKEND_URL}/api/auth/tourist/signup`,
                form
            );

            if (response.data.success) {
                const { token, tourist } = response.data.data;
                setToken(token);
                setUser(tourist);
                setStep(4); // Success step
            }
        } catch (error: any) {
            console.error('Registration failed:', error);
            const msg = error.response?.data?.message || 'Failed to create account. Please try again.';
            Alert.alert('Registration Error', msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-white"
        >
            <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
                <ScrollView 
                    className="flex-1"
                    contentContainerStyle={{ padding: 24 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Progress Indicator */}
                    {step < 4 && (
                        <View className="flex-row items-center justify-between mb-12 px-2">
                            {[1, 2, 3].map((s) => (
                                <View key={s} className="flex-row items-center flex-1">
                                    <View 
                                        className={`w-10 h-10 rounded-full items-center justify-center border-2`}
                                        style={{
                                            backgroundColor: step >= s ? '#059669' : '#ffffff',
                                            borderColor: step >= s ? '#059669' : '#e2e8f0',
                                            shadowColor: step >= s ? '#059669' : 'transparent',
                                            shadowOpacity: step >= s ? 0.3 : 0,
                                            shadowRadius: 4,
                                            elevation: step >= s ? 4 : 0
                                        }}
                                    >
                                        {step > s ? (
                                            <CheckCircle2 size={24} color="white" />
                                        ) : (
                                            <Text 
                                                className="font-bold"
                                                style={{ color: step >= s ? '#ffffff' : '#94a3b8' }}
                                            >
                                                {s}
                                            </Text>
                                        )}
                                    </View>

                                    {s < 3 && <View className={`flex-1 h-1 mx-2 rounded-full ${step > s ? 'bg-emerald-600' : 'bg-slate-100'}`} />}
                                </View>
                            ))}
                        </View>
                    )}

                    {step === 1 && (
                        <StepWrapper
                            icon={<Shield size={48} color="#10b981" />}
                            title="Account Setup"
                            desc="Create your credentials to secure your safety dashboard."
                        >
                            <InputGroup label="Email Address">
                                <Mail size={20} color="#94a3b8" className="mr-3" />
                                <TextInput
                                    placeholder="john@example.com"
                                    className="flex-1 text-lg text-slate-900"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    value={form.email}
                                    onChangeText={(txt: string) => setForm({ ...form, email: txt })}
                                />
                            </InputGroup>

                            <InputGroup label="Password">
                                <Lock size={20} color="#94a3b8" className="mr-3" />
                                <TextInput
                                    placeholder="••••••••"
                                    className="flex-1 text-lg text-slate-900"
                                    secureTextEntry={!showPassword}
                                    value={form.password}
                                    onChangeText={(txt: string) => setForm({ ...form, password: txt })}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                    {showPassword ? (
                                        <EyeOff size={20} color="#94a3b8" />
                                    ) : (
                                        <Eye size={20} color="#94a3b8" />
                                    )}
                                </TouchableOpacity>
                            </InputGroup>
                        </StepWrapper>
                    )}

                    {step === 2 && (
                        <StepWrapper
                            icon={<User size={48} color="#10b981" />}
                            title="Profile Details"
                            desc="Tell us a bit more about yourself."
                        >
                            <InputGroup label="Full Name">
                                <User size={20} color="#94a3b8" className="mr-3" />
                                <TextInput
                                    placeholder="John Doe"
                                    className="flex-1 text-lg text-slate-900"
                                    value={form.fullName}
                                    onChangeText={(txt: string) => setForm({ ...form, fullName: txt })}
                                />
                            </InputGroup>

                            <InputGroup label="Phone Number">
                                <Phone size={20} color="#94a3b8" className="mr-3" />
                                <TextInput
                                    placeholder="+91 9876543210"
                                    className="flex-1 text-lg text-slate-900"
                                    keyboardType="phone-pad"
                                    value={form.phoneNumber}
                                    onChangeText={(txt: string) => setForm({ ...form, phoneNumber: txt })}
                                />
                            </InputGroup>

                            <InputGroup label="Nationality">
                                <Globe size={20} color="#94a3b8" className="mr-3" />
                                <TextInput
                                    placeholder="Country name"
                                    className="flex-1 text-lg text-slate-900"
                                    value={form.nationality}
                                    onChangeText={(txt: string) => setForm({ ...form, nationality: txt })}
                                />
                            </InputGroup>
                        </StepWrapper>
                    )}

                    {step === 3 && (
                        <StepWrapper
                            icon={<MapPin size={48} color="#10b981" />}
                            title="Trip Metadata"
                            desc="Help us monitor your safety during your stay."
                        >
                            <InputGroup label="Trip Duration (Days)">
                                <Clock size={20} color="#94a3b8" className="mr-3" />
                                <TextInput
                                    placeholder="e.g. 15"
                                    className="flex-1 text-lg text-slate-900"
                                    keyboardType="numeric"
                                    value={form.tripDuration}
                                    onChangeText={(txt: string) => setForm({ ...form, tripDuration: txt })}
                                />
                            </InputGroup>

                            <InputGroup label="Cities Exploring">
                                <Globe size={20} color="#94a3b8" className="mr-3" />
                                <TextInput
                                    placeholder="e.g. Mumbai, Goa, Delhi"
                                    className="flex-1 text-lg text-slate-900"
                                    multiline
                                    numberOfLines={2}
                                    value={form.citiesExploring}
                                    onChangeText={(txt: string) => setForm({ ...form, citiesExploring: txt })}
                                />
                            </InputGroup>
                        </StepWrapper>
                    )}

                    {step === 4 && (
                        <View className="items-center">
                            <CheckCircle2 size={100} color="#10b981" />
                            <Text className="text-3xl font-bold text-slate-900 text-center mt-8">Welcome to TourSafe!</Text>
                            <Text className="text-slate-500 text-center mt-4 text-lg px-6 leading-relaxed">
                                Your registration is complete. Our team is ready to assist you throughout your journey.
                            </Text>
                            
                            <TouchableOpacity
                                onPress={() => router.replace('/(tabs)')}
                                className="bg-slate-900 w-full py-5 rounded-3xl mt-16 flex-row items-center justify-center gap-2 shadow-xl shadow-slate-200"
                            >
                                <Text className="text-white font-bold text-xl">Enter Dashboard</Text>
                                <ChevronRight size={24} color="white" />
                            </TouchableOpacity>
                        </View>
                    )}

                    {step < 4 && (
                        <View className="flex-row gap-4 mt-12">
                            <TouchableOpacity
                                onPress={handleBack}
                                className="flex-1 bg-slate-50 py-5 rounded-3xl flex-row items-center justify-center gap-2 border border-slate-100"
                            >
                                <ChevronLeft size={24} color="#64748b" />
                                <Text className="text-slate-600 font-bold text-xl">Back</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleNext}
                                disabled={loading}
                                className="flex-[2] bg-emerald-600 py-5 rounded-3xl flex-row items-center justify-center gap-2 shadow-lg shadow-emerald-100"
                            >
                                {loading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <>
                                        <Text className="text-white font-bold text-xl">{step === 3 ? 'Register' : 'Next'}</Text>
                                        <ChevronRight size={24} color="white" />
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>
        </KeyboardAvoidingView>
    );
}

function InputGroup({ label, children }: { label: string, children: React.ReactNode }) {
    return (
        <View className="mt-6">
            <Text className="text-sm font-semibold text-slate-500 mb-2 ml-1">{label}</Text>
            <View className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex-row items-center">
                {children}
            </View>
        </View>
    );
}

function StepWrapper({ icon, title, desc, children }: any) {
    return (
        <View>
            <View className="items-center mb-4">
                <View className="w-20 h-20 bg-emerald-50 rounded-full items-center justify-center">
                    {icon}
                </View>
                <Text className="text-2xl font-bold text-slate-900 mt-4 text-center">{title}</Text>
                <Text className="text-slate-500 text-center mt-2 text-base px-4">{desc}</Text>
            </View>
            {children}
        </View>
    );
}
