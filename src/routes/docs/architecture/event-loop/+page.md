# Event Loop

This document describes how the V8 runtime communicates with the Rust event loop to handle asynchronous operations.

## Quick Summary

| Direction     | Channel            | Purpose                     |
| ------------- | ------------------ | --------------------------- |
| **JS → Rust** | `SchedulerMessage` | Request async operations    |
| **Rust → JS** | `CallbackMessage`  | Return results to callbacks |

---

## Overview

The event loop bridges JavaScript's async world with Rust's tokio runtime:

```
┌─────────────────────────────────────────────────────────────────┐
│                     V8 Runtime (sync)                           │
│                                                                 │
│   fetch('https://...')                                          │
│       │                                                         │
│       ▼                                                         │
│   __nativeFetchStreaming(request, callback)                     │
│       │                                                         │
│       ├─► Store callback in fetch_callbacks[callback_id]        │
│       │                                                         │
│       └─► scheduler_tx.send(FetchStreaming(callback_id, req))   │
└─────────────────────────────────────────────────────────────────┘
                              │
                    mpsc::UnboundedChannel
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Event Loop (async tokio)                      │
│                                                                 │
│   while let Some(msg) = scheduler_rx.recv().await {             │
│       match msg {                                               │
│           FetchStreaming(id, req) => {                          │
│               tokio::spawn(async {                              │
│                   let result = ops.handle(Fetch(req)).await;    │
│                   callback_tx.send(FetchSuccess(id, result));   │
│               });                                               │
│           }                                                     │
│       }                                                         │
│   }                                                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                    mpsc::UnboundedChannel
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   V8 Runtime (process_callbacks)                │
│                                                                 │
│   while let Ok(msg) = callback_rx.try_recv() {                  │
│       match msg {                                               │
│           FetchSuccess(id, result) => {                         │
│               let callback = fetch_callbacks.remove(id);        │
│               callback.call(result);                            │
│           }                                                     │
│       }                                                         │
│   }                                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Message Types

### SchedulerMessage (JS → Rust)

Sent from V8 to request async operations:

```rust
pub enum SchedulerMessage {
    // Timers
    ScheduleTimeout(CallbackId, u64),      // setTimeout
    ScheduleInterval(CallbackId, u64),     // setInterval
    ClearTimer(CallbackId),                // clearTimeout/clearInterval

    // Fetch
    FetchStreaming(CallbackId, HttpRequest),

    // Bindings
    BindingFetch(CallbackId, String, HttpRequest),   // Assets binding
    BindingStorage(CallbackId, String, StorageOp),   // Storage binding
    BindingKv(CallbackId, String, KvOp),             // KV binding

    // Streams
    StreamRead(CallbackId, StreamId),      // Read next chunk
    StreamCancel(StreamId),                // Cancel stream

    // Logging
    Log(LogLevel, String),                 // Fire-and-forget

    Shutdown,                              // Cleanup
}
```

### CallbackMessage (Rust → JS)

Sent from event loop back to V8 with results:

```rust
pub enum CallbackMessage {
    // Timers
    ExecuteTimeout(CallbackId),
    ExecuteInterval(CallbackId),

    // Fetch
    FetchError(CallbackId, String),
    FetchStreamingSuccess(CallbackId, HttpResponseMeta, StreamId),

    // Streams
    StreamChunk(CallbackId, StreamChunk),

    // Bindings
    StorageResult(CallbackId, StorageResult),
    KvResult(CallbackId, KvResult),
}
```

---

## Callback Pattern

All async operations follow the same pattern:

### 1. JS calls native function

```javascript
// User code
const response = await fetch('https://api.example.com');

// Internally becomes:
__nativeFetchStreaming(request, (result) => {
  // This callback is stored and invoked later
  resolve(result);
});
```

### 2. Native function stores callback

```rust
fn native_fetch_streaming(/* ... */) {
    // Generate unique ID
    let callback_id = next_callback_id();

    // Store JS callback for later
    fetch_callbacks.insert(callback_id, callback);

    // Send request to event loop
    scheduler_tx.send(FetchStreaming(callback_id, request));
}
```

### 3. Event loop processes request

```rust
// In run_event_loop()
SchedulerMessage::FetchStreaming(callback_id, request) => {
    tokio::spawn(async move {
        // Execute via OperationsHandler
        let result = ops.handle(Operation::Fetch(request)).await;

        // Send result back
        callback_tx.send(FetchStreamingSuccess(callback_id, result));
    });
}
```

### 4. Runtime invokes callback

```rust
// In process_callbacks()
CallbackMessage::FetchStreamingSuccess(callback_id, meta, stream_id) => {
    // Retrieve stored callback
    let callback = fetch_callbacks.remove(&callback_id);

    // Call JavaScript function with result
    callback.call(scope, &[meta_obj.into()]);
}
```

---

## Timer Implementation

### setTimeout

```
setTimeout(fn, 100)
    │
    ▼
