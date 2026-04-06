import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gx.core',
  appName: 'GX Core',
  webDir: 'public',
  server: {
    url: 'https://fx-rapallo.vercel.app',
    cleartext: true
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '1082757635267-2f3b4c5d6e7f8g9h0i1j2k3l4m5n6o7p.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
