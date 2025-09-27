import { useState } from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { GeoTaggingComponent } from '../../components/GeoTaggingComponent';
import { LocationData } from '../../utils/geoTagging';

export default function Index() {
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);

  const handleLocationChange = (location: LocationData | null) => {
    setCurrentLocation(location);
    // You can use this location data for your app's functionality
    console.log('Location updated:', location);
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#25292e" />
      <View style={styles.container}>
        <Text style={styles.title}>Catcha Geo-Tagging</Text>
        <Text style={styles.subtitle}>Fish Catch Analysis System</Text>
        
        <GeoTaggingComponent
          onLocationChange={handleLocationChange}
          showWayfare={true}
          showManualInput={true}
        />
        
        {currentLocation && (
          <View style={styles.quickInfo}>
            <Text style={styles.quickInfoText}>
              📍 Active Location: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
            </Text>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#25292e',
    paddingTop: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#1e90ff',
    textAlign: 'center',
    marginBottom: 20,
  },
  quickInfo: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    margin: 16,
    marginTop: 8,
  },
  quickInfoText: {
    color: '#4CAF50',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
});
