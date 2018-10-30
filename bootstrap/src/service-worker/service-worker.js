/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

console.log('sw startup');

self.addEventListener('install', function(event) {
  self.skipWaiting();
  console.log('sw installed');
});

self.addEventListener('activate', function(event) {
  self.clients.claim();
  console.log('sw activated');
});

self.addEventListener('fetch', function(event) {
  const url = event.request.url;
  const origin = self.location.origin;
  if (url.startsWith(origin)) {
    const responsePromise = fetch(event.request).then(function(response) {
      if (response.status === 401) {
        sendMessageToAllClients({ action: 'requestLogout' });
      }
      return response;
    });
    event.respondWith(responsePromise);
  }
});

function sendMessageToAllClients(message) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      sendMessageToClient(client, message);
    });
  });
}

function sendMessageToClient(client, message) {
  const ch = new MessageChannel();
  client.postMessage(message, [ch.port2]);
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
