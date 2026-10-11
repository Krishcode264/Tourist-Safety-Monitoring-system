import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, Lock, ChevronLeft, Eye, EyeOff } from 'lucide-react-native';
import axios from 'axios';
import { useSetAtom } from 'jotai';
import { tokenAtom, userAtom } from '../../atoms/auth';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BACKEND_URL } from '../../constants/Config';


export default function LoginScreen() {
    const router = useRouter();
    const setToken = useSetAtom(tokenAtom);
    const setUser = useSetAtom(userAtom);
    
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [form, setForm] = useState({
        email: '',
        password: ''
    });

    const handleLogin = async () => {
        if (!form.email || !form.password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            console.log('Attempting login to:', `${BACKEND_URL}/api/auth/tourist/login`);
            const response = await axios.post(`${BACKEND_URL}/api/auth/tourist/login`, form);
            
            if (response.data.success) {
                const { token, user } = response.data.data;
                setToken(token);
                setUser(user);
                router.replace('/(tabs)');
            }
        } catch (error: any) {
            console.error('Login error details:', error);
            const message = error.response?.data?.message || error.message || 'Invalid credentials';
            Alert.alert('Login Failed', message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <ScrollView 
                    className="flex-1"
                    contentContainerStyle={{ flexGrow: 1 }}
                    showsVerticalScrollIndicator={false}
                >
                    <View className="p-8 pt-12">
                        <TouchableOpacity 
                            onPress={() => router.back()} 
                            className="w-12 h-12 bg-slate-50 rounded-full items-center justify-center mb-8 border border-slate-100"
                        >
                            <ChevronLeft size={24} color="#64748b" />
                        </TouchableOpacity>

                        <Text className="text-4xl font-black text-slate-900 mb-2">Welcome Back</Text>
                        <Text className="text-slate-500 text-lg mb-12 font-medium">Log in to your tourist safety account.</Text>

                        <View className="gap-6">
                            <InputItem
                                icon={<Mail size={20} color="#94a3b8" />}
                                label="Email Address"
                                placeholder="john@example.com"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={form.email}
                                onChangeText={(txt: string) => setForm({ ...form, email: txt })}
                            />
                            
                            <View className="gap-2">
                                <Text className="text-slate-600 font-semibold ml-1">Password</Text>
                                <View className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex-row items-center gap-4">
                                    <Lock size={20} color="#94a3b8" />
                                    <TextInput 
                                        className="flex-1 text-slate-900 text-lg" 
                                        placeholder="••••••••"
                                        placeholderTextColor="#94a3b8"
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
                                </View>
                            </View>
                        </View>

                        <TouchableOpacity
                            onPress={handleLogin}
                            disabled={loading}
                            className="bg-slate-900 py-5 rounded-3xl mt-12 shadow-xl shadow-slate-200 active:opacity-90"
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white text-center font-bold text-xl">Log In</Text>
                            )}
                        </TouchableOpacity>

                        <View className="flex-row justify-center mt-8">
                            <Text className="text-slate-500 text-lg">Don't have an account? </Text>
                            <TouchableOpacity onPress={() => router.push('/auth/signup')}>
                                <Text className="text-emerald-600 font-bold text-lg underline">Sign Up</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

function InputItem({ icon, label, ...props }: any) {
    return (
        <View className="gap-2">
            <Text className="text-slate-600 font-semibold ml-1">{label}</Text>
            <View className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex-row items-center gap-4">
                {icon}
                <TextInput 
                    className="flex-1 text-slate-900 text-lg" 
                    placeholderTextColor="#94a3b8"
                    {...props} 
                />
            </View>
        </View>
    );
}
