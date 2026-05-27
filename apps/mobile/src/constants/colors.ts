// Navy and Emerald Color Palette tokens corresponding to the tailwind web configuration

export const Colors = {
  navy: {
    50: '#f0f4ff',
    100: '#dbe4ff',
    200: '#bac8ff',
    300: '#91a7ff',
    400: '#748ffc',
    500: '#5c7cfa',
    600: '#4c6ef5',
    700: '#364fc7',
    800: '#1e293b', // slate-800
    900: '#0f172a', // slate-900 (Secondary background / card overlay)
    950: '#020617', // slate-950 (Primary dark background)
  },
  emerald: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399', // soft accent
    500: '#10b981', // main brand color
    600: '#059669', // gradient dark accent
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },
  orange: {
    400: '#fb923c', // Streak metric accent color
    500: '#f97316',
  },
  rose: {
    500: '#f43f5e',
    600: '#e11d48',
  },
  slate: {
    100: '#f1f5f9',
    300: '#cbd5e1',
    400: '#94a3b8',
    450: '#64748b',
    550: '#64748b',
  },
  // Application Semantic Themes
  theme: {
    dark: {
      background: '#020617',      // navy-950
      card: '#0f172a',            // navy-900
      border: '#1e293b',          // navy-800
      text: '#ffffff',            // white
      textSecondary: '#94a3b8',   // slate-400
      primary: '#10b981',         // emerald-500
      accent: '#fb923c',          // orange-400
    }
  }
} as const;

export default Colors;
