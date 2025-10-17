import Constants from 'expo-constants';
import { getToken } from './auth';

type ExpoExtra = { apiBaseUrl?: string; apiToken?: string; liveTracksForceApi?: boolean } | undefined;

const extra = (Constants.expoConfig?.extra as ExpoExtra) ?? {};
const API_BASE = (extra?.apiBaseUrl || '').replace(/\/$/, '');
const API_TOKEN = extra?.apiToken;
const LIVE_FORCE_API = (typeof extra?.liveTracksForceApi === 'boolean') ? !!extra?.liveTracksForceApi : false;

// Common JSON headers
const JSON_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
};

// Build auth headers at call-time (prefer runtime token, fallback to app.json token)
async function buildAuthHeaders(): Promise<Record<string, string>> {
  const runtime = await getToken();
  const token = runtime || API_TOKEN;
  return token ? {
    'Authorization': `Bearer ${token}`,
    'X-Api-Token': token,
  } : {};
}

// Helper: try /api/... first; if 404, fall back to non-API route
async function fetchWithApiFallback(path: string, init: RequestInit): Promise<{ res: Response; text: string; usedUrl: string }> {
  const urlApi = `${API_BASE}/api${path}`;
  const urlWeb = `${API_BASE}${path}`;
  // Prefer API route to avoid CSRF. Optionally fall back if disabled by config.
  console.log(`[API] Attempting ${init.method || 'GET'} ${urlApi}`);
  let res = await fetch(urlApi, init);
  let text = await res.text();
  let usedUrl = urlApi;
  console.log(`[API] Response: ${res.status} ${res.statusText}`, text.substring(0, 200));
  if (!LIVE_FORCE_API && (res.status === 404 || res.status === 401 || res.status === 403)) {
    // Try web path only when fallback is enabled
    console.log(`[API] Fallback to ${urlWeb}`);
    res = await fetch(urlWeb, init);
    text = await res.text();
    usedUrl = urlWeb;
    console.log(`[API] Fallback response: ${res.status} ${res.statusText}`, text.substring(0, 200));
  }
  return { res, text, usedUrl };
}

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
    const auth = await buildAuthHeaders();
    const { res, text, usedUrl } = await fetchWithApiFallback('/catches', {
      method: 'POST',
      headers: {
        ...JSON_HEADERS,
        ...auth,
      },
      body: JSON.stringify(payload),
    });
    let json: any = undefined;
    try { json = text ? JSON.parse(text) : undefined; } catch {}
    if (!res.ok) {
      const isCsrf = res.status === 419 || /Page Expired|CSRF token mismatch/i.test(text) || /CSRF token mismatch/i.test(json?.message || '');
      const isUnauthorized = res.status === 401 || res.status === 403;
      const hint = isCsrf
        ? ' (CSRF: move endpoint to routes/api.php or exclude from CSRF; mobile cannot send Laravel session CSRF tokens)'
        : (isUnauthorized ? ' (Unauthorized: verify apiToken matches your backend guard; for Sanctum/Passport use Bearer tokens or accept X-Api-Token header)' : '');
      return { ok: false, status: res.status, error: `[${usedUrl}] ${(json?.message || text || 'Request failed')}${hint}` };
    }
    return { ok: true, status: res.status, data: json };
  } catch (e: any) {
    return { ok: false, status: 0, error: e?.message || 'Network error' };
  }
}

// Live Tracking (Beta)
export interface LiveTrackCreateResponse {
  publicId: string;
  writeKey: string;
  ingestUrl: string;
  pollUrl: string;
  mapUrl: string;
}

export interface LiveTrackPointPayload {
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number;
  bearing?: number;
  t?: string; // ISO8601 timestamp
}

