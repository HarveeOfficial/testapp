import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLiveTrack, endLiveTrack, LiveTrackCreateResponse, LiveTrackPointPayload, pushLiveTrackPoint } from './api';

const STORAGE_KEY = 'catcha.liveTrack.info';

export interface LiveTrackInfo extends LiveTrackCreateResponse {}

export async function getSavedLiveTrack(): Promise<LiveTrackInfo | null> {
  try {
    const v = await AsyncStorage.getItem(STORAGE_KEY);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}

export async function clearSavedLiveTrack(): Promise<void> {
  try { await AsyncStorage.removeItem(STORAGE_KEY); } catch {}
}

export async function ensureLiveTrack(): Promise<LiveTrackInfo> {
  const existing = await getSavedLiveTrack();
  if (existing?.publicId && existing?.writeKey) return existing;
  const res = await createLiveTrack();
  if (!res.ok || !res.data) {
    throw new Error(res.error || `Failed to create live track (${res.status})`);
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(res.data));
  return res.data;
}

export async function pushLocationAsLivePoint(info: LiveTrackInfo, loc: {
  latitude: number; longitude: number; accuracy?: number; speed?: number | null; heading?: number | null; timestamp?: number;
}) {
  const payload: LiveTrackPointPayload = {
    lat: loc.latitude,
    lng: loc.longitude,
    accuracy: typeof loc.accuracy === 'number' ? Math.round(loc.accuracy) : undefined,
    speed: typeof loc.speed === 'number' ? loc.speed : undefined,
    bearing: typeof loc.heading === 'number' ? loc.heading : undefined,
    t: loc.timestamp ? new Date(loc.timestamp).toISOString() : new Date().toISOString(),
  };
  return pushLiveTrackPoint(info.publicId, info.writeKey, payload);
}

export async function endLiveTrackSession(info: LiveTrackInfo) {
  const res = await endLiveTrack(info.publicId, info.writeKey);
  if (res.ok) {
    await clearSavedLiveTrack();
  }
  return res;
}
