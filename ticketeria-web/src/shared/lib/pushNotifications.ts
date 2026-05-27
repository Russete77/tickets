/**
 * Push Notifications Utility
 * Handles browser push notification setup and subscription
 * Works offline with cached ticket data and TOTP secrets
 */

// VAPID public key - should be set via environment variables in production
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

/**
 * Check if push notifications are supported by the browser
 */
export function isPushNotificationsSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Check if push notifications are already enabled
 */
export async function isPushNotificationsEnabled(): Promise<boolean> {
  if (!isPushNotificationsSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}

/**
 * Request permission from user for push notifications
 */
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!isPushNotificationsSupported()) {
    throw new Error('Push notifications are not supported in this browser');
  }

  return Notification.requestPermission();
}

/**
 * Subscribe to push notifications
 * Requires a valid VAPID public key to be set
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!isPushNotificationsSupported()) {
    console.warn('Push notifications are not supported');
    return null;
  }

  if (Notification.permission !== 'granted') {
    const permission = await requestPushPermission();
    if (permission !== 'granted') {
      console.warn('User denied push notification permission');
      return null;
    }
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    // If already subscribed, return existing subscription
    if (subscription) {
      return subscription;
    }

    // Create new subscription
    if (!VAPID_PUBLIC_KEY) {
      console.warn('VAPID_PUBLIC_KEY is not configured');
      return null;
    }

    const newSubscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    });

    return newSubscription;
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushNotificationsSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      return true;
    }

    return await subscription.unsubscribe();
  } catch (error) {
    console.error('Failed to unsubscribe from push notifications:', error);
    return false;
  }
}

/**
 * Get current push subscription details
 */
export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushNotificationsSupported()) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (error) {
    console.error('Failed to get push subscription:', error);
    return null;
  }
}

/**
 * Show a notification with offline ticket information
 * This is called from the service worker or directly in the app
 */
export function showOfflineTicketNotification(
  ticketId: string,
  eventName: string,
  eventDate: string
): Promise<void> {
  return navigator.serviceWorker.ready.then((registration) => {
    const notificationOptions: NotificationOptions = {
      body: `${eventName} - ${eventDate}`,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: `ticket-${ticketId}`,
      requireInteraction: false,
    };
    return registration.showNotification('Ingresso Salvo Offline', notificationOptions);
  });
}

/**
 * Helper function to convert VAPID key from base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Initialize push notifications on app startup
 * Automatically checks and subscribes if permission is granted
 */
export async function initializePushNotifications(): Promise<void> {
  if (!isPushNotificationsSupported()) {
    console.info('Push notifications are not supported in this browser');
    return;
  }

  try {
    // Check if already subscribed
    const isEnabled = await isPushNotificationsEnabled();
    if (isEnabled) {
      console.info('Push notifications are already enabled');
      return;
    }

    // Only auto-subscribe if Notification API shows permission as granted
    // (e.g., from a previous session)
    if (Notification.permission === 'granted') {
      await subscribeToPush();
    }
  } catch (error) {
    console.error('Error initializing push notifications:', error);
  }
}