export async function endLiveTrack(
  publicId: string,
  writeKey: string
): Promise<ApiResult<{ ok: true }>> {
  if (!API_BASE) {
    return { ok: false, status: 0, error: 'API base URL is not configured. Set expo.extra.apiBaseUrl in app.json.' };
  }
  try {
    const auth = await buildAuthHeaders();
    const { res, text, usedUrl } = await fetchWithApiFallback(`/live-tracks/${encodeURIComponent(publicId)}/end`, {
      method: 'POST',
      headers: {
        ...JSON_HEADERS,
        ...auth,
        'X-Track-Key': writeKey,
      },
    });
    let json: any = undefined;
    try { json = text ? JSON.parse(text) : undefined; } catch {}
    if (!res.ok) {
      const isUnauthorized = res.status === 401 || res.status === 403;
      const hint = isUnauthorized ? ' (Unauthorized: verify writeKey and apiToken; client sends X-Track-Key, Authorization, X-Api-Token)' : '';
      return { ok: false, status: res.status, error: `[${usedUrl}] ${(json?.message || text || 'Request failed')}${hint}` };
    }
    return { ok: true, status: res.status, data: json } as ApiResult<{ ok: true }>;
  } catch (e: any) {
    return { ok: false, status: 0, error: e?.message || 'Network error' };
  }
}

export async function createLiveTrack(): Promise<ApiResult<LiveTrackCreateResponse>> {
  if (!API_BASE) {
    return { ok: false, status: 0, error: 'API base URL is not configured. Set expo.extra.apiBaseUrl in app.json.' };
  }
  try {
    const auth = await buildAuthHeaders();
    const { res, text, usedUrl } = await fetchWithApiFallback('/live-tracks', {
      method: 'POST',
      headers: {
        ...JSON_HEADERS,
        ...auth,
      },
    });
    let json: any = undefined;
    try { json = text ? JSON.parse(text) : undefined; } catch {}
    if (!res.ok) {
      // Provide a clearer hint when server returns an HTML 419 Page Expired (Laravel CSRF)
      const isCsrf = res.status === 419 || /Page Expired|CSRF token mismatch/i.test(text) || /CSRF token mismatch/i.test(json?.message || '');
      const isUnauthorized = res.status === 401 || res.status === 403;
      const hint = isCsrf
        ? ' (CSRF: move endpoint to routes/api.php or exclude from CSRF; mobile cannot send Laravel session CSRF tokens)'
        : (isUnauthorized ? ' (Unauthorized: verify apiToken; ensure your API route checks the same header. Client sends both Authorization: Bearer and X-Api-Token)' : '');
      return { ok: false, status: res.status, error: `[${usedUrl}] ${(json?.message || text || 'Request failed')}${hint}` };
    }
    return { ok: true, status: res.status, data: json };
  } catch (e: any) {
    return { ok: false, status: 0, error: e?.message || 'Network error' };
  }
}

export async function pushLiveTrackPoint(
  publicId: string,
  writeKey: string,
  payload: LiveTrackPointPayload
): Promise<ApiResult<{ ok: true }>> {
  if (!API_BASE) {
    return { ok: false, status: 0, error: 'API base URL is not configured. Set expo.extra.apiBaseUrl in app.json.' };
  }
  try {
    const auth = await buildAuthHeaders();
    const { res, text, usedUrl } = await fetchWithApiFallback(`/live-tracks/${encodeURIComponent(publicId)}/points`, {
      method: 'POST',
      headers: {
        ...JSON_HEADERS,
        ...auth,
        'X-Track-Key': writeKey,
      },
      body: JSON.stringify(payload),
    });
    let json: any = undefined;
    try { json = text ? JSON.parse(text) : undefined; } catch {}
    if (!res.ok) {
      const isCsrf = res.status === 419 || /Page Expired|CSRF token mismatch/i.test(text) || /CSRF token mismatch/i.test(json?.message || '');
      const isUnauthorized = res.status === 401 || res.status === 403;
      const hint = isCsrf
        ? ' (CSRF: move endpoint to routes/api.php or exclude from CSRF; mobile cannot send Laravel session CSRF tokens)'
        : (isUnauthorized ? ' (Unauthorized: verify writeKey and apiToken are accepted; client sends X-Track-Key, Authorization, and X-Api-Token)' : '');
      return { ok: false, status: res.status, error: `[${usedUrl}] ${(json?.message || text || 'Request failed')}${hint}` };
    }
    return { ok: true, status: res.status, data: json } as ApiResult<{ ok: true }>;
  } catch (e: any) {
    return { ok: false, status: 0, error: e?.message || 'Network error' };
  }
}

