import { useRouter } from 'expo-router';
import { useAtom } from 'jotai';
import { useEffect } from 'react';
import { tokenAtom, userAtom } from '../atoms/auth';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
  const [token, setToken] = useAtom(tokenAtom);
  const [, setUser] = useAtom(userAtom);
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      try {
        const rawToken = await AsyncStorage.getItem('auth_token');
        const rawUser = await AsyncStorage.getItem('auth_user');

        if (rawToken) {
          const storedToken = JSON.parse(rawToken);
          if (storedToken) {
            setToken(storedToken);
            if (rawUser) {
              try {
                setUser(JSON.parse(rawUser));
              } catch (_) {}
            }
            router.replace('/(tabs)');
            return;
          }
        }

        if (token) {
          router.replace('/(tabs)');
        } else {
          router.replace('/onboarding');
        }
      } catch (e) {
        if (token) {
          router.replace('/(tabs)');
        } else {
          router.replace('/onboarding');
        }
      }
    }

    checkAuth();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
      <ActivityIndicator size="large" color="#10b981" />
    </View>
  );
}
