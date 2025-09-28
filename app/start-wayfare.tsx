import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GeoTaggingService } from '../utils/geoTagging';

export default function StartWayfare() {
  const router = useRouter();
  const params = useLocalSearchParams<{ returnUrl?: string }>();
  const [status, setStatus] = useState<'idle'|'starting'|'running'|'error'>('starting');
  const [message, setMessage] = useState<string>('Starting wayfare…');

  useEffect(() => {
    const run = async () => {
      try {
        const ok = await GeoTaggingService.getInstance().startWayfareTracking();
        if (ok) {
          setStatus('running');
          setMessage('Wayfare tracking started');
          // Optionally bounce back to web if returnUrl provided
          const ret = params?.returnUrl as string | undefined;
          if (ret) {
            try { await Linking.openURL(ret); } catch {}
          }
        } else {
          setStatus('error');
          setMessage('Permission denied or GPS unavailable');
        }
      } catch (e: any) {
        setStatus('error');
        setMessage(e?.message || 'Failed to start wayfare');
      }
    };
    run();
  }, []);

  const goToApp = () => router.replace('/(tabs)');
  const goHome = () => router.replace('/(tabs)');

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {status === 'starting' && <ActivityIndicator size="large" color="#1e90ff" />}
        <Text style={styles.title}>Wayfare Link</Text>
        <Text style={styles.text}>{message}</Text>
        {status === 'running' && (
          <View style={styles.row}>
            <TouchableOpacity style={[styles.button, styles.primary]} onPress={goToApp}>
              <Text style={styles.btnText}>Open App</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.secondary]} onPress={goHome}>
              <Text style={styles.btnText}>Home</Text>
            </TouchableOpacity>
          </View>
        )}
        {status === 'error' && (
          <TouchableOpacity style={[styles.button, styles.primary]} onPress={goHome}>
            <Text style={styles.btnText}>Back to App</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#2a2a2a', borderRadius: 12, padding: 20, width: '100%' },
  title: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  text: { color: '#aaa', fontSize: 16, marginBottom: 16, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  button: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flex: 1 },
  primary: { backgroundColor: '#1e90ff' },
  secondary: { backgroundColor: '#666' },
  btnText: { color: '#fff', fontWeight: '600' },
});
