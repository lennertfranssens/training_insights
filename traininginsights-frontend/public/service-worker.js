self.addEventListener('install', event => {
  // Become the active worker immediately
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  // Control all open clients without reload
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function(event) {
  let title = 'TrainingInsights';
  let body = 'You have a notification';
  try {
    if (event.data) {
      const text = event.data.text() || '';
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
    tag: 'traininginsights-general',
    timestamp: Date.now(),
    data: { url: (event.notificationDataUrl || '/dashboard/notifications') }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
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