ScheduleTimeout(id, 100) ──► Event Loop
                                 │
                                 ▼
                          tokio::spawn(async {
                              sleep(100ms).await;
                              callback_tx.send(ExecuteTimeout(id));
                          })
                                 │
                                 ▼
                          ExecuteTimeout(id) ──► __executeTimer(id)
                                                       │
                                                       ▼
                                                 Calls stored fn
```

### setInterval

Similar, but the spawned task loops:

```rust
tokio::spawn(async move {
    let mut interval = tokio::time::interval(duration);
    interval.tick().await; // Skip first immediate tick

    loop {
        interval.tick().await;
        if callback_tx.send(ExecuteInterval(id)).is_err() {
            break; // Channel closed, stop
        }
    }
});
```

### clearTimeout / clearInterval

```rust
SchedulerMessage::ClearTimer(callback_id) => {
    if let Some(handle) = running_tasks.remove(&callback_id) {
        handle.abort(); // Cancel the tokio task
    }
}
```

---

## Binding Operations

Bindings (Storage, KV) follow the same pattern:

```
env.KV.get('key')
    │
    ▼
__nativeBindingKv('KV', 'get', {key}, callback)
    │
    ▼
BindingKv(id, 'KV', KvOp::Get{key}) ──► Event Loop
                                            │
                                            ▼
                                     ops.handle(BindingKv{...})
                                            │
                                            ▼
                                     Runner executes with credentials
                                            │
                                            ▼
                                     KvResult(id, result) ──► callback(result)
```

The binding name (`'KV'`) is passed to the Runner, which looks up the actual credentials and executes the operation.

---

## Stream Handling

Streams require multiple round-trips:

```
fetch(...).then(r => r.body.getReader())
    │
    ▼
FetchStreaming ──► Event Loop
                       │
                       ▼
                 Create StreamId, start background task
                       │
                       ▼
                 FetchStreamingSuccess(id, meta, stream_id)
                       │
                       ▼
reader.read() ──► StreamRead(callback_id, stream_id)
                       │
                       ▼
                 Read from mpsc channel
                       │
                       ▼
                 StreamChunk(callback_id, Data(bytes))
                       │
                       ▼
                 ... repeat until Done ...
```

---

## Integration Points

### process_callbacks()

Called periodically during execution to:

1. **Pump V8 message loop** - Process V8 internal tasks
2. **Process CallbackMessages** - Invoke JS callbacks with results
3. **Run microtasks** - Execute Promise continuations

```rust
pub fn process_callbacks(&mut self) {
    // 1. V8 internal tasks (Atomics, WebAssembly, etc.)
    while v8::Platform::pump_message_loop(platform, scope, false) {}

    // 2. Our custom callbacks
    while let Ok(msg) = self.callback_rx.try_recv() {
        match msg { /* ... */ }
    }

    // 3. Microtasks (Promises, async/await)
    scope.perform_microtask_checkpoint();
}
```

### OperationsHandler

All I/O goes through the Runner's `OperationsHandler`:

```rust
pub enum Operation {
    Fetch(HttpRequest),
    BindingFetch { binding: String, request: HttpRequest },
    BindingStorage { binding: String, op: StorageOp },
    BindingKv { binding: String, op: KvOp },
    Log { level: LogLevel, message: String },
}
```

This allows the Runner to:

- Inject credentials for bindings
- Apply rate limits
- Log operations
- Enforce security policies

---

## Key Files

| File                                                   | Purpose                                       |
| ------------------------------------------------------ | --------------------------------------------- |
| `openworkers-runtime-v8/src/runtime/mod.rs`            | Runtime struct, event loop, process_callbacks |
| `openworkers-runtime-v8/src/runtime/bindings/`         | Native V8 functions                           |
| `openworkers-runtime-v8/src/runtime/stream_manager.rs` | Stream coordination                           |
| `openworkers-core/src/ops.rs`                          | Operation, OperationResult enums              |

---

## Design Decisions

### Unbounded Channels

We use `mpsc::unbounded_channel` for simplicity. Backpressure is handled at higher levels (stream buffer, semaphore for worker pool).

### Fire-and-Forget Logging

`Log` messages don't return a result - they're sent and forgotten. The Runner handles delivery to NATS.

### Callback Storage

Callbacks are stored in `HashMap<CallbackId, v8::Global<v8::Function>>`. The `v8::Global` prevents garbage collection while the operation is pending.
