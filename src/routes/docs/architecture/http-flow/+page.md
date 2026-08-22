# HTTP Request Flow

This document details how HTTP requests flow through OpenWorkers, from incoming request to outgoing response, including where streaming is supported.

## Quick Summary

| Direction            | Body Handling | Why                                               |
| -------------------- | ------------- | ------------------------------------------------- |
| **Incoming request** | Buffered      | Streamed only when the client opts in (see below) |
| **Outgoing fetch**   | Buffered      | Request body must be complete before sending      |
| **Fetch response**   | Streaming     | Uses `reqwest::bytes_stream()`                    |
| **Worker response**  | Streaming     | Via bounded MPSC channels                         |

## Request Types

### HttpRequest (openworkers-core)

```rust
pub struct HttpRequest {
    pub method: HttpMethod,
    pub url: String,
    pub headers: HashMap<String, String>,
    pub body: RequestBody,
}

pub enum RequestBody {
    None,
    Bytes(Bytes),                                    // Buffered
    Stream(mpsc::Receiver<Result<Bytes, String>>),   // Streaming
}
```

**Design decision:** Input bodies are buffered by default. The runner streams the body only when the request carries the `x-request-body-stream` header, and the streamed path enforces its own size and idle-chunk limits.

**Rationale:**

- Most requests are small JSON payloads
- Buffering keeps the common path simple and bounded
- Streaming input stays opt-in, so a slow client cannot pin a worker by accident

### HttpResponse (openworkers-core)

```rust
pub struct HttpResponse {
    pub status: u16,
    pub headers: Vec<(String, String)>,
    pub body: ResponseBody,
}

pub enum ResponseBody {
    None,
    Bytes(Bytes),                                    // Buffered
    Stream(mpsc::Receiver<Result<Bytes, String>>),   // Streaming
}
```

**Design decision:** Output responses support both streaming and buffered bodies.

---

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    INCOMING HTTP REQUEST                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Hyper (HTTP Server)                        │
│                                                                  │
│   • Buffers entire request body as Bytes                         │
│   • Streams it instead when the client opts in                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 HttpRequest::from_hyper_parts()                  │
│                                                                  │
│   HttpRequest {                                                  │
│       method: GET/POST/...,                                      │
│       url: "https://...",                                        │
│       headers: {...},                                            │
│       body: RequestBody::Bytes(body)  ◄── BUFFERED               │
│   }                                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Runner                                   │
│                                                                  │
│   run_fetch(worker, request, response_tx, ...)                   │
│                                                                  │
│   • Creates V8 Worker with OperationsHandler                     │
│   • Executes with timeout guards                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     V8 Runtime (Worker)                          │
│                                                                  │
│   1. Create JS Request object from HttpRequest                   │
│   2. Call __triggerFetch(request)                                │
│   3. Wait for __lastResponse (notified by the event loop)        │
│   4. Execute event loop for async operations                     │
└─────────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┴─────────────────┐
            ▼                                   ▼
┌─────────────────────┐             ┌─────────────────────────────┐
│   Direct Response   │             │      Worker calls fetch()   │
│                     │             │                             │
│ new Response("Hi")  │             │ await fetch("https://...")  │
│         │           │             │             │               │
│         ▼           │             │             ▼               │
│   Buffered body     │             │  __nativeFetchStreaming()   │
└─────────────────────┘             └─────────────────────────────┘
                                                  │
                                                  ▼
                              ┌─────────────────────────────────────┐
                              │          SchedulerMessage           │
                              │                                     │
                              │   FetchStreaming(callback_id, req)  │
                              │              │                      │
                              │              ▼                      │
                              │        Event Loop                   │
                              └─────────────────────────────────────┘
                                                  │
                                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    RunnerOperations::do_fetch()                  │
│                                                                  │
│   let response = reqwest::Client::request(...).send().await;     │
│                                                                  │
│   // Create bounded channel (capacity: 16)                       │
│   let (tx, rx) = mpsc::channel(16);                              │
│                                                                  │
│   // Background task streams response                            │
│   tokio::spawn(async move {                                      │
│       let mut stream = response.bytes_stream();  ◄── STREAMING   │
│       while let Some(chunk) = stream.next().await {              │
│           tx.send(chunk).await;                                  │
│       }                                                          │
│   });                                                            │
│                                                                  │
│   HttpResponse { body: ResponseBody::Stream(rx) }                │
└─────────────────────────────────────────────────────────────────┘
                                                  │
                                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                       StreamManager                              │
│                                                                  │
│   • Bounded MPSC channel (16 chunks buffer)                      │
│   • Backpressure when consumer is slow                           │
│   • Chunks forwarded to JS ReadableStream                        │
└─────────────────────────────────────────────────────────────────┘
                                                  │
                                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    JavaScript Response                           │
