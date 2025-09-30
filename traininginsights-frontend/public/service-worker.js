self.addEventListener('push', function(event) {
  const data = event.data ? event.data.text() : 'You have a notification';
  const title = 'TrainingInsights';
  const options = { body: data, icon: '/icon-192.png' };
  event.waitUntil(self.registration.showNotification(title, options));
});
