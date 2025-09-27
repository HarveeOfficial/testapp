import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
      
      const exportData = {
        currentLocation,
        wayfareTrack,
        settings,
        exportedAt: new Date().toISOString()
      };

      // In a real app, you would implement actual export functionality
      console.log('Export Data:', JSON.stringify(exportData, null, 2));
      
      Alert.alert(
        'Data Export',
        'Location and wayfare data has been logged to console. In a production app, this would be exported to a file or cloud service.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to export data');
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

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#25292e" />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>⚙️ Settings</Text>
          <Text style={styles.subtitle}>Configure Geo-Tagging Options</Text>
        </View>

        <View style={styles.content}>
          {/* Location Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="location" size={24} color="#1e90ff" /> Location Settings
            </Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>High Accuracy GPS</Text>
                <Text style={styles.settingDescription}>
                  Use GPS for best accuracy (uses more battery)
                </Text>
              </View>
              <Switch
                value={settings.highAccuracy}
                onValueChange={() => handleToggle('highAccuracy')}
                trackColor={{ false: '#444', true: '#1e90ff' }}
                thumbColor={settings.highAccuracy ? '#fff' : '#ccc'}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Auto-Start Location Watch</Text>
                <Text style={styles.settingDescription}>
                  Automatically start watching location when app opens
                </Text>
              </View>
              <Switch
                value={settings.autoWatch}
                onValueChange={() => handleToggle('autoWatch')}
                trackColor={{ false: '#444', true: '#1e90ff' }}
                thumbColor={settings.autoWatch ? '#fff' : '#ccc'}
              />
            </View>
          </View>

          {/* Wayfare Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="navigate" size={24} color="#ff9800" /> Wayfare Settings
            </Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Save Wayfare Data</Text>
                <Text style={styles.settingDescription}>
                  Automatically save movement tracking data
                </Text>
              </View>
              <Switch
                value={settings.saveWayfare}
                onValueChange={() => handleToggle('saveWayfare')}
                trackColor={{ false: '#444', true: '#1e90ff' }}
                thumbColor={settings.saveWayfare ? '#fff' : '#ccc'}
              />
            </View>
          </View>

          {/* Data Management */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="server" size={24} color="#4CAF50" /> Data Management
            </Text>
            
            <TouchableOpacity style={styles.actionButton} onPress={handleCheckPermissions}>
              <Ionicons name="shield-checkmark" size={20} color="#1e90ff" />
              <Text style={styles.actionButtonText}>Check Location Permissions</Text>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleExportData}>
              <Ionicons name="download" size={20} color="#4CAF50" />
              <Text style={styles.actionButtonText}>Export Location Data</Text>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.dangerButton} onPress={handleClearAllData}>
              <Ionicons name="trash" size={20} color="#f44336" />
              <Text style={styles.dangerButtonText}>Clear All Data</Text>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* App Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="information-circle" size={24} color="#9c27b0" /> App Information
            </Text>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Geohash Precision</Text>
              <Text style={styles.infoValue}>{settings.geohashPrecision} characters</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Location Sources</Text>
              <Text style={styles.infoValue}>GPS, Network, Manual Input</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Data Storage</Text>
              <Text style={styles.infoValue}>Local Device Only</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#25292e',
  },
  header: {
    padding: 20,
    paddingTop: 50,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#1e90ff',
    marginBottom: 10,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#aaa',
    lineHeight: 18,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginLeft: 12,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3a2a2a',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  dangerButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#f44336',
    marginLeft: 12,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  infoValue: {
    fontSize: 16,
    color: '#aaa',
    fontFamily: 'monospace',
  },
});
