# Stream Cancellation

This document explains how OpenWorkers handles client disconnection during streaming responses (SSE, chunked responses, etc.) and how worker code can gracefully respond to cancellation.

## The Problem

When a client disconnects during a streaming response (e.g., user closes browser tab, `Ctrl+C` on curl), the worker should:

1. **Stop sending data** - No point writing to a dead connection
2. **Not waste resources** - CPU cycles producing data nobody will receive
3. **Allow cleanup** - Worker may need to release resources

## How It Works

### Detection Mechanism

OpenWorkers detects client disconnection at multiple levels:

```
┌─────────────────────────────────────────────────────────────────┐
│                      Client Disconnects                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Actix-web / HTTP Layer                        │
│                                                                  │
│   • Detects TCP connection closed                                │
│   • Drops the response stream receiver                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      StreamManager (Rust)                        │
│                                                                  │
│   • Channel sender is dropped                                    │
│   • has_sender(stream_id) returns false                          │
│   • try_write_chunk() returns error                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    JavaScript Runtime                            │
│                                                                  │
│   • controller.signal.aborted = true                             │
│   • enqueue() throws TypeError                                   │
│   • __responseStreamIsClosed() returns true                      │
└─────────────────────────────────────────────────────────────────┘
```

### Signal-Based Detection

The recommended way to detect cancellation is via `controller.signal`:

```javascript
export default {
  async fetch(request, env, ctx) {
    const stream = new ReadableStream({
      async start(controller) {
        for (let i = 0; i < 100; i++) {
          // Check if client disconnected
          if (controller.signal.aborted) {
            console.log('Client disconnected, stopping');
            break;
          }

          controller.enqueue(`data: event ${i}\n\n`);
          await new Promise(r => setTimeout(r, 100));
        }

        // Always close the stream (even if aborted)
        controller.close();
      }
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream' }
    });
  }
};
```

### Throw-Based Detection

If you don't check `signal.aborted`, `enqueue()` will throw when the client disconnects:

```javascript
export default {
  async fetch(request, env, ctx) {
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for (let i = 0; i < 100; i++) {
            controller.enqueue(`data: event ${i}\n\n`);
            await new Promise(r => setTimeout(r, 100));
          }
          controller.close();
        } catch (error) {
          // TypeError: Cannot enqueue: client disconnected
          console.log('Stream error:', error.message);
        }
      }
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream' }
    });
  }
};
```

---

## Behavior by Response Type

| Response Type | Cancellation Detection | Resource Waste |
|--------------|------------------------|----------------|
| `new Response("json")` | N/A (one-shot) | None |
| `ReadableStream` (user code) | `signal.aborted` or `enqueue()` throws | Minimal |
| `fetch()` forward | Automatic via `__streamResponseBody` | None |
| Processed fetch | Same as ReadableStream | Minimal |

### Simple Response (No Streaming)

```javascript
// No cancellation concern - body is already in memory
return new Response(JSON.stringify({ data: 'hello' }));
```

### Fetch Forward (Pass-through)

```javascript
// Automatic cancellation - OpenWorkers handles it
export default {
  async fetch(request) {
    return fetch('https://upstream.example.com/stream');
  }
};
```

The runtime automatically stops reading from upstream when the client disconnects.

### Custom ReadableStream

```javascript
// Manual cancellation - check signal or catch throw
const stream = new ReadableStream({
  async start(controller) {
    while (hasMoreData()) {
      if (controller.signal.aborted) break;  // Recommended
      controller.enqueue(getNextChunk());
    }
  }
});
```

---

## Internal Implementation

### Two-Channel Architecture

The streaming response uses two channels:

1. **StreamManager channel** - JS writes chunks via `__responseStreamWrite`, a spawned task reads them
2. **ResponseBody channel** - The spawned task forwards chunks to actix for HTTP delivery

```
┌──────────────┐    StreamManager     ┌──────────────┐    ResponseBody    ┌──────────┐
│  JS Worker   │ ──── channel ─────▶ │ Spawned Task │ ──── channel ────▶ │  Actix   │
│  enqueue()   │                      │  (select!)   │                    │  HTTP    │
└──────────────┘                      └──────────────┘                    └──────────┘
```

When actix detects client disconnect (TCP write fails), it drops the ResponseBody receiver. The spawned task detects this via `tx.closed()` and calls `stream_manager.close_stream()`.

### exec() Loop Detection

The V8 runtime's `exec()` loop checks for stream cancellation:

