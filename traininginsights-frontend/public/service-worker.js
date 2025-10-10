self.addEventListener('install', event => {
  // Become the active worker immediately
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  // Control all open clients without reload
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function(event) {
  try { console.log('[SW] push received at', new Date().toISOString(), 'hasData=', !!event.data); } catch(e) {}
  let title = 'TrainingInsights';
  let body = 'You have a notification';
  try {
    if (event.data) {
      const text = event.data.text() || '';
      try { console.log('[SW] payload length', text.length); } catch(e) {}
      // Try JSON first: { title, body, url }
      try {
        const obj = JSON.parse(text);
        if (obj && (obj.title || obj.body)) {
          if (obj.title) title = String(obj.title);
          if (obj.body) body = String(obj.body);
          event.notificationDataUrl = obj.url || '/dashboard/notifications';
        } else {
          throw new Error('Not JSON payload with title/body');
        }
      } catch (e) {
        // Fallbacks:
        const raw = (text || '').trim();
        // 1) If it looks like JSON but couldn't parse, suppress raw JSON and show a clean message
        if ((raw.startsWith('{') && raw.endsWith('}')) || (raw.startsWith('[') && raw.endsWith(']'))) {
          // Keep default title; keep default generic body
        } else if (raw.includes('\n')) {
          // 2) Legacy format: first line = title, rest = body
          const parts = raw.split('\n');
          if (parts[0].trim()) title = parts[0].trim();
          body = parts.slice(1).join('\n').trim() || body;
        } else if (raw) {
          // 3) Plain text message
          body = raw;
        }
      }
    }
  } catch (e) { /* ignore */ }

  const options = {
    body,
    renotify: true,
    // unique tag per event to avoid coalescing
    tag: 'traininginsights-' + Date.now(),
    timestamp: Date.now(),
    requireInteraction: true,
    data: { url: (event.notificationDataUrl || '/dashboard/notifications') }
  };
  event.waitUntil(
    self.registration.showNotification(title, options).catch(err => {
      try { console.error('[SW] showNotification failed', err); } catch(e) {}
    })
  );
});

self.addEventListener('notificationclick', function(event) {
  try { console.log('[SW] notificationclick', event.notification && event.notification.data); } catch(e) {}
  event.notification.close();
  const targetUrl = (event.notification && event.notification.data && event.notification.data.url) || '/dashboard/notifications';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        // Focus existing tab and navigate
        if ('focus' in client) {
          return client.focus().then(() => {
            if ('navigate' in client) {
              return client.navigate(targetUrl);
            }
          });
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
