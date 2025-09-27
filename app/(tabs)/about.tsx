import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import React from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';

export default function AboutScreen() {
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#25292e" />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>🎣 Catcha</Text>
          <Text style={styles.subtitle}>Fish Catch Analysis System</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="location" size={24} color="#1e90ff" /> Geo-Tagging Features
            </Text>
            <View style={styles.featureList}>
              <Text style={styles.featureItem}>📍 High-precision GPS location detection</Text>
              <Text style={styles.featureItem}>🔄 Real-time location watching and tracking</Text>
              <Text style={styles.featureItem}>🔗 Geohash encoding for location indexing</Text>
              <Text style={styles.featureItem}>🛤️ Wayfare tracking for movement analysis</Text>
              <Text style={styles.featureItem}>💾 Offline location data persistence</Text>
              <Text style={styles.featureItem}>✏️ Manual coordinate input capability</Text>
              <Text style={styles.featureItem}>📊 Location accuracy indicators</Text>
              <Text style={styles.featureItem}>📈 Distance calculation and trip analysis</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="fish" size={24} color="#4CAF50" /> Catch Recording
            </Text>
            <Text style={styles.description}>
              Record detailed information about your fish catches including species, weight, length, 
              and notes, all automatically tagged with precise location data for comprehensive analysis.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="navigate" size={24} color="#ff9800" /> Wayfare System
            </Text>
            <Text style={styles.description}>
              The wayfare tracking system continuously monitors your movement, creating a detailed 
              track of your fishing journey. This includes total distance traveled, number of 
              waypoints, and timing information for comprehensive trip analysis.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="shield-checkmark" size={24} color="#9c27b0" /> Data Privacy
            </Text>
            <Text style={styles.description}>
              All location data is stored locally on your device and only used for catch analysis. 
              Your location information remains private and under your control at all times.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="school" size={24} color="#e91e63" /> Academic Research
            </Text>
            <Text style={styles.description}>
              This application is based on the Catcha thesis research for fish catch analysis, 
              implementing advanced geo-tagging techniques for scientific data collection and 
              fisheries research applications.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Developed for Fish Catch Analysis Research
          </Text>
          <Text style={styles.version}>Version {version}</Text>
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
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#1e90ff',
    marginBottom: 10,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  description: {
    fontSize: 16,
    color: '#aaa',
    lineHeight: 24,
  },
  featureList: {
    paddingLeft: 8,
  },
  featureItem: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 8,
    lineHeight: 22,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#444',
    marginTop: 20,
  },
  footerText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  version: {
    fontSize: 14,
    color: '#444',
  },
});
