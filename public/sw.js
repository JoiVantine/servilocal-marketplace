self.addEventListener('push', (event) => {
  const fallback = {
    title: 'ServiLocal',
    body: 'Você tem uma nova atualização.',
    url: '/client',
  };

  let data = fallback;
  try {
    data = { ...fallback, ...event.data.json() };
  } catch {
    data = fallback;
  }

  event.waitUntil(
    self.registration.showNotification(data.title || fallback.title, {
      body: data.body || fallback.body,
      icon: '/onboarding-city-512.png',
      badge: '/onboarding-city-512.png',
      data: { url: data.url || fallback.url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || '/client', self.location.origin).href;

  event.waitUntil((async () => {
    const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windowClients.find((client) => client.url === targetUrl);
    if (existing) return existing.focus();
    return clients.openWindow(targetUrl);
  })());
});
