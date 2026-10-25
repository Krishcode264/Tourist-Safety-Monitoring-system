import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shield, MapPin, Clock, AlertTriangle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { PanicButton } from '@/components/shared/PanicButton';
import { useAtom } from 'jotai';
import { userAtom, tokenAtom } from '@/atoms/auth';
import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { BACKEND_URL } from '@/constants/Config';


export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useAtom(userAtom);
  const [token] = useAtom(tokenAtom);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [syncDisplay, setSyncDisplay] = useState('Just now');
  const [refreshing, setRefreshing] = useState(false);

  // Calculate dynamic Trip Expiry from DB data (user.createdAt + user.tripDuration in days)
  const getTripExpiry = () => {
    if (!user) return 'Not Set';
    if (!user.tripDuration) return 'Not Set';

    try {
      const baseDate = user.createdAt ? new Date(user.createdAt) : new Date();
      const expiry = new Date(baseDate);
      expiry.setDate(expiry.getDate() + Number(user.tripDuration));

      return expiry.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return `${user.tripDuration} Days`;
    }
  };

  // Sync / refresh profile from DB
  const refreshProfile = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${BACKEND_URL}/api/tourists/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.success && res.data?.data) {
        setUser(res.data.data);
      }
      setLastSyncTime(new Date());
    } catch (e) {
      setLastSyncTime(new Date());
    }
  }, [token, setUser]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  // Update relative sync label periodically
  useEffect(() => {
    const updateRelativeSync = () => {
      const seconds = Math.floor((Date.now() - lastSyncTime.getTime()) / 1000);
      if (seconds < 60) {
        setSyncDisplay('Just now');
      } else if (seconds < 3600) {
        const mins = Math.floor(seconds / 60);
        setSyncDisplay(`${mins} min${mins > 1 ? 's' : ''} ago`);
      } else {
        const hours = Math.floor(seconds / 3600);
        setSyncDisplay(`${hours} hr${hours > 1 ? 's' : ''} ago`);
      }
    };

    updateRelativeSync();
    const interval = setInterval(updateRelativeSync, 30_000);
    return () => clearInterval(interval);
  }, [lastSyncTime]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshProfile();
    setRefreshing(false);
  }, [refreshProfile]);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="p-6">
          {/* Safety Score Card */}
          <TouchableOpacity
            onPress={() => router.push('/safety')}
            activeOpacity={0.8}
            className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-6"
          >
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-slate-500 font-medium">Safety Score</Text>
              <Shield size={20} color="#10b981" />
            </View>
            <View className="flex-row items-end gap-2">
              <Text className="text-5xl font-bold text-slate-900">8.4</Text>
              <Text className="text-slate-400 mb-2">/ 10</Text>
            </View>
            <Text className="text-emerald-600 font-semibold mt-2">Optimal Safety Status</Text>
          </TouchableOpacity>

          {/* Current Zone Risk */}
          <TouchableOpacity
            onPress={() => router.push('/map')}
            activeOpacity={0.8}
            className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 mb-6 flex-row items-center gap-4"
          >
            <View className="w-12 h-12 bg-amber-100 rounded-2xl items-center justify-center">
              <AlertTriangle size={24} color="#f59e0b" />
            </View>
            <View className="flex-1">
              <Text className="text-slate-400 text-xs uppercase font-bold tracking-tight">Current Zone Risk</Text>
              <Text className="text-slate-900 font-bold text-lg">Moderate - Calangute</Text>
            </View>
          </TouchableOpacity>

          {/* Trip Meta */}
          <View className="flex-row gap-4 mb-8">
            <View className="flex-1 bg-white p-4 rounded-2xl border border-slate-100">
              <View className="flex-row items-center gap-2 mb-1">
                <Clock size={14} color="#64748b" />
                <Text className="text-slate-500 text-xs">Trip Expiry</Text>
              </View>
              <Text className="text-slate-900 font-bold">{getTripExpiry()}</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onRefresh}
              className="flex-1 bg-white p-4 rounded-2xl border border-slate-100"
            >
              <View className="flex-row items-center gap-2 mb-1">
                <MapPin size={14} color="#64748b" />
                <Text className="text-slate-500 text-xs">Last Sync</Text>
              </View>
              <Text className="text-slate-900 font-bold">{syncDisplay}</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Actions */}
          <Text className="text-slate-400 text-xs uppercase font-bold tracking-widest mb-4 ml-1">Live Actions</Text>
          <PanicButton isInline />

          {/* <TouchableOpacity 
            onPress={() => router.push('/profile')}
            className="bg-emerald-500 p-5 rounded-3xl flex-row items-center justify-center gap-3 mb-4 shadow-lg shadow-emerald-200"
          >
            <Shield size={20} color="white" />
            <Text className="text-white font-bold text-lg">Verify Digital ID</Text>
          </TouchableOpacity> */}

          <TouchableOpacity
            onPress={() => router.push('/map')}
            className="bg-slate-900 p-5 rounded-3xl flex-row items-center justify-center gap-3 shadow-lg shadow-slate-200"
          >
            <MapPin size={20} color="white" />
            <Text className="text-white font-bold text-lg">Explore Safety Map</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/incident-report')}
            className="bg-amber-500 p-5 rounded-3xl flex-row items-center justify-center gap-3 mt-4 shadow-lg shadow-amber-200"
          >
            <AlertTriangle size={20} color="white" />
            <Text className="text-white font-bold text-lg">Report Incident</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
