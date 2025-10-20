# 🌓 Dark Mode / Light Mode - Quick Start Guide

## How to Use

### Toggle Dark Mode
1. Open the app and navigate to **Settings** (bottom tab bar)
2. Look for **Appearance** section at the top
3. Toggle the **Dark Mode** switch on/off
4. Changes apply immediately to all screens!
5. Your preference is saved automatically

## What's Changed?

### Color Palettes

#### Light Mode
- Background: Bright white
- Text: Dark gray/black
- Cards: Off-white
- Accents: Blue and red

#### Dark Mode  
- Background: Near-black (#1a1a1a)
- Text: White
- Cards: Charcoal (#25292e)
- Accents: Bright blue and red

### Themed Screens ✨
- **Home** - Geo-tagging display
- **Settings** - All controls and toggles
- **About** - Feature descriptions
- **Tab Navigation** - Bottom tab colors

## Technical Details

### Files Added
- `utils/ThemeContext.tsx` - Theme management & storage

### Files Modified
- `app/_layout.tsx` - App-wide theme provider
- `app/(tabs)/_layout.tsx` - Tab bar theming
- `app/(tabs)/index.tsx` - Home screen theming
- `app/(tabs)/settings.tsx` - Settings + dark mode toggle
- `app/(tabs)/about.tsx` - About screen theming

## Theme Persistence
✅ Theme preference automatically saves to device
✅ Preference loads on app startup
✅ No "flash" of wrong theme
✅ Survives app restarts

## Architecture
```
ThemeContext (Context API)
    ↓
ThemeProvider (wraps entire app)
    ↓
useTheme() hook (use in any component)
    ↓
Dynamic colors applied
```

## Adding Themes to New Components

```typescript
import { useTheme } from '../../utils/ThemeContext';

export default function MyComponent() {
  const { theme } = useTheme();
  
  return (
    <View style={{ backgroundColor: theme.colors.background }}>
      <Text style={{ color: theme.colors.text }}>Hello</Text>
    </View>
  );
}
```

## Available Colors
- `theme.colors.background` - Main background
- `theme.colors.text` - Primary text
- `theme.colors.textSecondary` - Secondary text/hints
- `theme.colors.border` - Borders & dividers
- `theme.colors.card` - Card backgrounds
- `theme.colors.primary` - Primary actions (buttons, links)
- `theme.colors.danger` - Destructive actions (delete, logout)

## Theme Mode Detection
```typescript
const { isDarkMode, theme } = useTheme();

// isDarkMode is boolean
if (isDarkMode) {
  // Apply dark-mode-specific logic
}

// theme.mode is 'light' or 'dark'
if (theme.mode === 'dark') {
  // Apply dark-mode-specific logic
}
```

---

**Enjoy seamless dark/light mode switching! 🌓**
