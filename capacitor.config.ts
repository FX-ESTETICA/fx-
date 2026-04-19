import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gx.core',
  appName: 'GX',
  webDir: 'public',
  server: {
    url: 'https://fx-rapallo.vercel.app',
    cleartext: true
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '759484201665-h43394q58q16bv83veij84mmbbautl0g.apps.googleusercontent.com',
      androidClientId: '759484201665-5bia4bh3lg6ermgfre52e3u5h4jeeblc4.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
