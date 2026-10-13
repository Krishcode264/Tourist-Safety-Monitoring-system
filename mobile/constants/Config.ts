import Constants from 'expo-constants';

const getHostFromExpo = (): string | null => {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
        return hostUri.split(':')[0];
    }
    const debuggerHost =
        (Constants as any).manifest?.debuggerHost ||
        (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
    if (debuggerHost) {
        return debuggerHost.split(':')[0];
    }
    return null;
};

const getBackendUrl = (): string => {
    const expoHostIp = getHostFromExpo();

    // Auto-detect dynamic Metro host IP in development if available
    if (__DEV__ && expoHostIp && !process.env.EXPO_PUBLIC_BACKEND_URL?.includes('render.com')) {
        return `http://${expoHostIp}:8000`;
    }

    return (
        process.env.EXPO_PUBLIC_BACKEND_URL ||
        process.env.BACKEND_URL ||
        Constants.expoConfig?.extra?.backendUrl ||
        'https://tourist-safety-monitoring-system.onrender.com'
    );
};

export const BACKEND_URL: string = getBackendUrl();
