/* Service Worker de mensagens (Web Push) do MSN Messenger.
   Cuida apenas de notificacoes push — nao faz cache de app shell. */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let dados = {};
  try {
    dados = event.data ? event.data.json() : {};
  } catch {
    dados = { titulo: 'MSN Messenger', corpo: event.data ? event.data.text() : '' };
  }
  const titulo = dados.titulo || 'MSN Messenger';
  const opcoes = {
    body: dados.corpo || 'Você recebeu uma nova mensagem.',
    icon: dados.icone || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: dados.tag || 'msn-push',
    renotify: true,
    vibrate: [80, 60, 80, 60, 200],
    data: { url: dados.url || '/messenger' },
  };
  event.waitUntil(self.registration.showNotification(titulo, opcoes));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destino = (event.notification.data && event.notification.data.url) || '/messenger';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lista) => {
      for (const cliente of lista) {
        if (cliente.url.includes(destino) && 'focus' in cliente) return cliente.focus();
      }
      return self.clients.openWindow(destino);
    }),
  );
});
