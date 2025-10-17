import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'catcha.api.token';

export async function setToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  try {
    const v = await AsyncStorage.getItem(TOKEN_KEY);
    return v || null;
  } catch {
    return null;
  }
}

export async function clearToken(): Promise<void> {
  try { await AsyncStorage.removeItem(TOKEN_KEY); } catch {}
}