```rust
// In worker.rs exec() loop
if !self.runtime.stream_manager.has_sender(stream_id) {
    // Client disconnected - abort the signal
    ctrl._abortController.abort('Client disconnected');
}

// Exit when:
// - active_streams == 0 (worker closed the stream), OR
// - Grace period exceeded (~100ms after signal aborted)
request_complete && (active_streams == 0 || grace_period_exceeded)
```

The grace period gives the worker time to react to `signal.aborted` and close the stream properly. If the worker ignores the signal, we force exit after ~100ms to prevent resource waste.

### enqueue() Validation

The `ReadableStreamDefaultController.enqueue()` checks before writing:

```javascript
// In streams.rs
enqueue(chunk) {
    // Check if stream is closed (client disconnected)
    if (this._responseStreamId !== undefined &&
        __responseStreamIsClosed(this._responseStreamId)) {
        this._abortController.abort('Client disconnected');
        throw new TypeError('Cannot enqueue: client disconnected');
    }

    this._queue.push({ type: 'chunk', value: chunk });
    this._processQueue();
}
```

### __streamResponseBody Detection

For fetch forward and processed responses:

```javascript
// In worker.rs __streamResponseBody
while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    while (!__responseStreamWrite(streamId, chunk)) {
        if (__responseStreamIsClosed(streamId)) {
            cancelled = true;
            break;  // Stop forwarding
        }
        await new Promise(r => setTimeout(r, 1));
    }

    if (cancelled) break;
}

if (cancelled) {
    await reader.cancel('Client disconnected');
}
```

---

## Best Practices

### 1. Always Check Signal in Long-Running Streams

```javascript
async start(controller) {
    while (condition) {
        if (controller.signal.aborted) {
            // Cleanup if needed
            break;
        }
        controller.enqueue(data);
        await delay();
    }
}
```

### 2. Worker Continues After Disconnect

The worker is not forcefully terminated. It can continue doing work:

```javascript
async start(controller) {
    for (let i = 0; i < 100; i++) {
        if (controller.signal.aborted) {
            console.log('Client left, but I can still cleanup');
            await saveState();  // This still runs
            break;
        }
        controller.enqueue(data);
    }
}
```

### 3. Always Close the Stream

Always call `controller.close()` at the end, even if aborted. This ensures the stream is properly cleaned up:

```javascript
async start(controller) {
    for (let i = 0; i < 100; i++) {
        if (controller.signal.aborted) {
            console.log('Client disconnected');
            break;
        }
        controller.enqueue(data);
        await delay();
    }

    // Always close - this is safe even if aborted
    controller.close();
}
```

If you try to `enqueue()` after the client disconnects, it will throw. But `close()` is safe to call.

### 4. Handle enqueue() Errors

If you call `enqueue()` after disconnect, it throws. Wrap in try/catch if needed:

```javascript
async start(controller) {
    try {
        // Stream logic that might outlive the client
        controller.enqueue(data);
    } catch (error) {
        if (error.message.includes('cancelled')) {
            // Expected - client disconnected
        } else {
            throw error;
        }
    }
    controller.close();
}
```

---

## Known Limitations

### Detection Delay

There is an inherent delay (typically 1-5 seconds) between when a client disconnects and when the worker detects it. This is due to:

1. **TCP buffering** - Data is buffered at the OS level before being sent
2. **HTTP chunked encoding** - Actix buffers chunks before writing to the socket
3. **Write-based detection** - Disconnect is only detected when a write fails

This is a fundamental limitation of HTTP streaming over TCP, not specific to OpenWorkers. The worker will eventually detect the disconnect and can then clean up.

---

## Testing Cancellation

You can test cancellation behavior with curl:

```bash
# Start streaming request
curl -N 'https://your-worker.workers.dev/stream'

# Press Ctrl+C to disconnect
# Worker should detect and stop
```

Or with a timeout:

```bash
# Disconnect after 2 seconds
timeout 2 curl -N 'https://your-worker.workers.dev/stream'
```

---

## Key Files

| File | Purpose |
|------|---------|
| `openworkers-runtime-v8/src/worker.rs` | exec() loop cancellation detection |
| `openworkers-runtime-v8/src/runtime/streams.rs` | ReadableStream with signal support |
| `openworkers-runtime-v8/src/runtime/stream_manager.rs` | Rust-side channel management |
| `openworkers-runtime-v8/src/runtime/bindings/streams.rs` | `__responseStreamIsClosed` binding |
