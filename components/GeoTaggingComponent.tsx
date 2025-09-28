import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as ExpoLinking from 'expo-linking';
import React, { useCallback, useEffect, useState } from 'react';
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
import { GeoTaggingService, LocationData, WayfareTrack } from '../utils/geoTagging';

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

  const geoService = GeoTaggingService.getInstance();

  // Load saved position on mount
  useEffect(() => {
    loadSavedPosition();
    loadWayfareData();
  }, []);

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
    } else {
      const success = await geoService.startLocationWatch((location) => {
        setCurrentLocation(location);
        setManualLat(location.latitude.toFixed(6));
        setManualLon(location.longitude.toFixed(6));
      });
      
      if (success) {
        setIsWatching(true);
      } else {
        Alert.alert('Error', 'Could not start location watching. Please check permissions.');
      }
    }
  }, [isWatching]);

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
  }, [manualLat, manualLon]);

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
  }, [currentLocation]);

  const formatAccuracy = (accuracy?: number): string => {
    if (!accuracy) return '';
    return accuracy < 1000 ? `±${accuracy.toFixed(0)}m` : `±${(accuracy/1000).toFixed(1)}km`;
  };

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  const openStartWayfareDeepLink = useCallback(() => {
    // testapp://start-wayfare is based on app.json expo.scheme
    const scheme = (Constants.expoConfig?.scheme as string) || 'testapp';
    const url = ExpoLinking.createURL('start-wayfare');
    Linking.openURL(url).catch(() => {
      Alert.alert('Open failed', 'Could not open the deep link.');
    });
  }, []);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📍 Geo-Tagging</Text>
        
        {/* Current Location Display */}
        <View style={styles.locationCard}>
          <Text style={styles.cardTitle}>Current Location</Text>
          {currentLocation ? (
            <View>
              <Text style={styles.locationText}>
                📍 {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
              </Text>
              <Text style={styles.metaText}>
                🔗 Geohash: {currentLocation.geohash}
              </Text>
              <Text style={styles.metaText}>
                📡 Source: {currentLocation.source.toUpperCase()}
                {currentLocation.accuracy && ` ${formatAccuracy(currentLocation.accuracy)}`}
              </Text>
              <Text style={styles.metaText}>
                🕒 {formatTimestamp(currentLocation.timestamp)}
              </Text>
            </View>
          ) : (
            <Text style={styles.noLocationText}>No location data available</Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, isDetecting && styles.buttonDisabled]}
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

        {/* Manual Input Section */}
        {showManualInput && (
          <View style={styles.manualSection}>
            <Text style={styles.cardTitle}>Manual Coordinates</Text>
            <View style={styles.inputRow}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Latitude</Text>
                <TextInput
                  style={styles.input}
                  value={manualLat}
                  onChangeText={setManualLat}
                  placeholder="-90 to 90"
                  keyboardType="numeric"
                  placeholderTextColor="#666"
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Longitude</Text>
                <TextInput
                  style={styles.input}
                  value={manualLon}
                  onChangeText={setManualLon}
                  placeholder="-180 to 180"
                  keyboardType="numeric"
                  placeholderTextColor="#666"
                />
              </View>
            </View>
            <TouchableOpacity
              style={styles.updateButton}
              onPress={handleManualLocationUpdate}
            >
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.buttonText}>Update Location</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Wayfare Tracking Section */}
        {showWayfare && (
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
            </TouchableOpacity>

            {/* Deep link Launcher for Web "Start Wayfare" button */}
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary, { marginTop: 10 }]}
              onPress={openStartWayfareDeepLink}
            >
              <Ionicons name="link-outline" size={20} color="#fff" />
              <Text style={styles.buttonText}>Open start-wayfare link</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Clear Data Button */}
        <TouchableOpacity
          style={styles.clearButton}
          onPress={handleClearLocation}
        >
          <Ionicons name="trash" size={20} color="#fff" />
          <Text style={styles.buttonText}>Clear Location Data</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  locationCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  locationText: {
    fontSize: 16,
    color: '#4CAF50',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  metaText: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 2,
  },
  noLocationText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    backgroundColor: '#1e90ff',
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
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  manualSection: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
    color: '#aaa',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 6,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#444',
  },
  updateButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  wayfareSection: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  wayfareStatus: {
    marginBottom: 12,
  },
  wayfareText: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 4,
  },
  clearButton: {
    backgroundColor: '#f44336',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
});