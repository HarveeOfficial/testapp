# Dark Mode / Light Mode Implementation Guide

## Overview
A complete theme system has been implemented for your Expo/React Native app, supporting both light and dark modes with automatic persistence.

## Features Added

### 1. **Theme Context** (`utils/ThemeContext.tsx`)
- Centralized theme management using React Context API
- Two predefined themes: `lightTheme` and `darkTheme`
- Theme colors include:
  - `background` - Main background color
  - `text` - Primary text color
  - `textSecondary` - Secondary/hint text color
  - `border` - Border and divider color
  - `card` - Card/container background
  - `primary` - Primary action color
  - `danger` - Destructive action color

**Key Functions:**
- `useTheme()` - Hook to access current theme in any component
- `toggleTheme()` - Toggle between light and dark mode
- `setThemeMode()` - Set specific theme mode

### 2. **Light Theme Colors**
```typescript
{
  background: '#ffffff',
  text: '#1a1a1a',
  textSecondary: '#666666',
  border: '#e0e0e0',
  card: '#f5f5f5',
  primary: '#007AFF',
  danger: '#ff3b30',
}
```

### 3. **Dark Theme Colors**
```typescript
{
  background: '#1a1a1a',
  text: '#ffffff',
  textSecondary: '#999999',
  border: '#333333',
  card: '#25292e',
  primary: '#0a84ff',
  danger: '#ff453a',
}
```

## Updated Files

### 1. **app/_layout.tsx**
- Wrapped entire app with `<ThemeProvider>`
- Theme state persists across app restarts

### 2. **app/(tabs)/_layout.tsx**
- Tab bar colors now adapt to current theme
- Dynamic `tabBarActiveTintColor` and `tabBarInactiveTintColor`

### 3. **app/(tabs)/index.tsx** (Home Screen)
- Status bar adapts to theme mode
- All text and background colors use theme colors
- Dynamic styling applied via array style syntax

### 4. **app/(tabs)/settings.tsx** (Settings Screen)
- **New Dark Mode Toggle** in "Appearance" section
- All UI elements now use theme colors
- Toggle switch to enable/disable dark mode
- Theme preference saved to device storage

## Usage

### Using Theme in Components
```typescript
import { useTheme } from '../../utils/ThemeContext';

export default function MyComponent() {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  
  return (
    <View style={{ backgroundColor: theme.colors.background }}>
      <Text style={{ color: theme.colors.text }}>Hello World</Text>
    </View>
  );
}
```

### Dark Mode Toggle
Located in Settings → Appearance → Dark Mode
- Toggle saves preference to device storage
- Preference persists across app sessions
- Automatically applies to all screens

## Color System

The theme system provides semantic color names that automatically adapt based on the selected theme:

| Purpose | Light | Dark |
|---------|-------|------|
| Background | White | Near-Black |
| Text | Dark | White |
| Secondary Text | Medium Gray | Light Gray |
| Borders | Light Gray | Dark Gray |
| Cards | Off-White | Charcoal |
| Primary Actions | Blue | Bright Blue |
| Danger Actions | Red | Bright Red |

## Storage
- Theme preference stored in `AsyncStorage` with key: `theme.mode`
- Automatically loads on app startup
- Prevents "flash" of wrong theme by returning `null` until loaded

## Next Steps (Optional Enhancements)
1. Apply theme to other screens (About page, etc.)
2. Add custom theme picker with more color options
3. Add system preference detection (useColorScheme)
4. Add theme transition animations
5. Create theme customization UI

## Components Ready for Theme
- ✅ Home Screen (index.tsx)
- ✅ Settings Screen (settings.tsx)
- ✅ Tab Navigation
- ⏳ About Screen (can be themed)
- ⏳ Other custom components

## Notes
- The `ThemeProvider` must wrap the entire app for `useTheme()` to work
- All theme colors are accessible via the `theme` object
- Dynamic colors update immediately when theme is toggled
- Theme is saved automatically and persists across sessions
