import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gx.core',
  appName: 'GX Core',
  webDir: 'public', // Placeholder, we will use server.url for live deployment
  server: {
    url: 'https://fx-rapallo.vercel.app',
    cleartext: true
  }
};

export default config;
