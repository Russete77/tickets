import { ExpoConfig } from 'expo/config';

const IS_POS = process.env.APP_VARIANT === 'pos';

const config: ExpoConfig = {
  name: IS_POS ? 'PulsePass POS' : 'Ticketeria Digital',
  slug: 'ticketeria-mobile',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './src/assets/icon.png',
  scheme: IS_POS ? 'pulsepasspos' : 'ticketeria',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './src/assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0A0A0F',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: IS_POS ? 'com.pulsepass.pos' : 'com.ticketeria.app',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './src/assets/adaptive-icon.png',
      backgroundColor: '#0A0A0F',
    },
    package: IS_POS ? 'com.pulsepass.pos' : 'com.ticketeria.app',
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './src/assets/favicon.png',
  },
  plugins: [
    [
      'expo-camera',
      {
        cameraPermission:
          'Allow Ticketeria Digital to access your camera for QR code scanning.',
      },
    ],
    [
      'expo-notifications',
      {
        icon: './src/assets/notification-icon.png',
        color: '#ffffff',
        sounds: ['./src/assets/notification-sound.wav'],
      },
    ],
    [
      'expo-secure-store',
      {
        faceIDPermission:
          'Allow Ticketeria Digital to use Face ID for secure authentication.',
      },
    ],
    'expo-router',
    'expo-asset',
    'expo-sqlite',
    ...(IS_POS ? ['./plugins/withAndroidLockTask.js'] : []),
  ],
  extra: {
    router: {
      origin: false,
    },
    eas: {
      projectId: 'ticketeria-mobile',
    },
    API_URL: 'https://api.ticketeria.com.br',
    appVariant: IS_POS ? 'pos' : 'consumer',
  },
};

export default config;
