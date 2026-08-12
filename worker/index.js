// Código extra do service worker — importado automaticamente pelo next-pwa
// (ver customWorkerDir no next.config.js / README do next-pwa). Roda junto
// com o service worker gerado pelo workbox, então só cuida de push
// notification aqui — o cache/offline continua sendo o workbox.

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'Tanguá App', body: event.data.text() }
  }

  const titulo = payload.title || 'Tanguá App'
  const opcoes = {
    body: payload.body || '',
    icon: payload.icon || '/icon-192.png',
    badge: '/icon-192.png',
    tag: payload.tag || undefined,
    data: { url: payload.url || '/' },
  }

  event.waitUntil(self.registration.showNotification(titulo, opcoes))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url)
      }
    })
  )
})
