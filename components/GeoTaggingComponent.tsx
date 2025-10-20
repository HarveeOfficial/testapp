import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as ExpoLinking from 'expo-linking';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getToken } from '../utils/auth';
import { CSVExportService } from '../utils/csvExport';
import { GeoTaggingService, LocationData, WayfareTrack } from '../utils/geoTagging';
import { clearSavedLiveTrack, endLiveTrackSession, ensureLiveTrack, getSavedLiveTrack, pushLocationAsLivePoint } from '../utils/liveTracking';
import { useTheme } from '../utils/ThemeContext';
import { AuthModal } from './AuthModal';

interface GeoTaggingComponentProps {
  onLocationChange?: (location: LocationData | null) => void;
  showWayfare?: boolean;
  showManualInput?: boolean;
}

export const GeoTaggingComponent: React.FC<GeoTaggingComponentProps> = ({
  onLocationChange,
  showWayfare = true,
  showManualInput = true
}) => {
  const { theme } = useTheme();
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [wayfareTrack, setWayfareTrack] = useState<WayfareTrack>({
    points: [],
    meta: { startedAt: null, stoppedAt: null, total: 0, isRunning: false }
  });
  const [wayfareDistance, setWayfareDistance] = useState(0);
  const [manualLat, setManualLat] = useState('');
  const [manualLon, setManualLon] = useState('');
  const [liveTrack, setLiveTrack] = useState<null | { publicId: string; writeKey: string; ingestUrl: string; pollUrl: string; mapUrl: string }>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [recordedCoordinatesCount, setRecordedCoordinatesCount] = useState(0);
  const streamingRef = useRef(false);
  const liveTrackRef = useRef<typeof liveTrack>(null);

  const geoService = GeoTaggingService.getInstance();
  const csvService = CSVExportService.getInstance();

  // Load saved position on mount
  useEffect(() => {
    loadSavedPosition();
    loadWayfareData();
    (async () => {
      const t = await getSavedLiveTrack();
      if (t) setLiveTrack(t);
    })();
  }, []);

  useEffect(() => { streamingRef.current = isStreaming; }, [isStreaming]);
  useEffect(() => { liveTrackRef.current = liveTrack; }, [liveTrack]);

  // Update parent component when location changes
  useEffect(() => {
    if (onLocationChange) {
      onLocationChange(currentLocation);
    }
  }, [currentLocation, onLocationChange]);

  const loadSavedPosition = async () => {
    const saved = await geoService.loadSavedPosition();
    if (saved) {
      setCurrentLocation(saved);
      setManualLat(saved.latitude.toFixed(6));
      setManualLon(saved.longitude.toFixed(6));
    }
  };

  const loadWayfareData = async () => {
    const track = await geoService.getWayfareTrack();
    setWayfareTrack(track);
    
    const distance = await geoService.calculateWayfareDistance();
    setWayfareDistance(distance);
  };

  const handleDetectLocation = useCallback(async () => {
    setIsDetecting(true);
    try {
      const location = await geoService.getCurrentLocation();
      if (location) {
        setCurrentLocation(location);
        setManualLat(location.latitude.toFixed(6));
        setManualLon(location.longitude.toFixed(6));
        Alert.alert('Success', 'Location detected successfully!');
      } else {
        Alert.alert('Error', 'Could not detect location. Please check permissions.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to detect location');
    } finally {
      setIsDetecting(false);
    }
  }, []);

  const handleToggleWatch = useCallback(async () => {
    if (isWatching) {
      geoService.stopLocationWatch();
      setIsWatching(false);
      setIsStreaming(false);
    } else {
      const success = await geoService.startLocationWatch(async (location) => {
        setCurrentLocation(location);
        setManualLat(location.latitude.toFixed(6));
        setManualLon(location.longitude.toFixed(6));
        
        // Record coordinate for CSV export
        await csvService.recordWatchCoordinate(location);
        const count = await csvService.getWatchCoordinatesCount();
        setRecordedCoordinatesCount(count);
        
        // If streaming is enabled and live track exists, push point
        const lt = liveTrackRef.current;
        if (streamingRef.current && lt) {
          await pushLocationAsLivePoint(lt, {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
            speed: undefined,
            heading: undefined,
            timestamp: location.timestamp,
          });
        }
      });
      
      if (success) {
        setIsWatching(true);
      } else {
        Alert.alert('Error', 'Could not start location watching. Please check permissions.');
      }
    }
  }, [isWatching, geoService, csvService]);

  const handleCreateLiveTrack = useCallback(async () => {
    if (liveTrack) {
      Alert.alert('Track already exists', 'Please End Track (Server) or Reset Track before creating a new one.');
      return;
    }
    try {
      const t = await ensureLiveTrack();
      setLiveTrack(t);
      Alert.alert('Live Track Ready', 'A new live track has been created. You can start streaming points.');
    } catch (e: any) {
      Alert.alert('Live Track Error', e?.message || 'Failed to create live track');
    }
  }, [liveTrack]);

  // Unified Live Tracking button handler: Create → Watch → (manual Stream)
  const handleLiveTrackingUnified = useCallback(async () => {
    // Check if user is authenticated
    const token = await getToken();
    if (!token) {
      setAuthModalVisible(true);
      return;
    }

    // Step 1: Create track if none exists
    if (!liveTrack) {
      try {
        const t = await ensureLiveTrack();
        setLiveTrack(t);
        // Continue to step 2 immediately: start GPS watch
        const success = await geoService.startLocationWatch(async (location) => {
          setCurrentLocation(location);
          setManualLat(location.latitude.toFixed(6));
          setManualLon(location.longitude.toFixed(6));
          // If streaming is enabled and live track exists, push point
          const lt = liveTrackRef.current;
          if (streamingRef.current && lt) {
            await pushLocationAsLivePoint(lt, {
              latitude: location.latitude,
              longitude: location.longitude,
              accuracy: location.accuracy,
              speed: undefined,
              heading: undefined,
              timestamp: location.timestamp,
            });
          }
        });

        if (success) {
          setIsWatching(true);
          // Do NOT auto-start streaming; let user manually tap to start
          Alert.alert('Ready to Stream', 'Track created and GPS watching started. Tap again to start streaming.');
        } else {
          Alert.alert('Error', 'Could not start location watching. Please check permissions.');
        }
      } catch (e: any) {
        Alert.alert('Live Track Error', e?.message || 'Failed to create live track');
      }
      return;
    }

    // Track exists: toggle streaming on/off
    if (isStreaming) {
      setIsStreaming(false);
      Alert.alert('Streaming Stopped', 'Live points are no longer being sent.');
    } else {
      setIsStreaming(true);
      Alert.alert('Streaming Started', 'Live points are now being streamed.');
    }
  }, [liveTrack, isWatching, isStreaming, geoService]);

  const handleToggleStreaming = useCallback(async () => {
    if (!liveTrack) {
      Alert.alert('No track', 'Create a live track first.');
      return;
    }
    if (!isWatching) {
      Alert.alert('Not watching GPS', 'Start GPS Watch to stream live points.');
      return;
    }
    setIsStreaming((v) => !v);
  }, [liveTrack, isWatching]);

  const handleOpenLiveMap = useCallback(() => {
    if (!liveTrack?.mapUrl) {
      Alert.alert('No map URL', 'Create a live track first.');
      return;
    }
    Linking.openURL(liveTrack.mapUrl).catch(() => Alert.alert('Open failed', 'Could not open the public map URL.'));
  }, [liveTrack]);

  const handleResetLiveTrack = useCallback(async () => {
    await clearSavedLiveTrack();
    setLiveTrack(null);
    setIsStreaming(false);
    Alert.alert('Reset', 'Live track info cleared.');
  }, []);

  const handleEndLiveTrack = useCallback(async () => {
    if (!liveTrack) {
      Alert.alert('No track', 'Create a live track first.');
      return;
    }
    try {
      const res = await endLiveTrackSession(liveTrack);
      if (res.ok) {
        setIsStreaming(false);
        setLiveTrack(null);
        Alert.alert('Ended', 'Live track has been ended on the server.');
      } else {
        Alert.alert('End Failed', res.error || 'Could not end live track.');
      }
    } catch (e: any) {
      Alert.alert('End Failed', e?.message || 'Could not end live track.');
    }
  }, [liveTrack]);

  const handleToggleWayfare = useCallback(async () => {
    if (wayfareTrack.meta.isRunning) {
      await geoService.stopWayfareTracking();
      Alert.alert('Success', 'Wayfare tracking stopped');
    } else {
      const success = await geoService.startWayfareTracking();
      if (success) {
        Alert.alert('Success', 'Wayfare tracking started');
      } else {
        Alert.alert('Error', 'Could not start wayfare tracking. Please check permissions.');
      }
    }
    await loadWayfareData();
  }, [wayfareTrack.meta.isRunning]);

  const handleClearLocation = useCallback(async () => {
    Alert.alert(
      'Clear Location Data',
      'This will clear current location and wayfare track. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await geoService.clearSavedPosition();
            await geoService.clearWayfareTrack();
            setCurrentLocation(null);
            setManualLat('');
            setManualLon('');
            await loadWayfareData();
            Alert.alert('Success', 'Location data cleared');
          }
        }
      ]
    );
  }, []);

  const handleManualLocationUpdate = useCallback(() => {
    const lat = parseFloat(manualLat);
    const lon = parseFloat(manualLon);
    
    if (isNaN(lat) || isNaN(lon)) {
      Alert.alert('Error', 'Please enter valid latitude and longitude values');
      return;
    }
    
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      Alert.alert('Error', 'Please enter valid coordinate ranges (lat: -90 to 90, lon: -180 to 180)');
      return;
    }

    const location: LocationData = {
      latitude: lat,
      longitude: lon,
      source: 'click',
      timestamp: Date.now(),
      geohash: require('../utils/geoTagging').geohashEncode(lat, lon)
    };

    setCurrentLocation(location);
    geoService.saveCurrentPosition(location);
    Alert.alert('Success', 'Manual location updated');
  }, [manualLat, manualLon, geoService]);

  const handleOpenWebCreate = useCallback(() => {
    const extra: any = Constants.expoConfig?.extra || {};
    const base: string | undefined = extra.apiBaseUrl?.replace(/\/$/, '');
    const createUrl: string | undefined = (extra.webCreateUrl || (base ? `${base}/catches/create` : undefined));
    if (!createUrl) {
      Alert.alert('Missing config', 'Set expo.extra.apiBaseUrl or expo.extra.webCreateUrl in app.json to your Laravel create form URL.');
      return;
    }
    if (!currentLocation) {
      Alert.alert('No location', 'Detect or enter a location first.');
      return;
    }
    const params = new URLSearchParams({
      latitude: currentLocation.latitude.toFixed(6),
      longitude: currentLocation.longitude.toFixed(6),
      geohash: currentLocation.geohash,
    });
    if (typeof currentLocation.accuracy === 'number') {
      params.set('geo_accuracy_m', String(Math.round(currentLocation.accuracy)));
    }
    params.set('geo_source', currentLocation.source);
    const url = `${createUrl}?${params.toString()}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Open failed', 'Could not open the web form URL.');
    });
  }, [currentLocation, geoService]);

  const handleExportCSV = useCallback(async () => {
    try {
      if (recordedCoordinatesCount === 0) {
        Alert.alert('No data', 'Start watch to record coordinates first.');
        return;
      }
      await csvService.exportAsCSV();
      Alert.alert('Success', `Exported ${recordedCoordinatesCount} coordinates to CSV`);
    } catch (error: any) {
      Alert.alert('Export Failed', error?.message || 'Could not export coordinates');
    }
  }, [recordedCoordinatesCount, csvService]);

  const handleClearRecordedCoordinates = useCallback(async () => {
    Alert.alert(
      'Clear Recorded Coordinates',
      `This will delete all ${recordedCoordinatesCount} recorded coordinates. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await csvService.clearWatchCoordinates();
            setRecordedCoordinatesCount(0);
            Alert.alert('Success', 'Recorded coordinates cleared');
          }
        }
      ]
    );
  }, [recordedCoordinatesCount, csvService]);

  const formatAccuracy = (accuracy?: number): string => {
    if (!accuracy) return '';
    return accuracy < 1000 ? `±${accuracy.toFixed(0)}m` : `±${(accuracy/1000).toFixed(1)}km`;
  };

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  const openStartWayfareDeepLink = useCallback(() => {
    // catcha://start-wayfare is based on app.json expo.scheme
    const scheme = (Constants.expoConfig?.scheme as string) || 'catcha';
    const url = ExpoLinking.createURL('start-wayfare');
    Linking.openURL(url).catch(() => {
      Alert.alert('Open failed', 'Could not open the deep link.');
    });
  }, []);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.section}>
        {/* <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>📍 Geo-Tagging</Text> */}
        
        {/* Current Location Display */}
        <View style={[styles.locationCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Current Location</Text>
          {currentLocation ? (
            <View>
              <Text style={[styles.locationText, { color: '#4CAF50' }]}>
                📍 {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
              </Text>
              <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                🔗 Geohash: {currentLocation.geohash}
              </Text>
              <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                📡 Source: {currentLocation.source.toUpperCase()}
                {currentLocation.accuracy && ` ${formatAccuracy(currentLocation.accuracy)}`}
              </Text>
              <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                🕒 {formatTimestamp(currentLocation.timestamp)}
              </Text>
            </View>
          ) : (
            <Text style={[styles.noLocationText, { color: theme.colors.textSecondary }]}>No location data available</Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.primary }, isDetecting && styles.buttonDisabled]}
            onPress={handleDetectLocation}
            disabled={isDetecting}
          >
            {isDetecting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="location" size={20} color="#fff" />
            )}
            <Text style={styles.buttonText}>
              {isDetecting ? 'Detecting...' : 'Detect GPS'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, isWatching ? styles.buttonActive : styles.buttonSecondary]}
            onPress={handleToggleWatch}
          >
            <Ionicons name={isWatching ? "pause" : "play"} size={20} color="#fff" />
            <Text style={styles.buttonText}>
              {isWatching ? 'Stop Watch' : 'Start Watch'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Open Web Create Form with current lat/lon */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.buttonSuccess, !currentLocation && styles.buttonDisabled]}
            onPress={handleOpenWebCreate}
            disabled={!currentLocation}
          >
            <Ionicons name="open-outline" size={20} color="#fff" />
            <Text style={styles.buttonText}>Open Web Form (Prefill)</Text>
          </TouchableOpacity>
        </View>

        {/* Live Tracking (Beta) */}
        <View style={[styles.liveSection, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>🛰️ Live Tracking (Beta)</Text>
          {liveTrack ? (
            <View style={{ marginBottom: 10 }}>
              <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>publicId: {liveTrack.publicId}</Text>
              <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>ingest: {liveTrack.ingestUrl}</Text>
              <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>poll: {liveTrack.pollUrl}</Text>
              <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>map: {liveTrack.mapUrl}</Text>
            </View>
          ) : (
            <Text style={[styles.noLocationText, { color: theme.colors.textSecondary }]}>No live track created yet.</Text>
          )}

          {/* Unified Live Tracking Button */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.button,
                !liveTrack && styles.buttonSuccess,
                liveTrack && !isStreaming && styles.buttonSecondary,
                isStreaming && styles.buttonActive
              ]}
              onPress={handleLiveTrackingUnified}
            >
              <Ionicons
                name={
                  !liveTrack
                    ? 'radio-outline'
                    : isStreaming
                    ? 'pause'
                    : 'paper-plane-outline'
                }
                size={20}
                color="#fff"
              />
              <Text style={styles.buttonText}>
                {!liveTrack
                  ? 'Start Live Tracking'
                  : isStreaming
                  ? 'Stop Streaming'
                  : 'Start Streaming'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Map and Control Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary, !liveTrack && styles.buttonDisabled]}
              onPress={handleOpenLiveMap}
              disabled={!liveTrack}
            >
              <Ionicons name="map-outline" size={20} color="#fff" />
              <Text style={styles.buttonText}>Open Public Map</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.buttonDanger]}
              onPress={handleResetLiveTrack}
              disabled={!liveTrack}
            >
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.buttonText}>Reset</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.buttonDanger]}
              onPress={handleEndLiveTrack}
              disabled={!liveTrack}
            >
              <Ionicons name="stop" size={20} color="#fff" />
              <Text style={styles.buttonText}>End</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Manual Input Section */}
        {showManualInput && (
          <View style={[styles.manualSection, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Manual Coordinates</Text>
            <View style={styles.inputRow}>
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Latitude</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.mode === 'dark' ? '#1a1a1a' : '#f5f5f5', borderColor: theme.colors.border, color: theme.colors.text }]}
                  value={manualLat}
                  onChangeText={setManualLat}
                  placeholder="-90 to 90"
                  keyboardType="numeric"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Longitude</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.mode === 'dark' ? '#1a1a1a' : '#f5f5f5', borderColor: theme.colors.border, color: theme.colors.text }]}
                  value={manualLon}
                  onChangeText={setManualLon}
                  placeholder="-180 to 180"
                  keyboardType="numeric"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>
            </View>
            <TouchableOpacity
              style={[styles.updateButton, { backgroundColor: '#4CAF50' }]}
              onPress={handleManualLocationUpdate}
            >
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.buttonText}>Update Location</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* CSV Export Section */}
        <View style={[styles.csvSection, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>📊 GPS Watch Recording</Text>
          <View style={{ marginBottom: 12 }}>
            <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
              Recorded: {recordedCoordinatesCount} coordinates
            </Text>
            <Text style={[styles.metaText, { color: theme.colors.textSecondary, fontSize: 12 }]}>
              Start &quot;Watch&quot; to log coordinates. Press Export to download as CSV.
            </Text>
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.buttonSuccess, recordedCoordinatesCount === 0 && styles.buttonDisabled]}
              onPress={handleExportCSV}
              disabled={recordedCoordinatesCount === 0}
            >
              <Ionicons name="download-outline" size={20} color="#fff" />
              <Text style={styles.buttonText}>Export CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonDanger, recordedCoordinatesCount === 0 && styles.buttonDisabled]}
              onPress={handleClearRecordedCoordinates}
              disabled={recordedCoordinatesCount === 0}
            >
              <Ionicons name="trash-outline" size={20} color="#fff" />
              <Text style={styles.buttonText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Wayfare Tracking Section */}
        {/* {showWayfare && (
          <View style={styles.wayfareSection}>
            <Text style={styles.cardTitle}>🛤️ Wayfare Tracking</Text>
            <View style={styles.wayfareStatus}>
              <Text style={styles.wayfareText}>
                Status: {wayfareTrack.meta.isRunning ? '🔴 Recording' : '⚫ Idle'}
              </Text>
              <Text style={styles.wayfareText}>
                Points: {wayfareTrack.meta.total}
              </Text>
              {wayfareDistance > 0 && (
                <Text style={styles.wayfareText}>
                  Distance: {wayfareDistance.toFixed(2)} km
                </Text>
              )}
              {wayfareTrack.meta.startedAt && (
                <Text style={styles.metaText}>
                  Started: {formatTimestamp(wayfareTrack.meta.startedAt)}
                </Text>
              )}
            </View>
            
            <TouchableOpacity
              style={[
                styles.button,
                wayfareTrack.meta.isRunning ? styles.buttonDanger : styles.buttonSuccess
              ]}
              onPress={handleToggleWayfare}
            >
              <Ionicons 
                name={wayfareTrack.meta.isRunning ? "stop" : "navigate"} 
                size={20} 
                color="#fff" 
              />
              <Text style={styles.buttonText}>
                {wayfareTrack.meta.isRunning ? 'Stop Tracking' : 'Start Tracking'}
              </Text>
            </TouchableOpacity> */}

            {/* Deep link Launcher for Web "Start Wayfare" button */}
            {/* <TouchableOpacity
              style={[styles.button, styles.buttonSecondary, { marginTop: 10 }]}
              onPress={openStartWayfareDeepLink}
            >
              <Ionicons name="link-outline" size={20} color="#fff" />
              <Text style={styles.buttonText}>Open start-wayfare link</Text>
            </TouchableOpacity>
          </View>
        )} */}

        {/* Clear Data Button */}
        <TouchableOpacity
          style={[styles.clearButton, { backgroundColor: theme.colors.danger }]}
          onPress={handleClearLocation}
        >
          <Ionicons name="trash" size={20} color="#fff" />
          <Text style={styles.buttonText}>Clear Location Data</Text>
        </TouchableOpacity>
      </View>

      {/* Auth Modal */}
      <AuthModal
        visible={authModalVisible}
        onSuccess={() => {
          setAuthModalVisible(false);
          // Re-trigger the unified handler now that user is authenticated
          handleLiveTrackingUnified();
        }}
        onCancel={() => setAuthModalVisible(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  locationCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  locationText: {
    fontSize: 16,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  metaText: {
    fontSize: 14,
    marginBottom: 2,
  },
  noLocationText: {
    fontSize: 16,
    fontStyle: 'italic',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonSecondary: {
    backgroundColor: '#666',
  },
  buttonSuccess: {
    backgroundColor: '#4CAF50',
  },
  buttonDanger: {
    backgroundColor: '#f44336',
  },
  buttonActive: {
    backgroundColor: '#ff9800',
  },
  buttonDisabled: {
    backgroundColor: '#333',
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  manualSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  inputContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  input: {
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  updateButton: {
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  wayfareSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  wayfareStatus: {
    marginBottom: 12,
  },
  wayfareText: {
    fontSize: 16,
    marginBottom: 4,
  },
  clearButton: {
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 20,
  },
  liveSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    marginTop: 8,
    borderWidth: 1,
  },
  csvSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
});