│                                                                  │
│   const response = new Response(stream, { status, headers });    │
│                                                                  │
│   // Worker can read body:                                       │
│   const text = await response.text();        // Buffers all      │
│   // OR                                                          │
│   const reader = response.body.getReader();  // Streaming        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Worker Response                               │
│                                                                  │
│   event.respondWith(response);                                   │
│              │                                                   │
│              ▼                                                   │
│   __streamResponseBody(response):                                │
│     • If native stream: use stream_id directly                   │
│     • Else: read body, write chunks to output stream             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    HttpResponse                                  │
│                                                                  │
│   • If _responseStreamId: ResponseBody::Stream   ◄── STREAMING   │
│   • Else: ResponseBody::Bytes (buffered)                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Hyper Response                              │
│                                                                  │
│   • ResponseBody::Stream → hyper StreamBody                      │
│   • Chunks sent as HTTP chunked encoding                         │
│   • Client receives data as it's produced                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Streaming Details

### Where Streaming Works

| Use Case                 | Supported | Notes                                                |
| ------------------------ | --------- | ---------------------------------------------------- |
| SSE (Server-Sent Events) | ✅        | Response streams to client                           |
| Large file download      | ✅        | Fetch response → client                              |
| Chunked API responses    | ✅        | Progressive JSON, etc.                               |
| Proxy pass-through       | ✅        | Fetch → forward to client                            |
| Request body             | ✅        | Client sends the `x-request-body-stream` header      |
| WebSocket                | ✅        | Outbound; see [WebSockets](/docs/workers/websockets) |

### Where Streaming Does NOT Work

| Use Case            | Supported | Notes                                                  |
| ------------------- | --------- | ------------------------------------------------------ |
| Large file upload   | ❌        | Streamed bodies are size-capped; use presigned S3 URLs |
| Outgoing fetch body | ❌        | Buffered before the request is sent                    |

### Backpressure

The bounded MPSC channel (capacity: 16 chunks) provides natural backpressure:

```
Producer (reqwest)     Channel (16)     Consumer (JS/HTTP)
       │                  │                    │
       ├──► chunk 1 ─────►│                    │
       ├──► chunk 2 ─────►│                    │
       ...                │                    │
       ├──► chunk 16 ────►│ (buffer full)      │
       │    (waits) ◄─────│                    │
       │                  │◄──── read chunk ───┤
       ├──► chunk 17 ────►│                    │
```

If the consumer is slow, the producer waits. Memory usage stays bounded.

---

## Waiting for the Response

The execution loop is event-driven: it waits on a notification from the scheduler and wakes up as soon as a callback result is ready. A short timer bounds the wait so the loop keeps checking the timeout guards even when no callback arrives.

```rust
loop {
    self.runtime.process_callbacks();

    if response_ready {
        break;
    }

    tokio::select! {
        _ = callback_notify.notified() => {}                       // Result ready
        _ = tokio::time::sleep(Duration::from_millis(10)) => {}    // Guard check
    }
}
```

See [Event Loop](/docs/architecture/event-loop) for the full picture.

---

## Key Files

| File                                                   | Purpose                                              |
| ------------------------------------------------------ | ---------------------------------------------------- |
| `openworkers-core/src/http.rs`                         | HttpRequest, HttpResponse, RequestBody, ResponseBody |
| `openworkers-runner/src/ops.rs`                        | `do_fetch()` with reqwest streaming                  |
| `openworkers-runtime-v8/src/worker.rs`                 | V8 worker, response extraction                       |
| `openworkers-runtime-v8/src/runtime/mod.rs`            | Event loop, stream forwarding                        |
| `openworkers-runtime-v8/src/runtime/stream_manager.rs` | Bounded channel coordination                         |

---

## Gotchas

### Request Bodies Are Buffered by Default

```javascript
// This works, but the body is fully buffered first
addEventListener('fetch', async (event) => {
  const body = await event.request.text(); // Already buffered
  // ...
});
```

The client opts into a streamed body with the `x-request-body-stream` header. For large uploads, use presigned S3 URLs instead.

### Fetch Request Bodies Are Also Buffered

```javascript
// Body must be complete before fetch sends
await fetch('https://api.example.com/upload', {
  method: 'POST',
  body: largeData // Buffered, then sent
});
```

### Response Streaming Requires ReadableStream

```javascript
// ✅ Streaming works
return new Response(readableStream);

// ❌ Buffered (entire body in memory)
return new Response(await fetch(...).then(r => r.text()));
```

### Pass-through Streaming

```javascript
// ✅ Efficient: streams through without buffering
addEventListener('fetch', async (event) => {
  const upstream = await fetch('https://cdn.example.com/large-file');
  event.respondWith(upstream); // Streams directly
});
```
