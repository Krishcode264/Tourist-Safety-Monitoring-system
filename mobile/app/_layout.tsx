import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import "../global.css";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as JotaiProvider } from 'jotai';

import { useColorScheme } from '@/components/useColorScheme';
import { PanicButton } from '@/components/shared/PanicButton';
import { useGeofenceWatcher } from '@/hooks/useGeofenceWatcher';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);


  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded || !isReady) {
    return null;
  }


  return <RootLayoutNav />;
}


/** Mounts geofence watcher globally so it runs across all tabs */
function GeofenceWatcherMount() {
  useGeofenceWatcher();
  return null;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <JotaiProvider>
      <SafeAreaProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <GeofenceWatcherMount />
          <Stack
            screenOptions={{
              headerStyle: {
                backgroundColor: colorScheme === 'dark' ? '#0f172a' : '#ffffff',
              },
              headerTintColor: colorScheme === 'dark' ? '#f8fafc' : '#0f172a',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="auth/phone" options={{ title: 'Login', headerBackTitle: 'Back' }} />
            <Stack.Screen name="auth/otp" options={{ title: 'Verify', headerBackTitle: 'Back' }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Terms & Safety' }} />
            <Stack.Screen name="incident-report" options={{ headerShown: false, presentation: 'card' }} />
          </Stack>
        </ThemeProvider>
      </SafeAreaProvider>
    </JotaiProvider>
  );
}

