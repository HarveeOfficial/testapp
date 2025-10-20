# CSV Export Format Update

## Changes Made

Updated the CSV export format to include geographic and administrative data instead of technical GPS metadata.

### Old Format (Removed)
```csv
latitude,longitude,accuracy,source,timestamp,recordedAt,geohash
37.234569,-122.456789,10.5,watch,1697838000000,1697838010000,9q9h7d5d5j
```

**Removed Columns:**
- `accuracy`: GPS accuracy in meters
- `source`: Data source (watch, gps, etc.)
- `timestamp`: Original timestamp
- `recordedAt`: Recording timestamp
- `geohash`: Geohash encoding

### New Format
```csv
latitude,longitude,Province,Municipality,Value
37.234569,-122.456789,Cagayan,Aparri,80
17.234570,-122.456790,Cagayan,Aparri,80
```

**New Columns:**
- `latitude`: GPS latitude coordinate
- `longitude`: GPS longitude coordinate
- `Province`: Administrative province (default: "Cagayan")
- `Municipality`: Administrative municipality (default: "Aparri")
- `Value`: Data value (default: 80)

## Implementation Details

### WatchCoordinate Interface Updated
```typescript
export interface WatchCoordinate extends LocationData {
  recordedAt: number;
  province?: string;        // New field
  municipality?: string;    // New field
  value?: number;          // New field
}
```

### Default Values
When recording coordinates, if not explicitly set:
- **Province**: "Cagayan"
- **Municipality**: "Aparri"
- **Value**: 80

### CSV Generation Logic
```typescript
const rows = coordinates.map(coord => [
  coord.latitude.toString(),
  coord.longitude.toString(),
  coord.province || 'Cagayan',      // Uses default if not set
  coord.municipality || 'Aparri',   // Uses default if not set
  (coord.value ?? 80).toString(),   // Uses default if not set
]);
```

## Usage Example

### Recording a coordinate with custom values:
```typescript
const coordinate: WatchCoordinate = {
  latitude: 17.234569,
  longitude: 121.456789,
  source: 'watch',
  timestamp: Date.now(),
  geohash: '...',
  recordedAt: Date.now(),
  province: 'Isabela',        // Optional: custom province
  municipality: 'San Mariano', // Optional: custom municipality
  value: 95,                  // Optional: custom value
};
```

### Recording without custom values (uses defaults):
```typescript
const coordinate: WatchCoordinate = {
  latitude: 17.234569,
  longitude: 121.456789,
  source: 'watch',
  timestamp: Date.now(),
  geohash: '...',
  recordedAt: Date.now(),
  // Province, Municipality, Value will use defaults
};
```

### Exported CSV output:
```csv
latitude,longitude,Province,Municipality,Value
17.234569,121.456789,Cagayan,Aparri,80
17.234570,121.456790,Cagayan,Aparri,80
17.234571,121.456791,Isabela,San Mariano,95
```

## File Structure

### Modified File: `utils/csvExport.ts`
- Updated `WatchCoordinate` interface with new optional fields
- Modified `generateCSVContent()` method to use new columns
- Default values applied when fields not provided
- CSV header updated to: `latitude,longitude,Province,Municipality,Value`

## Code Quality
- ✅ TypeScript compilation: PASS
- ✅ ESLint: PASS (0 errors)
- ✅ Backward compatible with existing data
- ✅ Default values ensure smooth operation

## Migration Notes

If you have existing recorded coordinates in storage:
1. **Old format**: Will still work (undefined fields default to defaults)
2. **New fields**: Can be updated in the future
3. **No breaking changes**: Existing exports will include default values

## Example Scenarios

### Scenario 1: Default behavior (current)
```
Start Watch → Records coordinates
All coordinates get: Province=Cagayan, Municipality=Aparri, Value=80
Export CSV → Shows all with defaults
```

### Scenario 2: Custom values (future enhancement)
```
Set province/municipality/value in UI → User input
Record coordinates with custom values
Export CSV → Shows custom values
```

## Future Enhancements
- Add UI inputs for Province, Municipality, and Value
- Save preferences for default values
- Support multiple provinces/municipalities in single session
- Validation against list of valid provinces/municipalities
