import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { clearToken } from '../../utils/auth';
import { GeoTaggingService } from '../../utils/geoTagging';

interface SettingsData {
  highAccuracy: boolean;
  autoWatch: boolean;
  saveWayfare: boolean;
  geohashPrecision: number;
}

const SETTINGS_KEY = 'catcha.settings';

export default function SettingsScreen() {
  const [settings, setSettings] = useState<SettingsData>({
    highAccuracy: true,
    autoWatch: false,
    saveWayfare: true,
    geohashPrecision: 10
  });

  const geoService = GeoTaggingService.getInstance();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem(SETTINGS_KEY);
      if (saved) {
        setSettings(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async (newSettings: SettingsData) => {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleToggle = (key: keyof SettingsData) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    saveSettings(newSettings);
  };

  const handleClearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all saved location data, wayfare tracks, and settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await geoService.clearSavedPosition();
              await geoService.clearWayfareTrack();
              await AsyncStorage.removeItem(SETTINGS_KEY);
              
              const defaultSettings = {
                highAccuracy: true,
                autoWatch: false,
                saveWayfare: true,
                geohashPrecision: 10
              };
              setSettings(defaultSettings);
              
              Alert.alert('Success', 'All data cleared successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear all data');
            }
          }
        }
      ]
    );
  };

  const handleExportData = async () => {
    try {
      const wayfareTrack = await geoService.getWayfareTrack();
      const currentLocation = await geoService.loadSavedPosition();
      
      const fileName = `catcha-export-${new Date().getTime()}.csv`;
      
      // Build CSV content - simple format with latitude, longitude, timestamp
      let csvContent = 'Latitude,Longitude,Timestamp\n';
      
      // Add current location
      if (currentLocation) {
        csvContent += `${currentLocation.latitude},${currentLocation.longitude},${new Date(currentLocation.timestamp).toISOString()}\n`;
      }
      
      // Add wayfare track points
      if (wayfareTrack && wayfareTrack.points.length > 0) {
        wayfareTrack.points.forEach((point: any) => {
          csvContent += `${point.latitude},${point.longitude},${new Date(point.timestamp).toISOString()}\n`;
        });
      }
      
      // Save to phone's file system using legacy API
      const docDir = FileSystem.documentDirectory;
      const cacheDir = FileSystem.cacheDirectory;
      
      console.log('📁 FILE SYSTEM PATHS:');
      console.log('documentDirectory:', docDir);
      console.log('cacheDirectory:', cacheDir);
      
      if (!docDir && !cacheDir) {
        throw new Error('No document or cache directory available');
      }
      
      const dirPath = `${docDir || cacheDir}Catcha/`;
      const filePath = `${dirPath}${fileName}`;
      
      console.log('📝 SAVE DETAILS:');
      console.log('dirPath:', dirPath);
      console.log('filePath:', filePath);
      
      // Create directory first, then write file
      try {
        console.log('Creating directory:', dirPath);
        await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
        console.log('✅ Directory created');
      } catch (dirError: any) {
        console.log('ℹ️ Directory note:', dirError.message);
      }
      
      // Write the file to cache (Expo's internal storage)
      console.log('Writing CSV file...');
      await FileSystem.writeAsStringAsync(filePath, csvContent);
      console.log('✅ File written successfully to:', filePath);
      
      // Verify file exists
      try {
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        console.log('✅ File verified - exists:', fileInfo.exists, 'uri:', fileInfo.uri);
      } catch (verifyError) {
        console.log('⚠️ Could not verify file:', verifyError);
      }
      
      // Share the file so user can save it to their device
      console.log('Opening share dialog...');
      try {
        await Sharing.shareAsync(filePath, {
          mimeType: 'text/csv',
          dialogTitle: 'Save CSV Export',
          UTI: 'public.comma-separated-values-text',
        });
        console.log('✅ Share dialog opened');
      } catch (shareError) {
        console.log('Share error:', shareError);
        Alert.alert(
          'Export Created ✅',
          `CSV file created!\n\nFile: ${fileName}\n\nPath:\n${filePath}\n\nYou can now copy this file from the Expo app's file storage.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', `Failed to export data: ${error}`);
    }
  };

  const handleCheckPermissions = async () => {
    const hasPermission = await geoService.requestPermissions();
    Alert.alert(
      'Location Permission',
      hasPermission 
        ? 'Location permissions are granted ✅' 
        : 'Location permissions are denied ❌\n\nPlease enable location access in your device settings to use geo-tagging features.',
      [{ text: 'OK' }]
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Clear your authentication token?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearToken();
              Alert.alert('Success', 'You have been logged out.');
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          }
        }
      ]
    );
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0f0f0f" />
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Ionicons name="settings" size={40} color="#1e90ff" />
            <View style={styles.headerText}>
              <Text style={styles.title}>Settings</Text>
              <Text style={styles.subtitle}>Manage your preferences</Text>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          {/* Location Settings Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="location" size={20} color="#1e90ff" />
              <Text style={styles.cardTitle}>Location</Text>
            </View>
            
            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>High Accuracy GPS</Text>
                <Text style={styles.settingDescription}>Best accuracy, more battery</Text>
              </View>
              <Switch
                value={settings.highAccuracy}
                onValueChange={() => handleToggle('highAccuracy')}
                trackColor={{ false: '#444', true: '#1e90ff' }}
                thumbColor={settings.highAccuracy ? '#fff' : '#ccc'}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Auto-Start Watch</Text>
                <Text style={styles.settingDescription}>Start on app open</Text>
              </View>
              <Switch
                value={settings.autoWatch}
                onValueChange={() => handleToggle('autoWatch')}
                trackColor={{ false: '#444', true: '#1e90ff' }}
                thumbColor={settings.autoWatch ? '#fff' : '#ccc'}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Save Wayfare Data</Text>
                <Text style={styles.settingDescription}>Track movement history</Text>
              </View>
              <Switch
                value={settings.saveWayfare}
                onValueChange={() => handleToggle('saveWayfare')}
                trackColor={{ false: '#444', true: '#ff9800' }}
                thumbColor={settings.saveWayfare ? '#fff' : '#ccc'}
              />
            </View>
          </View>

          {/* Permissions Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
              <Text style={styles.cardTitle}>Permissions</Text>
            </View>
            
            <View style={styles.divider} />

            <TouchableOpacity 
              style={styles.buttonSmall}
              onPress={handleCheckPermissions}
            >
              <Text style={styles.buttonSmallText}>Check Location Permissions</Text>
              <Ionicons name="chevron-forward" size={18} color="#aaa" />
            </TouchableOpacity>
          </View>

          {/* Data Management Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="download" size={20} color="#ff9800" />
              <Text style={styles.cardTitle}>Data</Text>
            </View>
            
            <View style={styles.divider} />

            <TouchableOpacity 
              style={styles.buttonSmall}
              onPress={handleExportData}
            >
              <Text style={styles.buttonSmallText}>Export Location Data</Text>
              <Ionicons name="chevron-forward" size={18} color="#aaa" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity 
              style={[styles.buttonSmall, styles.dangerButtonSmall]}
              onPress={handleClearAllData}
            >
              <Text style={styles.dangerButtonText}>Clear All Data</Text>
              <Ionicons name="chevron-forward" size={18} color="#f44336" />
            </TouchableOpacity>
          </View>

          {/* Account Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="log-out" size={20} color="#f44336" />
              <Text style={styles.cardTitle}>Account</Text>
            </View>
            
            <View style={styles.divider} />

            <TouchableOpacity 
              style={[styles.buttonSmall, styles.dangerButtonSmall]}
              onPress={handleLogout}
            >
              <Text style={styles.dangerButtonText}>Logout</Text>
              <Ionicons name="chevron-forward" size={18} color="#f44336" />
            </TouchableOpacity>
          </View>

          {/* App Info Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="information-circle" size={20} color="#9c27b0" />
              <Text style={styles.cardTitle}>About</Text>
            </View>
            
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Geohash Precision</Text>
              <Text style={styles.infoValue}>{settings.geohashPrecision}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Location Sources</Text>
              <Text style={styles.infoValue}>GPS, Network, Manual</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Data Storage</Text>
              <Text style={styles.infoValue}>Local Device</Text>
            </View>
          </View>

          <View style={styles.spacer} />
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 30,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#aaa',
  },
  content: {
    padding: 16,
    paddingTop: 24,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  divider: {
    height: 1,
    backgroundColor: '#2a2a2a',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: '#888',
  },
  buttonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  buttonSmallText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
  },
  dangerButtonSmall: {
    backgroundColor: 'rgba(244, 67, 54, 0.05)',
  },
  dangerButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#f44336',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
  },
  infoValue: {
    fontSize: 13,
    color: '#888',
    fontFamily: 'monospace',
  },
  spacer: {
    height: 20,
  },
});
