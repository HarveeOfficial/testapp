# Catcha Geo-Tagging Implementation

A comprehensive geo-tagging system for fish catch analysis, implementing advanced location tracking techniques from the Catcha thesis research.

## Features

### 🎯 Core Geo-Tagging
- **High-precision GPS location detection** - Get accurate coordinates using device GPS
- **Real-time location watching** - Continuously monitor location changes
- **Geohash encoding** - Generate location hashes for efficient indexing and privacy
- **Location accuracy indicators** - Display GPS accuracy information
- **Multiple location sources** - GPS, network, and manual input support

### 🛤️ Wayfare Tracking System
- **Continuous movement tracking** - Record detailed movement paths
- **Distance calculation** - Compute total travel distance using Haversine formula
- **Waypoint management** - Store and manage location waypoints
- **Trip analysis** - Detailed movement analysis with timestamps
- **Offline persistence** - All tracking data stored locally

### 💾 Data Management
- **Local storage** - All data stored securely on device using AsyncStorage
- **Offline capability** - Works without internet connection
- **Data export** - Export location and wayfare data
- **Privacy-focused** - No data sent to external servers
- **Data clearing** - Complete data removal options

### ⚙️ Configuration Options
- **High accuracy mode** - Toggle between GPS and network location
- **Auto-start tracking** - Automatically begin location watching
- **Wayfare preferences** - Configure movement tracking settings
- **Permission management** - Handle location permission requests

## Technical Implementation

### Location Services
- **expo-location** - Native location services integration
- **High accuracy positioning** - GPS-first approach with network fallback
- **Background location tracking** - Continuous position monitoring
- **Location permission handling** - Proper permission flow implementation

### Data Structures

```typescript
interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  source: 'gps' | 'network' | 'click' | 'drag' | 'watch';
  timestamp: number;
  geohash: string;
}

interface WayfarePoint extends LocationData {
  id: string;
}

interface WayfareMeta {
  startedAt: number | null;
  stoppedAt: number | null;
  total: number;
  isRunning: boolean;
}
```

### Key Algorithms

#### Geohash Encoding
Implements the standard geohash algorithm for location encoding:
- Base32 character encoding
- Configurable precision (default: 10 characters)
- Interleaved latitude/longitude bits
- Efficient spatial indexing capability

#### Haversine Distance Calculation
Accurate distance calculation between two coordinates:
- Accounts for Earth's spherical shape
- Returns distance in meters
- Used for wayfare distance totals

### Storage Architecture
- **Current Position**: `catcha.position.current`
- **Wayfare Track**: `catcha.wayfare.track`
- **Wayfare Metadata**: `catcha.wayfare.meta`
- **App Settings**: `catcha.settings`

## Screen Overview

### 🏠 Home Screen
- Overview of current location status
- Quick access to geo-tagging component
- Real-time location display

### 🎣 Catch Recording Screen
- Complete catch recording form
- Integrated geo-tagging functionality
- Location validation and display
- Wayfare data integration

### ℹ️ About Screen
- Feature overview and descriptions
- Academic research context
- Privacy and data handling information

### ⚙️ Settings Screen
- Location accuracy preferences
- Auto-tracking configuration
- Data management tools
- Permission status checking

## Usage Examples

### Basic Location Detection
```typescript
const geoService = GeoTaggingService.getInstance();
const location = await geoService.getCurrentLocation();
```

### Start Location Watching
```typescript
const success = await geoService.startLocationWatch((location) => {
  console.log('New location:', location);
});
```

### Wayfare Tracking
```typescript
// Start tracking
await geoService.startWayfareTracking();

// Get tracking summary
const summary = await geoService.getWayfareSummary();
console.log(summary); // "2.5 km (15 pts)"
```

### Data Export
```typescript
const track = await geoService.getWayfareTrack();
const currentLocation = await geoService.loadSavedPosition();

const exportData = {
  currentLocation,
  wayfareTrack: track,
  exportedAt: new Date().toISOString()
};
```

## Installation

1. **Install Dependencies**:
   ```bash
   npm install expo-location @react-native-async-storage/async-storage
   ```

2. **Add Permissions** (for production apps):
   ```json
   // app.json
   {
     "expo": {
       "plugins": [
         [
           "expo-location",
           {
             "locationWhenInUsePermission": "Show current location for fish catch recording."
           }
         ]
       ]
     }
   }
   ```

3. **Import Components**:
   ```typescript
   import { GeoTaggingComponent } from './components/GeoTaggingComponent';
   import { GeoTaggingService } from './utils/geoTagging';
   ```

## Academic Research Context

This implementation is based on the **Catcha: Fish Catch Analysis** thesis research, which explores:
- Advanced geo-tagging techniques for fisheries research
- Location-based catch analysis methodologies
- Offline-capable data collection systems
- Privacy-preserving location tracking

The system maintains scientific rigor while providing practical functionality for field research and recreational fishing applications.

## Privacy & Security

- ✅ **Local-first storage** - All data remains on device
- ✅ **No external tracking** - No location data sent to servers
- ✅ **User-controlled data** - Complete control over data lifecycle
- ✅ **Transparent permissions** - Clear permission requests and usage
- ✅ **Secure storage** - Encrypted local storage via AsyncStorage

## Future Enhancements

- 🗺️ **Map integration** - Visual location and wayfare display
- 📊 **Advanced analytics** - Statistical analysis of movement patterns
- 🌐 **Optional cloud sync** - Secure backup and synchronization
- 📱 **Cross-platform support** - Extended device compatibility
- 🔄 **Data migration** - Import/export with other fishing apps

## License

Developed for academic research and fish catch analysis applications.