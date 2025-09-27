import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Alert,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { GeoTaggingComponent } from '../../components/GeoTaggingComponent';
import { createCatch } from '../../utils/api';
import { GeoTaggingService, LocationData } from '../../utils/geoTagging';

interface CatchRecord {
  id: string;
  species: string;
  weight: string;
  length: string;
  notes: string;
  location: LocationData | null;
  wayfareData?: string;
  timestamp: number;
}

export default function CatchScreen() {
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [species, setSpecies] = useState('');
  const [weight, setWeight] = useState('');
  const [length, setLength] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const geoService = GeoTaggingService.getInstance();

  const handleLocationChange = (location: LocationData | null) => {
    setCurrentLocation(location);
  };

  const handleSubmitCatch = async () => {
    if (!species.trim()) {
      Alert.alert('Missing Information', 'Please enter the fish species');
      return;
    }

    if (!currentLocation) {
      Alert.alert('Missing Location', 'Please capture your current location first');
      return;
    }

    setIsSubmitting(true);

    try {
  // Get wayfare data for this catch
  const wayfareTrack = await geoService.getWayfareTrack();
  const wayfareSummary = await geoService.getWayfareSummary();
      
      const catchRecord: CatchRecord = {
        id: `catch_${Date.now()}`,
        species: species.trim(),
        weight: weight.trim(),
        length: length.trim(),
        notes: notes.trim(),
        location: currentLocation,
        wayfareData: wayfareSummary,
        timestamp: Date.now()
      };

      // Send to backend (Laravel) API
      const payload = {
        caught_at: new Date().toISOString(),
        species_name: species.trim(),
        weight_kg: weight ? parseFloat(weight) : null,
        length_cm: length ? parseFloat(length) : null,
        notes: notes.trim() || null,
        location_label: null,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        geohash: currentLocation.geohash,
        geo_source: currentLocation.source,
        geo_accuracy_m: currentLocation.accuracy ?? null,
        environmental_data: {
          wayfare_track_json: wayfareTrack,
          wayfare_summary: wayfareSummary,
        },
      } as const;

      const result = await createCatch(payload);
      if (!result.ok) {
        throw new Error(result.error || `API error (${result.status})`);
      }

      Alert.alert(
        'Catch Recorded! 🎣',
        `Successfully recorded ${species} catch with location data:\n\n` +
        `📍 Location: ${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}\n` +
        `🔗 Geohash: ${currentLocation.geohash}\n` +
        `🛤️ Wayfare: ${wayfareSummary}\n` +
        `📡 Accuracy: ${currentLocation.accuracy ? `±${currentLocation.accuracy.toFixed(0)}m` : 'Unknown'}`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Clear form
              setSpecies('');
              setWeight('');
              setLength('');
              setNotes('');
            }
          }
        ]
      );

    } catch (error) {
      console.error('Error submitting catch:', error);
      Alert.alert('Error', 'Failed to record catch. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#25292e" />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>🎣 Record Catch</Text>
          <Text style={styles.subtitle}>Catcha Fish Analysis System</Text>
        </View>

        {/* Geo-Tagging Component */}
        <GeoTaggingComponent
          onLocationChange={handleLocationChange}
          showWayfare={true}
          showManualInput={true}
        />

        {/* Catch Recording Form */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Catch Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Species <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={species}
              onChangeText={setSpecies}
              placeholder="e.g., Bass, Tuna, Salmon"
              placeholderTextColor="#666"
              returnKeyType="next"
            />
          </View>

          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.inputLabel}>Weight (kg)</Text>
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                placeholder="0.0"
                placeholderTextColor="#666"
                keyboardType="decimal-pad"
                returnKeyType="next"
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.inputLabel}>Length (cm)</Text>
              <TextInput
                style={styles.input}
                value={length}
                onChangeText={setLength}
                placeholder="0.0"
                placeholderTextColor="#666"
                keyboardType="decimal-pad"
                returnKeyType="next"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Additional observations, bait used, conditions, etc."
              placeholderTextColor="#666"
              multiline={true}
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Location Status */}
          {currentLocation && (
            <View style={styles.locationStatus}>
              <Text style={styles.statusTitle}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" /> Location Captured
              </Text>
              <Text style={styles.statusText}>
                📍 {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
              </Text>
              <Text style={styles.statusSubtext}>
                Source: {currentLocation.source.toUpperCase()}
                {currentLocation.accuracy && ` • Accuracy: ±${currentLocation.accuracy.toFixed(0)}m`}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.submitButton,
              (!species.trim() || !currentLocation || isSubmitting) && styles.submitButtonDisabled
            ]}
            onPress={handleSubmitCatch}
            disabled={!species.trim() || !currentLocation || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Ionicons name="hourglass" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Recording...</Text>
              </>
            ) : (
              <>
                <Ionicons name="save" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Record Catch</Text>
              </>
            )}
          </TouchableOpacity>
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
  formSection: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
  },
  inputLabel: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 6,
    fontWeight: '500',
  },
  required: {
    color: '#f44336',
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 14,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#444',
  },
  textArea: {
    minHeight: 80,
  },
  locationStatus: {
    backgroundColor: '#2a4a2a',
    borderRadius: 8,
    padding: 16,
    marginVertical: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 14,
    color: '#fff',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  statusSubtext: {
    fontSize: 12,
    color: '#aaa',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#333',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});