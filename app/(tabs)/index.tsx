import { useState } from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { GeoTaggingComponent } from '../../components/GeoTaggingComponent';
import { LocationData } from '../../utils/geoTagging';
import { useTheme } from '../../utils/ThemeContext';

export default function Index() {
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const { theme } = useTheme();

  const handleLocationChange = (location: LocationData | null) => {
    setCurrentLocation(location);
    // You can use this location data for your app's functionality
    console.log('Location updated:', location);
  };

  return (
    <>
      <StatusBar 
        barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} 
        backgroundColor={theme.colors.background} 
      />
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Catcha Geo-Tagging</Text>
        <Text style={[styles.subtitle, { color: theme.colors.primary }]}>Fish Catch Analysis System</Text>
        
        <GeoTaggingComponent
          onLocationChange={handleLocationChange}
          showWayfare={true}
          showManualInput={true}
        />
        
        {currentLocation && (
          <View style={[styles.quickInfo, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.quickInfoText, { color: '#4CAF50' }]}>
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
    paddingTop: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  quickInfo: {
    borderRadius: 8,
    padding: 12,
    margin: 16,
    marginTop: 8,
  },
  quickInfoText: {
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
});
