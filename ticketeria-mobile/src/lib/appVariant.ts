import Constants from 'expo-constants';

export const IS_POS =
  (Constants.expoConfig?.extra?.appVariant ?? 'consumer') === 'pos';
