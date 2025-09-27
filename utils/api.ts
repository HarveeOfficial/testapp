import Constants from 'expo-constants';

type ExpoExtra = { apiBaseUrl?: string; apiToken?: string } | undefined;

const extra = (Constants.expoConfig?.extra as ExpoExtra) ?? {};
const API_BASE = (extra?.apiBaseUrl || '').replace(/\/$/, '');
const API_TOKEN = extra?.apiToken;

export interface CreateCatchPayload {
  caught_at?: string; // ISO string
  species_id?: number | null;
  species_name?: string | null;
  weight_kg?: number | null;
  length_cm?: number | null;
  notes?: string | null;
  location_label?: string | null;
  latitude: number;
  longitude: number;
  geohash: string;
  geo_source?: string | null;
  geo_accuracy_m?: number | null;
  environmental_data?: {
    wayfare_track_json?: unknown;
    wayfare_summary?: string;
  };
}

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

export async function createCatch(payload: CreateCatchPayload): Promise<ApiResult<{ id: number }>> {
  if (!API_BASE) {
    return { ok: false, status: 0, error: 'API base URL is not configured. Set expo.extra.apiBaseUrl in app.json.' };
  }
  try {
    const res = await fetch(`${API_BASE}/api/catches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(API_TOKEN ? { 'Authorization': `Bearer ${API_TOKEN}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    let json: any = undefined;
    try { json = text ? JSON.parse(text) : undefined; } catch {}
    if (!res.ok) {
      return { ok: false, status: res.status, error: json?.message || text || 'Request failed' };
    }
    return { ok: true, status: res.status, data: json };
  } catch (e: any) {
    return { ok: false, status: 0, error: e?.message || 'Network error' };
  }
}
