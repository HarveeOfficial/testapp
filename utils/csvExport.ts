import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { LocationData } from './geoTagging';

const WATCH_COORDINATES_KEY = 'catcha.watch.coordinates';

export interface WatchCoordinate extends LocationData {
  recordedAt: number;
  province?: string;
  municipality?: string;
  value?: number;
}

export class CSVExportService {
  private static instance: CSVExportService;

  static getInstance(): CSVExportService {
    if (!CSVExportService.instance) {
      CSVExportService.instance = new CSVExportService();
    }
    return CSVExportService.instance;
  }

  // Record a coordinate during watch
  async recordWatchCoordinate(location: LocationData): Promise<void> {
    try {
      const existing = await this.getWatchCoordinates();
      const coordinate: WatchCoordinate = {
        ...location,
        recordedAt: Date.now(),
      };
      existing.push(coordinate);
      await AsyncStorage.setItem(WATCH_COORDINATES_KEY, JSON.stringify(existing));
    } catch (error) {
      console.error('Error recording watch coordinate:', error);
    }
  }

  // Get all recorded coordinates
  async getWatchCoordinates(): Promise<WatchCoordinate[]> {
    try {
      const data = await AsyncStorage.getItem(WATCH_COORDINATES_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting watch coordinates:', error);
      return [];
    }
  }

  // Clear all recorded coordinates
  async clearWatchCoordinates(): Promise<void> {
    try {
      await AsyncStorage.removeItem(WATCH_COORDINATES_KEY);
    } catch (error) {
      console.error('Error clearing watch coordinates:', error);
    }
  }

  // Get count of recorded coordinates
  async getWatchCoordinatesCount(): Promise<number> {
    try {
      const coords = await this.getWatchCoordinates();
      return coords.length;
    } catch (error) {
      console.error('Error getting watch coordinates count:', error);
      return 0;
    }
  }

  // Generate CSV content from coordinates
  private generateCSVContent(coordinates: WatchCoordinate[]): string {
    if (coordinates.length === 0) {
      return 'latitude,longitude,Province,Municipality,Value\n';
    }

    const headers = ['latitude', 'longitude', 'Province', 'Municipality', 'Value'];
    const rows = coordinates.map(coord => [
      coord.latitude.toString(),
      coord.longitude.toString(),
      coord.province || 'Cagayan',
      coord.municipality || 'Aparri',
      (coord.value ?? 80).toString(),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        // Escape cells containing commas, quotes, or newlines
        if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(',')),
    ].join('\n');

    return csv;
  }

  // Export coordinates as CSV file and share
  async exportAsCSV(): Promise<boolean> {
    try {
      const coordinates = await this.getWatchCoordinates();
      
      if (coordinates.length === 0) {
        throw new Error('No coordinates to export');
      }

      const csvContent = this.generateCSVContent(coordinates);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const fileName = `catcha-coordinates-${timestamp}.csv`;
      
      // Use the legacy API which works better with permissions
      const documentDir = `${FileSystemLegacy.documentDirectory}`;
      const filePath = `${documentDir}${fileName}`;
      
      await FileSystemLegacy.writeAsStringAsync(filePath, csvContent, {
        encoding: FileSystemLegacy.EncodingType.UTF8,
      });

      // Share the file
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Coordinates',
        });
      } else {
        console.warn('Sharing not available on this platform');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error exporting CSV:', error);
      throw error;
    }
  }

  // Export coordinates as CSV string (for testing or alternative use)
  async getCSVString(): Promise<string> {
    try {
      const coordinates = await this.getWatchCoordinates();
      return this.generateCSVContent(coordinates);
    } catch (error) {
      console.error('Error getting CSV string:', error);
      return '';
    }
  }
}
