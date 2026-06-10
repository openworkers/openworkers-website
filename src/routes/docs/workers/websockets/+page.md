# WebSockets

OpenWorkers supports **outbound** WebSocket connections — your worker can open a
WebSocket to any external server (APIs, serverless databases, message brokers).
**Inbound** connections (accepting clients) are in beta — see [below](#inbound-connections-beta).

## Contents

- [Outbound connections](#outbound-connections) — connect to external servers
  - [Standard API](#standard-api) — `new WebSocket(url)`
  - [Upgrade API](#upgrade-api) — `fetch()` with `Upgrade: websocket`
  - [Binary messages](#binary-messages)
  - [Serverless databases](#serverless-databases)
- [Inbound connections (beta)](#inbound-connections-beta)

---

## Outbound connections

### Standard API

The standard [WHATWG `WebSocket`](https://websockets.spec.whatwg.org/) API is
available globally, just like in the browser.

```javascript
export default {
  async fetch(request) {
    const ws = new WebSocket('wss://echo.websocket.org');

    return new Promise((resolve) => {
      ws.addEventListener('open', () => ws.send('hello'));

      ws.addEventListener('message', (event) => {
        resolve(new Response('Echo: ' + event.data));
        ws.close();
      });

      ws.addEventListener('error', () => {
        resolve(new Response('WebSocket error', { status: 502 }));
      });
    });
  }
};
```

Supported:

- `new WebSocket(url[, protocols])` — `ws://` and `wss://` (and `http(s)://`,
  which are normalized). An invalid scheme or a URL fragment throws a
  `SyntaxError`.
- `readyState` (`CONNECTING`, `OPEN`, `CLOSING`, `CLOSED`) and the matching constants.
- `addEventListener(type, fn)` and the `onopen` / `onmessage` / `onclose` / `onerror`
  properties.
- `send(data)` — `string`, `ArrayBuffer`, or a typed array.
- `close([code[, reason]])` — `code` must be `1000` or in the `3000`–`4999` range.

The connection lives for the duration of the request. Open it, use it, and make
sure the worker sends a response (e.g. by resolving a `Promise` from `fetch`).

### Upgrade API

For lower-level control — or compatibility with code written for Cloudflare
Workers — you can open a connection with `fetch()` and an `Upgrade` header. This
gives you access to the handshake `Response` (status, headers) before you start
receiving messages.

```javascript
const response = await fetch('wss://example.com/socket', {
  headers: { Upgrade: 'websocket' }
});

const ws = response.webSocket;   // present when status is 101
ws.accept();                     // start receiving messages
ws.send('hello');
```

Unlike the standard `new WebSocket(url)` constructor, the `Response.webSocket`
returned here must be explicitly `accept()`-ed before it delivers messages.

### Binary messages

Binary frames are delivered as `ArrayBuffer` (the default `binaryType` is
`'arraybuffer'`).

```javascript
ws.addEventListener('message', (event) => {
  if (typeof event.data === 'string') {
    // text frame
  } else {
    const bytes = new Uint8Array(event.data); // ArrayBuffer
  }
});
```

### Serverless databases

Because the standard `WebSocket` is available, serverless database drivers that
tunnel the Postgres protocol over WebSockets work out of the box — including
interactive transactions. For example, with the Neon serverless driver you only
need to point it at the runtime's WebSocket:

```javascript
import { Pool, neonConfig } from '@neondatabase/serverless';

neonConfig.webSocketConstructor = WebSocket; // the runtime's standard global

const pool = new Pool({ connectionString: DATABASE_URL });
const client = await pool.connect();

await client.query('BEGIN');
const { rows } = await client.query('SELECT now()');
await client.query('COMMIT');

client.release();
```

No shim is required — the driver uses the runtime's WebSocket directly.

---

## Inbound connections (beta)

> **Beta — in development.** Accepting WebSocket connections *from* clients is
> being rolled out. The API below is the target shape and may change. Outbound
> connections (above) are stable.

Inbound support lets a client open a WebSocket *to* your worker. The first
release covers **independent connections** (echo, proxy, protocol bridging,
streaming AI/LLM passthrough, server-to-client push) using the standard
`WebSocketPair` pattern:

```javascript
export default {
  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected a WebSocket', { status: 426 });
    }

    const [client, server] = Object.values(new WebSocketPair());

    server.accept();
    server.addEventListener('message', (event) => {
      server.send('echo: ' + event.data);
    });

    return new Response(null, { status: 101, webSocket: client });
  }
};
```

Coordinated, stateful connections that need to share state or broadcast between
clients (chat rooms, multiplayer) — the Durable Objects model — are planned for a
later release.
