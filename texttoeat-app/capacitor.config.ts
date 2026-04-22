import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.texttoeat.app',
  appName: 'TextToEat',
  webDir: 'public/build',
  server: {
    url: 'https://avelinalacasandile-eat.top/',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;