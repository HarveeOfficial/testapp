import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

// Types for location data
export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  source: 'gps' | 'network' | 'click' | 'drag' | 'watch';
  timestamp: number;
  geohash: string;
}

export interface WayfarePoint extends LocationData {
  id: string;
}

export interface WayfareMeta {
  startedAt: number | null;
  stoppedAt: number | null;
  total: number;
  isRunning: boolean;
}

export interface WayfareTrack {
  points: WayfarePoint[];
  meta: WayfareMeta;
}

// Storage keys
const CURRENT_POSITION_KEY = 'catcha.position.current';
const WAYFARE_TRACK_KEY = 'catcha.wayfare.track';
const WAYFARE_META_KEY = 'catcha.wayfare.meta';
const SETTINGS_KEY = 'catcha.settings';

type SettingsData = {
  highAccuracy?: boolean;
  geohashPrecision?: number;
};

// Geohash encoding function (adapted from your Catcha code)
export function geohashEncode(lat: number, lon: number, precision: number = 10): string {
  const base32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  let latInterval: [number, number] = [-90.0, 90.0];
  let lonInterval: [number, number] = [-180.0, 180.0];
  let hash = '';
  let isEven = true;
  let bit = 0;
  let ch = 0;
  const bits = [16, 8, 4, 2, 1];

  while (hash.length < precision) {
    if (isEven) {
      const mid = (lonInterval[0] + lonInterval[1]) / 2;
      if (lon >= mid) {
        ch |= bits[bit];
        lonInterval[0] = mid;
      } else {
        lonInterval[1] = mid;
      }
    } else {
      const mid = (latInterval[0] + latInterval[1]) / 2;
      if (lat >= mid) {
        ch |= bits[bit];
        latInterval[0] = mid;
      } else {
        latInterval[1] = mid;
      }
    }
    isEven = !isEven;
    if (bit < 4) {
      bit++;
    } else {
      hash += base32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return hash;
}

// Haversine distance calculation
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => d * Math.PI / 180;
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + 
           Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
           Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Location utilities
export class GeoTaggingService {
  private static instance: GeoTaggingService;
  private watchId: Location.LocationSubscription | null = null;
  private wayfareWatchId: Location.LocationSubscription | null = null;
  private watchPollingTimer: ReturnType<typeof setInterval> | null = null;
  private recentSamples: LocationData[] = [];
  private readonly maxSamples = 5;
  private readonly minGoodAccuracyM = 50; // accept samples with <= 50m accuracy

  static getInstance(): GeoTaggingService {
    if (!GeoTaggingService.instance) {
      GeoTaggingService.instance = new GeoTaggingService();
    }
    return GeoTaggingService.instance;
  }

  // Request location permissions
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Location permission not granted');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  // Get current location once
  async getCurrentLocation(): Promise<LocationData | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      const desiredAccuracy = await this.getDesiredAccuracy();
      const location = await Location.getCurrentPositionAsync({
        accuracy: desiredAccuracy,
        timeInterval: 1000,
        distanceInterval: 1,
      });

      const raw: LocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || undefined,
        source: 'gps',
        timestamp: Date.now(),
        geohash: geohashEncode(location.coords.latitude, location.coords.longitude),
      };

      const locationData = this.applySmoothing(raw);

      await this.saveCurrentPosition(locationData);
      return locationData;
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  // Start watching location changes
  async startLocationWatch(callback: (location: LocationData) => void): Promise<boolean> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return false;

      if (this.watchId) {
        this.watchId.remove();
      }

      // Emit an immediate reading so UI updates even before the first watch callback
      try {
        const desiredAccuracy = await this.getDesiredAccuracy();
        const initial = await Location.getCurrentPositionAsync({
          accuracy: desiredAccuracy,
        });
        const initialRaw: LocationData = {
          latitude: initial.coords.latitude,
          longitude: initial.coords.longitude,
          accuracy: initial.coords.accuracy || undefined,
          source: 'gps',
          timestamp: Date.now(),
          geohash: geohashEncode(initial.coords.latitude, initial.coords.longitude),
        };
        const initialData = this.applySmoothing(initialRaw);
        await this.saveCurrentPosition(initialData);
        callback(initialData);
      } catch (e) {
        // ignore initial read errors; watch below will still start
      }

      this.watchId = await Location.watchPositionAsync(
        {
          accuracy: await this.getDesiredAccuracy(),
          // Lower thresholds so updates are more frequent even with small movements
          timeInterval: 1000, // ms
          distanceInterval: 1, // meters
        },
        (location) => {
          const raw: LocationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || undefined,
            source: 'watch',
            timestamp: Date.now(),
            geohash: geohashEncode(location.coords.latitude, location.coords.longitude)
          };

          // Gate low-quality samples unless nothing else is available
          if (typeof raw.accuracy === 'number' && raw.accuracy > this.minGoodAccuracyM) {
            // If last good sample exists and new is worse, skip
            const last = this.recentSamples[this.recentSamples.length - 1];
            if (last && (last.accuracy ?? this.minGoodAccuracyM) <= this.minGoodAccuracyM) {
              return;
            }
          }

          const locationData = this.applySmoothing(raw);
          this.saveCurrentPosition(locationData);
          callback(locationData);
        }
      );

      // Cross-platform polling fallback: on iOS distanceInterval may gate updates; poll to ensure UI refreshes
      if (this.watchPollingTimer) clearInterval(this.watchPollingTimer);
      this.watchPollingTimer = setInterval(async () => {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: await this.getDesiredAccuracy() });
          const raw: LocationData = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracy: loc.coords.accuracy || undefined,
            source: 'watch',
            timestamp: Date.now(),
            geohash: geohashEncode(loc.coords.latitude, loc.coords.longitude),
          };
          const data = this.applySmoothing(raw);
          await this.saveCurrentPosition(data);
          callback(data);
        } catch {}
      }, 5000);

      return true;
    } catch (error) {
      console.error('Error starting location watch:', error);
      return false;
    }
  }

  // Choose desired accuracy based on settings
  private async getDesiredAccuracy(): Promise<Location.Accuracy> {
    try {
      const s = await AsyncStorage.getItem(SETTINGS_KEY);
      const parsed: SettingsData | null = s ? JSON.parse(s) : null;
      const high = parsed?.highAccuracy ?? true;
      return high ? Location.Accuracy.BestForNavigation : Location.Accuracy.Balanced;
    } catch {
      return Location.Accuracy.BestForNavigation;
    }
  }

  // Keep a rolling window and return smoothed location
  private applySmoothing(sample: LocationData): LocationData {
    // Keep only reasonably bounded accuracy samples
    if (typeof sample.accuracy === 'number' && sample.accuracy > 5000) {
      // ignore obviously bad readings
      return this.recentSamples[this.recentSamples.length - 1] ?? sample;
    }

    this.recentSamples.push(sample);
    if (this.recentSamples.length > this.maxSamples) {
      this.recentSamples.shift();
    }

    // Weighted average favoring more accurate samples
    let sumLat = 0, sumLon = 0, sumW = 0;
    for (const s of this.recentSamples) {
      const acc = typeof s.accuracy === 'number' && s.accuracy > 0 ? s.accuracy : this.minGoodAccuracyM;
      const w = 1 / acc; // lower accuracy (bigger meters) => smaller weight
      sumLat += s.latitude * w;
      sumLon += s.longitude * w;
      sumW += w;
    }

    const lat = sumW > 0 ? sumLat / sumW : sample.latitude;
    const lon = sumW > 0 ? sumLon / sumW : sample.longitude;
    const accs = this.recentSamples.map(s => s.accuracy ?? this.minGoodAccuracyM);
    const bestAcc = Math.min(...accs);

    return {
      ...sample,
      latitude: lat,
      longitude: lon,
      // Report best observed accuracy in window
      accuracy: Number.isFinite(bestAcc) ? bestAcc : sample.accuracy,
      geohash: geohashEncode(lat, lon),
    };
  }

  // Stop watching location
  stopLocationWatch(): void {
    if (this.watchId) {
      this.watchId.remove();
      this.watchId = null;
    }
    if (this.watchPollingTimer) {
      clearInterval(this.watchPollingTimer);
      this.watchPollingTimer = null;
    }
  }

  // Save current position to storage
  async saveCurrentPosition(location: LocationData): Promise<void> {
    try {
      await AsyncStorage.setItem(CURRENT_POSITION_KEY, JSON.stringify(location));
    } catch (error) {
      console.error('Error saving current position:', error);
    }
  }

  // Load saved position from storage
  async loadSavedPosition(): Promise<LocationData | null> {
    try {
      const saved = await AsyncStorage.getItem(CURRENT_POSITION_KEY);
      if (!saved) return null;
      
      const parsed = JSON.parse(saved);
      if (typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
        return parsed as LocationData;
      }
    } catch (error) {
      console.error('Error loading saved position:', error);
    }
    return null;
  }

  // Clear saved position
  async clearSavedPosition(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CURRENT_POSITION_KEY);
    } catch (error) {
      console.error('Error clearing saved position:', error);
    }
  }

  // Wayfare tracking methods
  async startWayfareTracking(): Promise<boolean> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return false;

      // Update meta to running state
      const meta = await this.getWayfareMeta();
      meta.isRunning = true;
      meta.startedAt = Date.now();
      meta.stoppedAt = null;
      await this.saveWayfareMeta(meta);

      if (this.wayfareWatchId) {
        this.wayfareWatchId.remove();
      }

      this.wayfareWatchId = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000,
          distanceInterval: 5
        },
        async (location) => {
          const point: WayfarePoint = {
            id: `${Date.now()}_${Math.random()}`,
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || undefined,
            source: 'watch',
            timestamp: Date.now(),
            geohash: geohashEncode(location.coords.latitude, location.coords.longitude)
          };
          
          await this.addWayfarePoint(point);
        }
      );

      return true;
    } catch (error) {
      console.error('Error starting wayfare tracking:', error);
      return false;
    }
  }

  async stopWayfareTracking(): Promise<void> {
    if (this.wayfareWatchId) {
      this.wayfareWatchId.remove();
      this.wayfareWatchId = null;
    }

    const meta = await this.getWayfareMeta();
    meta.isRunning = false;
    meta.stoppedAt = Date.now();
    await this.saveWayfareMeta(meta);
  }

  async addWayfarePoint(point: WayfarePoint): Promise<void> {
    try {
      const track = await this.getWayfareTrack();
      track.points.push(point);
      track.meta.total = track.points.length;
      
      await AsyncStorage.setItem(WAYFARE_TRACK_KEY, JSON.stringify(track.points));
      await this.saveWayfareMeta(track.meta);
    } catch (error) {
      console.error('Error adding wayfare point:', error);
    }
  }

  async getWayfareTrack(): Promise<WayfareTrack> {
    try {
      const pointsJson = await AsyncStorage.getItem(WAYFARE_TRACK_KEY);
      const points: WayfarePoint[] = pointsJson ? JSON.parse(pointsJson) : [];
      const meta = await this.getWayfareMeta();
      
      return { points, meta };
    } catch (error) {
      console.error('Error getting wayfare track:', error);
      return {
        points: [],
        meta: { startedAt: null, stoppedAt: null, total: 0, isRunning: false }
      };
    }
  }

  async getWayfareMeta(): Promise<WayfareMeta> {
    try {
      const metaJson = await AsyncStorage.getItem(WAYFARE_META_KEY);
      return metaJson ? JSON.parse(metaJson) : {
        startedAt: null,
        stoppedAt: null,
        total: 0,
        isRunning: false
      };
    } catch (error) {
      console.error('Error getting wayfare meta:', error);
      return { startedAt: null, stoppedAt: null, total: 0, isRunning: false };
    }
  }

  async saveWayfareMeta(meta: WayfareMeta): Promise<void> {
    try {
      await AsyncStorage.setItem(WAYFARE_META_KEY, JSON.stringify(meta));
    } catch (error) {
      console.error('Error saving wayfare meta:', error);
    }
  }

  async clearWayfareTrack(): Promise<void> {
    try {
      await AsyncStorage.removeItem(WAYFARE_TRACK_KEY);
      await AsyncStorage.removeItem(WAYFARE_META_KEY);
    } catch (error) {
      console.error('Error clearing wayfare track:', error);
    }
  }

  // Calculate total distance of wayfare track
  async calculateWayfareDistance(): Promise<number> {
    const track = await this.getWayfareTrack();
    if (track.points.length < 2) return 0;

    let totalDistance = 0;
    for (let i = 1; i < track.points.length; i++) {
      const prev = track.points[i - 1];
      const curr = track.points[i];
      totalDistance += haversineDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
    }
    
    return totalDistance / 1000; // Convert to kilometers
  }

  // Get wayfare summary
  async getWayfareSummary(): Promise<string> {
    const track = await this.getWayfareTrack();
    const distance = await this.calculateWayfareDistance();
    
    if (distance > 0) {
      return `${distance.toFixed(2)} km (${track.points.length} pts)`;
    }
    return `${track.points.length} pts`;
  }
}