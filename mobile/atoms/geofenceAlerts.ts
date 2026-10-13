import { atom } from 'jotai';

export interface GeofenceAlert {
    id: string;
    fenceId: string;
    fenceName: string;
    fenceType: 'DANGER' | 'RESTRICTED' | 'SAFE' | 'MONITORED';
    message: string;
    timestamp: number;
    read: boolean;
}

/** Live list of geofence breach alerts for the session */
export const geofenceAlertsAtom = atom<GeofenceAlert[]>([]);

/** The fence IDs the user is currently inside (to avoid duplicate alerts) */
export const activeFenceIdsAtom = atom<Set<string>>(new Set<string>());
