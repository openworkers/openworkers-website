# WebSockets

A worker can open a WebSocket to an external server (APIs, serverless
databases, message brokers), and it can accept a WebSocket from a client.

## Contents

- [Outbound connections](#outbound-connections) — connect to external servers
  - [Standard API](#standard-api) — `new WebSocket(url)`
  - [Upgrade API](#upgrade-api) — `fetch()` with `Upgrade: websocket`
  - [Binary messages](#binary-messages)
  - [Serverless databases](#serverless-databases)
- [Inbound connections](#inbound-connections) - accept clients
  - [The handshake](#the-handshake)
  - [Lifetime and limits](#lifetime-and-limits)

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

const ws = response.webSocket; // present when status is 101
ws.accept(); // start receiving messages
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

## Inbound connections

A client can open a WebSocket to your worker. The worker creates a
`WebSocketPair`, keeps the server end, and returns the client end in a `101`
response:

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

    server.addEventListener('close', (event) => {
      console.log('closed', event.code, event.reason);
    });

    return new Response(null, { status: 101, webSocket: client });
  }
};
```

The server end is a `WebSocket`, with the API of the
[Upgrade API](#upgrade-api). The client end only tells the runtime which socket
to connect: do not call its methods.

Call `server.accept()` in the handler. A server end that is not accepted when
the request event ends closes with `1000`. Messages that the worker sends
before the client connects are kept and sent in order.

### The handshake

The runner checks the handshake before the worker runs. A WebSocket request is
an HTTP/1.1 `GET` with `Upgrade: websocket`, `Connection: Upgrade`,
`Sec-WebSocket-Version: 13` and a valid `Sec-WebSocket-Key`. If one of them is
wrong, the client gets a `400`, or a `426` for the version.

The headers of the worker response go into the `101`. To select a subprotocol,
set `Sec-WebSocket-Protocol` to one of the values the client sent:

```javascript
return new Response(null, {
  status: 101,
  webSocket: client,
  headers: { 'Sec-WebSocket-Protocol': 'chat' }
});
```

A `webSocket` in the response to a request that is not a WebSocket request is
an error, and so is a `101` without a `webSocket`. The client gets a `500`.

### Lifetime and limits

Each connection runs in its own worker context. Two clients do not share
state: to broadcast to many clients (chat rooms, multiplayer games), you need
the Durable Objects model, which is planned for a later release.

The context stays alive while the socket is open. The 60 s
[wall clock](/docs/limits#wall-clock-timeout) of the request stops at the
`101`. After it, each turn of the event loop (a message handler, a timer) gets
its own [CPU time](/docs/limits#cpu-time) limit and its own 60 s wall clock. A
handler that goes past them stops the worker, and the socket closes with
`1011`.

The runner closes a socket in these cases:

| Code   | Reason                     | When                                                      |
| ------ | -------------------------- | --------------------------------------------------------- |
| `1001` | `Idle for too long`        | No frame in either direction for 100 s                    |
| `1001` | `The runner is going away` | The runner stops, for example for an update               |
| `1009` | `Message too big`          | A message or a frame is larger than 1 MiB                 |
| `1011` | `The worker stopped`       | A limit stopped the worker                                |
| `1000` |                            | The worker did not accept the server end during the event |

To keep a quiet socket open, send a message at least every 100 s. A ping frame
from the client also counts.

When the runner has too many open sockets, a new WebSocket request gets a
`503`.