export async function pollLiveTrackPoints(
  publicId: string,
  sinceIso?: string
): Promise<ApiResult<{ points: Array<LiveTrackPointPayload & { id?: string }> }>> {
  if (!API_BASE) {
    return { ok: false, status: 0, error: 'API base URL is not configured. Set expo.extra.apiBaseUrl in app.json.' };
  }
  try {
    const basePath = `/live-tracks/${encodeURIComponent(publicId)}/points`;
    const urlApi = new URL(`${API_BASE}/api${basePath}`);
    const urlWeb = new URL(`${API_BASE}${basePath}`);
    if (sinceIso) { urlApi.searchParams.set('since', sinceIso); urlWeb.searchParams.set('since', sinceIso); }
    const auth = await buildAuthHeaders();
    let res = await fetch(urlApi.toString(), {
      method: 'GET',
      headers: {
        ...JSON_HEADERS,
        ...auth,
      },
    });
    let text = await res.text();
    if (res.status === 404) {
      res = await fetch(urlWeb.toString(), {
        method: 'GET',
        headers: {
          ...JSON_HEADERS,
          ...auth,
        },
      });
      text = await res.text();
    }
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

// Auth endpoints: login/logout/me (Sanctum-compatible)
export async function apiLogin(params: { email: string; password: string; device_name?: string }): Promise<ApiResult<{ token: string; user: any }>> {
  if (!API_BASE) return { ok: false, status: 0, error: 'API base URL not set' };
  try {
    const res = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ device_name: 'CatchaApp', ...params }),
    });
    const text = await res.text();
    let json: any = undefined; try { json = text ? JSON.parse(text) : undefined; } catch {}
    if (!res.ok) return { ok: false, status: res.status, error: json?.message || text || 'Login failed' };
    return { ok: true, status: res.status, data: json };
  } catch (e: any) {
    return { ok: false, status: 0, error: e?.message || 'Network error' };
  }
}

export async function apiMe(): Promise<ApiResult<any>> {
  if (!API_BASE) return { ok: false, status: 0, error: 'API base URL not set' };
  try {
    const auth = await buildAuthHeaders();
    const res = await fetch(`${API_BASE}/api/user`, {
      method: 'GET',
      headers: { ...JSON_HEADERS, ...auth },
    });
    const text = await res.text();
    let json: any = undefined; try { json = text ? JSON.parse(text) : undefined; } catch {}
    if (!res.ok) return { ok: false, status: res.status, error: json?.message || text || 'Unauthorized' };
    return { ok: true, status: res.status, data: json };
  } catch (e: any) {
    return { ok: false, status: 0, error: e?.message || 'Network error' };
  }
}

export async function apiLogout(): Promise<ApiResult<{ ok: true }>> {
  if (!API_BASE) return { ok: false, status: 0, error: 'API base URL not set' };
  try {
    const auth = await buildAuthHeaders();
    const res = await fetch(`${API_BASE}/api/logout`, {
      method: 'POST',
      headers: { ...JSON_HEADERS, ...auth },
    });
    const text = await res.text();
    let json: any = undefined; try { json = text ? JSON.parse(text) : undefined; } catch {}
    if (!res.ok) return { ok: false, status: res.status, error: json?.message || text || 'Logout failed' };
    return { ok: true, status: res.status, data: json } as ApiResult<{ ok: true }>;
  } catch (e: any) {
    return { ok: false, status: 0, error: e?.message || 'Network error' };
  }
}
