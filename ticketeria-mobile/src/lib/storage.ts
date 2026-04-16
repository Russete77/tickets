import * as SecureStore from 'expo-secure-store';

export enum StorageKey {
  AUTH_TOKEN = 'AUTH_TOKEN',
  REFRESH_TOKEN = 'REFRESH_TOKEN',
  USER_DATA = 'USER_DATA',
}

/**
 * Secure storage wrapper using expo-secure-store for sensitive data.
 * All data is stored securely on the device.
 */
export class SecureStorage {
  /**
   * Retrieves an item from secure storage.
   *
   * @param key - Storage key
   * @returns Stored value or null if not found
   */
  static async getItem(key: StorageKey): Promise<string | null> {
    try {
      const value = await SecureStore.getItemAsync(key);
      return value;
    } catch (error) {
      console.warn(`Failed to retrieve ${key} from secure storage:`, error);
      return null;
    }
  }

  /**
   * Stores an item in secure storage.
   *
   * @param key - Storage key
   * @param value - Value to store
   */
  static async setItem(key: StorageKey, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error(`Failed to store ${key} in secure storage:`, error);
      throw new Error(`Failed to store ${key}`);
    }
  }

  /**
   * Removes an item from secure storage.
   *
   * @param key - Storage key
   */
  static async removeItem(key: StorageKey): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.warn(`Failed to remove ${key} from secure storage:`, error);
    }
  }

  /**
   * Clears all authentication and user data from secure storage.
   * Use this for logout operations.
   */
  static async clearAll(): Promise<void> {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync(StorageKey.AUTH_TOKEN),
        SecureStore.deleteItemAsync(StorageKey.REFRESH_TOKEN),
        SecureStore.deleteItemAsync(StorageKey.USER_DATA),
      ]);
    } catch (error) {
      console.warn('Failed to clear secure storage:', error);
      // Don't throw - best effort clearing
    }
  }

  /**
   * Retrieves and parses JSON data from secure storage.
   *
   * @param key - Storage key
   * @returns Parsed JSON object or null if not found or invalid
   */
  static async getJSON<T>(key: StorageKey): Promise<T | null> {
    try {
      const value = await this.getItem(key);
      if (!value) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      console.warn(`Failed to parse ${key} from secure storage:`, error);
      return null;
    }
  }

  /**
   * Stores JSON data in secure storage.
   *
   * @param key - Storage key
   * @param value - Value to store
   */
  static async setJSON<T>(key: StorageKey, value: T): Promise<void> {
    try {
      const jsonString = JSON.stringify(value);
      await this.setItem(key, jsonString);
    } catch (error) {
      console.error(`Failed to store JSON ${key} in secure storage:`, error);
      throw new Error(`Failed to store ${key}`);
    }
  }
}

export const secureStorage = SecureStorage;
