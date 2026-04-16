/// <reference lib="webworker" />
/**
 * Service Worker for Ticketeria Digital
 * Handles offline functionality, caching, and push notifications
 */

declare const self: ServiceWorkerGlobalScope;

// Handle push notifications
self.addEventListener('push', (event: PushEvent) => {
  const data = event.data?.json() ?? {};

  const options: NotificationOptions = {
    body: data.body || 'Nova notificação',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: data.tag || 'default',
    requireInteraction: data.requireInteraction ?? false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Ticketeria', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  const urlToOpen = (event.notification as any).data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(
      (clientList) => {
        // Check if there's already a window/tab open with the target URL
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // If not, open a new window/tab with the target URL
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      }
    )
  );
});

// Handle background sync for offline ticket data
self.addEventListener('sync', (event: any) => {
  if (event.tag === 'sync-tickets') {
    event.waitUntil(
      // Sync offline ticket data when back online
      fetch('/api/tickets/sync', { method: 'POST' })
        .catch(() => {
          // If sync fails, it will retry on next connectivity
          console.log('Ticket sync failed, will retry later');
        })
    );
  }
});

// Handle service worker activation
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    // Clean up old caches
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!['google-fonts-cache', 'api-cache', 'image-cache'].includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
