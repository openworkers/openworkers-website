<script>
  import Tabs from '$lib/components/Tabs.svelte';
</script>

# Durable Objects Binding

A class that your worker exports, with one instance per id: each object has its own storage and handles its events one after the other. The API is the one of [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/): `idFromName`, `get`, `stub.fetch`, `state.storage`, alarms and hibernatable WebSockets. Code written for it runs unchanged on the supported subset below.

Durable Objects are off by default. An administrator turns them on for an account by raising its Durable Objects limit; until then the account cannot create a namespace.

## Setup

A namespace links a name to a class of a worker. Bind the namespace to an environment, as any other binding.

<Tabs tabs={['CLI', 'API']}>
{#snippet children(active)}
{#if active === 0}

<div>

```bash
# The class Counter that the worker my-app exports
ow durable-objects create counters --worker my-app --class Counter

# Bind it to an environment and link the environment to a worker
ow env bind my-env COUNTER counters --type durable_object
ow workers link my-app my-env
```

      </div>
    {:else}
      <div>

```bash
# Create a namespace
curl -X POST https://dash.openworkers.com/api/v1/durable-objects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "counters", "worker": "my-app", "className": "Counter"}'

# Add the binding to an environment
curl -X PATCH https://dash.openworkers.com/api/v1/environments/my-env \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"values": [{"key": "COUNTER", "value": "<namespace-id>", "type": "durable_object"}]}'
```

      </div>
    {/if}

{/snippet}
</Tabs>

## Usage

```javascript
export class Counter {
  constructor(state, env) {
    this.state = state;
  }

  async fetch(request) {
    const count = ((await this.state.storage.get('count')) ?? 0) + 1;
    this.state.storage.put('count', count);

    return new Response(String(count));
  }
}

export default {
  fetch(request, env) {
    // The same name always reaches the same object
    return env.COUNTER.getByName('global').fetch(request);
  }
};
```

The worker that exports the class can also be the one that calls it, as here.

## Ids and stubs

| Method                    | Result                                                             |
| ------------------------- | ------------------------------------------------------------------ |
| `idFromName(name)`        | The id of the object of `name`: the same name gives the same id.   |
| `newUniqueId()`           | A new id that no name gives.                                       |
| `idFromString(text)`      | The id that `id.toString()` gave. Throws for an id of another one. |
| `get(id)`                 | A stub. Nothing starts until the first request.                    |
| `getByName(name)`         | `get(idFromName(name))`                                            |
| `stub.fetch(input, init)` | Sends a request to the `fetch` method of the object.               |

An id is 64 hex digits. A namespace accepts only its own ids.

## Storage

`state.storage` keeps values of any type that the structured clone algorithm copies: a `Map`, a `Date` or a typed array reads back as itself.

| Method                                                     | Result                                                           |
| ---------------------------------------------------------- | ---------------------------------------------------------------- |
| `get(key)`, `get(keys)`                                    | The value, or a `Map` of the keys that exist.                    |
| `put(key, value)`, `put(entries)`                          | Writes.                                                          |
| `delete(key)`, `delete(keys)`                              | Whether the key existed, or how many did.                        |
| `list({ start, startAfter, end, prefix, reverse, limit })` | A `Map` in key order.                                            |
| `deleteAll()`                                              | Deletes the keys. The alarm stays.                               |
| `transaction(closure)`                                     | Its writes commit together when the closure ends, or not at all. |
| `sync()`                                                   | Resolves once the writes before it are committed.                |

The operations run in the order the object makes them, so a `get` after a `put` that was not awaited reads the put.

### Gates

- **Input gate**: while a read is under way, no other event reaches the object, neither a new request nor a timer or a response of another event. A read-modify-write such as the counter above is safe without a transaction.
- **Output gate**: a response, each chunk of its body, a WebSocket message and an outbound `fetch` wait until the writes made before them are committed. The code does not need to await a `put` to be sure a client never sees a value that is then lost.
- `state.blockConcurrencyWhile(callback)` holds every event until the callback ends, for example to load state in the constructor.

## Alarms

```javascript
export class Reminder {
  constructor(state) {
    this.state = state;
  }

  async fetch(request) {
    await this.state.storage.setAlarm(Date.now() + 60_000);
    return new Response('in one minute');
  }

  async alarm({ retryCount, isRetry }) {
    // Runs once the time comes, even if the object was not in memory
  }
}
```

An object has one alarm: `setAlarm(time)` replaces it, `getAlarm()` reads it, `deleteAlarm()` removes it. An alarm that throws runs again after 2, 4, 8, 16, 32 and 64 seconds, then it is dropped; each failure goes to the logs of the worker. An alarm due while the runner was down runs when it starts again.

## WebSockets

An object can accept WebSockets and leave memory while they stay open: the runner holds the sockets, and a message starts the object again.

```javascript
export class Room {
  constructor(state) {
    this.state = state;
  }

  async fetch(request) {
    const [client, server] = Object.values(new WebSocketPair());

    this.state.acceptWebSocket(server);
    server.serializeAttachment({ name: new URL(request.url).searchParams.get('name') });

    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(ws, message) {
    const { name } = ws.deserializeAttachment();

    for (const peer of this.state.getWebSockets()) {
      peer.send(`${name}: ${message}`);
    }
  }

  webSocketClose(ws, code, reason, wasClean) {}
}

export default {
  fetch(request, env) {
    // A 101 of the object goes back as it is
    return env.ROOMS.getByName('lobby').fetch(request);
  }
};
```

| Method                            | Result                                                                  |
| --------------------------------- | ----------------------------------------------------------------------- |
| `state.acceptWebSocket(ws, tags)` | The object takes the socket. At most 10 tags.                           |
| `state.getWebSockets(tag)`        | The open sockets, or those with the tag.                                |
| `state.getTags(ws)`               | The tags of a socket.                                                   |
| `ws.serializeAttachment(value)`   | Keeps a value with the socket, at most 2048 bytes, through hibernation. |
| `ws.deserializeAttachment()`      | A copy of that value, or `null`.                                        |

A socket accepted with `ws.accept()` instead works too, with event listeners, but it keeps the object in memory while it is open.

A client that leaves more than 8 MiB unread, or that sends more than 8 MiB the object did not take yet, loses its connection, and the object gets `webSocketClose` with code 1008. The sockets of objects count in the open WebSockets of the runner: when they are all taken, `acceptWebSocket` does nothing and the client closes at once.

## Lifecycle

- An object with no event in flight for 60 seconds leaves memory. Its storage, its alarm and its hibernatable WebSockets stay; the next event builds it again.
- A new deployment of the worker reaches running objects within seconds: they finish the events they took, for up to 30 seconds, then the new code starts. Their WebSockets close with code 1012.
- An error in the constructor, in `blockConcurrencyWhile`, or a failed write stops the object; the next event builds it again. The reason goes to the logs of the worker.

## Differences from Cloudflare Durable Objects

- No RPC on stubs: call `stub.fetch`.
- No SQL storage (`state.storage.sql`) and no `transactionSync`: they throw.
- No jurisdictions and no location hints.
- No WebSocket auto response and no hibernatable event timeout: they throw.
- `allowConcurrency` is accepted and ignored: a read always closes the input gate. `allowUnconfirmed` is ignored too.
- A worker that gets a 101 from a stub can only return it; it cannot read the client end itself.
- All objects run on one runner. A restart of the runner closes the WebSockets; the clients reconnect.

## Limits

| Limit                             | Value                         |
| --------------------------------- | ----------------------------- |
| Key                               | 2048 bytes                    |
| Value                             | 128 KiB                       |
| Keys per `get`, `put` or `delete` | 128                           |
| Storage of a namespace            | 1 GiB                         |
| Objects of an account in memory   | 100                           |
| Nested calls between objects      | 16                            |
| WebSockets per object             | 32,768                        |
| WebSocket attachment              | 2048 bytes                    |
| WebSocket tags                    | 10, of at most 256 characters |
| Unread bytes of a WebSocket       | 8 MiB each way                |

When the objects of a namespace hold 1 GiB, a `put` fails and a new object cannot start its storage. Reads and deletes still run, and a delete frees room at once.

## Durability

The storage of each object is a SQLite file in the runner, with the same guarantees as [D1](/docs/bindings/d1#durability): a write is confirmed once committed to the runner's disk, and changed files are copied to object storage every 5 minutes. When the runner's disk or host is lost, the writes after the last copy are lost.
