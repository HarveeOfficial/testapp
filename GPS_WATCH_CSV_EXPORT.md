# GPS Watch Recording & CSV Export Feature

## Overview
This feature allows you to record GPS coordinates during a "Watch" session and export them as a CSV file for analysis or backup.

## How It Works

### Recording Coordinates
1. Navigate to the GeoTagging component
2. Click **"Start Watch"** button
3. The app will begin recording your location coordinates in real-time
4. Each location update is automatically saved to local storage with timestamp

### CSV Export
1. While watching or after stopping, find the **"📊 GPS Watch Recording"** section
2. You'll see the count of recorded coordinates displayed
3. Click **"Export CSV"** button to:
   - Generate a CSV file with all recorded coordinates
   - Open the share dialog to save/export the file
4. The CSV includes these columns:
   - `latitude`: GPS latitude
   - `longitude`: GPS longitude
   - `accuracy`: GPS accuracy in meters
   - `source`: Data source (e.g., 'watch', 'gps')
   - `timestamp`: Original timestamp when the location was detected
   - `recordedAt`: Timestamp when the coordinate was logged during watch
   - `geohash`: Geohash encoding of the coordinates

### Managing Recorded Data
- **Clear Button**: Delete all recorded coordinates from storage
- The counter shows how many coordinates are currently recorded
- Data persists across app sessions until manually cleared

## File Structure

### New/Modified Files

#### `utils/csvExport.ts` (New)
- **CSVExportService**: Singleton service for managing CSV operations
- **Methods**:
  - `recordWatchCoordinate()`: Add a location to the recording
  - `getWatchCoordinates()`: Retrieve all recorded coordinates
  - `exportAsCSV()`: Generate and share CSV file
  - `clearWatchCoordinates()`: Clear all recorded data
  - `getWatchCoordinatesCount()`: Get count of recorded coordinates
  - `getCSVString()`: Get CSV content as string

#### `components/GeoTaggingComponent.tsx` (Modified)
- Added CSV service integration
- Added `recordedCoordinatesCount` state to track recorded coordinates
- Modified `handleToggleWatch()` to record coordinates during watch
- Added `handleExportCSV()` to trigger CSV export
- Added `handleClearRecordedCoordinates()` to clear stored coordinates
- Added new UI section showing GPS Watch Recording status and buttons
- New styles: `csvSection`

## Storage
- Coordinates are stored in AsyncStorage under the key: `'catcha.watch.coordinates'`
- Each recorded coordinate includes the original LocationData plus a `recordedAt` timestamp
- Data is persistent and survives app restarts

## CSV File Naming
Files are exported with the naming pattern:
- `catcha-coordinates-YYYY-MM-DD.csv`

Example: `catcha-coordinates-2025-10-20.csv`

## Usage Example

### Flow:
1. Start watch → GPS coordinates begin recording
2. Walk/move around for desired duration
3. Stop watch when done
4. Open GPS Watch Recording section
5. Click "Export CSV" to share the file
6. File can be opened in Excel, Google Sheets, or any CSV viewer

### Output Format:
```csv
latitude,longitude,accuracy,source,timestamp,recordedAt,geohash
37.234569,-122.456789,10.5,watch,1697838000000,1697838010000,9q9h7d5d5j
37.234570,-122.456790,10.3,watch,1697838005000,1697838015000,9q9h7d5d5j
...
```

## Technical Details

### Dependencies Used
- `expo-file-system`: For file writing operations
- `expo-sharing`: For share dialog functionality
- `react-native-async-storage`: For persistent storage

### How Recording Works
1. When watch is started, the callback function records each location
2. CSVExportService stores each location in AsyncStorage as an array
3. Each item in the array is a `WatchCoordinate` which extends `LocationData` with `recordedAt` timestamp
4. When export is triggered, the array is converted to CSV format with proper escaping

### CSV Generation
- Headers are automatically included
- Cells containing commas, quotes, or newlines are properly escaped with quotes
- Double quotes are escaped as `""`
- Numbers are converted to strings for consistency

## Permissions Required
- Location permissions (already required by existing watch functionality)
- File system access (already included in Expo)
- Share permissions (system-level, handled by Expo)
