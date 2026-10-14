---
title: 'Durable Objects: one instance per name'
date: '2026-10-14'
description: With 1.18, a worker can export a class whose instances each have a name, their own storage and their own WebSockets. How it works in the runner, and what we found on the way.
---

A worker has no memory. Each request can reach a different instance, many
instances run at the same time, and none of them knows what the others did.
For most requests this is what you want. It stops working when users must
share something live.

Take a like counter. Two requests come at the same time, on two instances:

```
instance A: reads 10, writes 11
instance B: reads 10, writes 11     <- one like is lost
```

Or take a chat. Alice has a WebSocket on instance A, Bob on instance B. When
Alice sends a message, instance A does not have the socket of Bob. You need
a database with locks for the first case, and a message broker between the
instances for the second.

With 1.18, OpenWorkers has Durable Objects: the API of
[Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/),
on the runner.

## One instance per name

A Durable Object is an instance of a class that your worker exports. Each
object has a name, and all the requests for a name go to the same instance:

```
             requests for "lobby"
  Alice --+
  Bob   --+-->  [ Room "lobby" ]    one instance only
  Carol --+       - fields in memory
                  - its own storage
                  - the sockets of Alice, Bob and Carol

             requests for "random"
  Dave  ----->  [ Room "random" ]   another object
```

From this one rule:

- The object runs one event at a time. A read-modify-write is safe without
  a lock.
- Its fields stay in memory from one request to the next, while it is in
  memory.
- It has its own storage, which stays through restarts and deployments.
- It can hold WebSockets, so a broadcast is a loop over its sockets.
- It can set an alarm to run code later, with no request.

Objects start when a request comes and leave memory when idle, so a
namespace can have one per room, per document or per user.

## A chat room

This is the whole chat of our demo, without its HTML page:

```javascript
export class Room extends DurableObject {
  async fetch(request) {
    const name = new URL(request.url).searchParams.get('name') || 'anon';
    const [client, server] = Object.values(new WebSocketPair());

    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ name });

    const history = (await this.ctx.storage.get('history')) ?? [];
    server.send(JSON.stringify({ type: 'history', messages: history }));

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, data) {
    const { name } = ws.deserializeAttachment();
    const message = { name, text: String(data), at: Date.now() };
    const history = (await this.ctx.storage.get('history')) ?? [];

    history.push(message);
    this.ctx.storage.put('history', history.slice(-50));

    for (const peer of this.ctx.getWebSockets()) {
      peer.send(JSON.stringify(message));
    }
  }
}

export default {
  fetch(request, env) {
    const room = new URL(request.url).searchParams.get('room') || 'lobby';
    return env.ROOMS.getByName(room).fetch(request);
  }
};
```

The worker and the class are in one script. A namespace links the class to
a binding, as for any other resource:

```bash
ow durable-objects create rooms --worker chat --class Room
ow env bind chat-env ROOMS rooms -t durable_object
```

Durable Objects are off for an account until it has a namespace limit: on
a self-hosted platform, set `users.limit_durable_objects`, which is 0 by
default.

`DurableObject` is a global class of the runtime: there is nothing to
import. A class that does not extend it gets the state and the bindings as
the arguments of its constructor.

## How the runner serves an object

**Ids.** `getByName('lobby')` gives an id of 32 bytes. The first 16 name
the object; the last 16 are an HMAC of the first 16 under a key of the
namespace. A namespace refuses the ids of every other namespace, so one
worker cannot guess its way into the objects of another.

**A thread and a context.** A hash of the id selects one thread of the
worker pool, and the object always runs there. The first event creates a
V8 context, runs the script of the worker in it, and calls
`new Room(ctx, env)`. The context stays for the next events. After 60
seconds with no event in flight, the runner drops it.

**Storage.** Each object has a SQLite file. `ctx.storage` sends its
operations to the runner in the order the object makes them, so a `get`
after a `put` that you did not await reads that put. The files have the
durability of [D1](/docs/bindings/d1#durability): a write is confirmed once
it is on the disk of the runner, and changed files go to object storage
every 5 minutes.

**Hibernation.** The runner holds the WebSockets of an object, not the V8
context. An object with open sockets can leave memory; when a client sends a
message, the runner creates the object again and calls `webSocketMessage`.
The `serializeAttachment` value stays with the socket through this.

**Alarms.** The alarm of an object is a row in its SQLite file, and a table
in PostgreSQL is the index of the alarms that are due. The index changes
before the file and follows it after, so a crash between the two makes an
alarm early, never late or lost. The runner reads the file when the time
comes. An alarm that throws runs again after 2, 4, 8, 16, 32 and 64
seconds.

**Deployments.** A new deployment of the worker reaches its objects within
seconds. They finish the events they took, for up to 30 seconds, and the
next event runs the new code on the same storage.

## One owner for each object

An object must run in one place only. If two runners each ran an instance of
`lobby`, each would write its own copy of the storage, and each would hold
half of the sockets.

The [previous post](/blog/one-binary) removed the runner replicas: one
runner serves a platform, and a PostgreSQL advisory lock stops a second
one. So every object has one owner, and the runner needs no leases or
routing between nodes. This is the limit of this release too: all objects
run on one machine, and a restart of the runner closes their WebSockets.
The clients reconnect.

## Gates

Running one event at a time is not enough. An event that awaits a read
lets the next event start, as JavaScript does at each `await`. Our first
version did that: three requests that read a counter and wrote it back all
read 0, and two updates were lost.

The runtime now has the two gates of Cloudflare:

- **Input gate.** While a storage read is under way, no other event reaches
  the object: no new request, no timer, no response of another event. The
  counter of the first section is safe as written.
- **Output gate.** A response, each chunk of its body, a WebSocket message
  and an outbound `fetch` wait until the writes made before them are on
  disk. A client never sees a value that is then lost.

The first output gate waited for every write under way. With a steady
stream of writes from other events, a response with no write of its own
waited 2 seconds behind 40 later writes. Each output now takes a place in
the ordered queue of storage operations, and goes once the writes before
that place are committed.

## Limits

An object serves many clients, so one slow or noisy client must not take
the runner down with it. Each limit has a test that shows the problem it stops:

| Limit                                            | Value             |
| ------------------------------------------------ | ----------------- |
| Storage of a namespace                           | 1 GiB             |
| Storage operations that did not end              | 32 MiB per object |
| Bytes a WebSocket client did not read            | 8 MiB             |
| Bytes a client sent that the object did not take | 8 MiB             |
| Frames that wait to go out                       | 64 MiB per object |
| Objects of an account in memory                  | 100               |

A client past a socket limit loses its connection, and the object gets
`webSocketClose` with code 1008. The sockets of objects also count in the
open WebSockets of the runner.

One bug of this work did not reach a release. Once an object socket had
been open, a runner that got SIGTERM closed the socket and then waited
forever: the slot of the socket went back without telling the drain. A
test now opens a socket, drops it, and checks that the drain hears of it.

## What is not there yet

- **RPC.** A stub has `fetch` only. `stub.increment(5)` throws; send a
  request and read the response instead.
- **SQL storage.** `ctx.storage.sql` throws. The storage is key-value, with
  transactions.
- **More than one runner.** Leases with epochs, and routing between runners,
  will come before the objects can run on more than one machine.

The [Durable Objects documentation](/docs/bindings/durable-objects) has the
full API, the limits and the other differences from Cloudflare.
