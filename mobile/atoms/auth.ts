import { atom } from 'jotai';
import { atomWithStorage, createJSONStorage } from 'jotai/utils';
import AsyncStorage from '@react-native-async-storage/async-storage';

const storage = createJSONStorage<any>(() => AsyncStorage);

export const tokenAtom = atomWithStorage<string | null>('auth_token', null, storage);
export const userAtom = atomWithStorage<any | null>('auth_user', null, storage);

export const signupFormAtom = atom({
    fullName: '',
    email: '',
    password: '',
    phoneNumber: '',
    nationality: ''
});
