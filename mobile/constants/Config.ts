import Constants from 'expo-constants';

export const BACKEND_URL: string =
    process.env.EXPO_PUBLIC_BACKEND_URL ||
    process.env.BACKEND_URL ||
    Constants.expoConfig?.extra?.backendUrl ||
    'https://tourist-safety-monitoring-system.onrender.com';
