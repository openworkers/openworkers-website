# Security Model

OpenWorkers executes untrusted code in a multi-tenant environment. This document details the security architecture.

## Quick Summary

| Layer          | Protection                                    | Default    |
| -------------- | --------------------------------------------- | ---------- |
| **Memory**     | V8 heap limits + custom ArrayBuffer allocator | 128 MB     |
| **CPU Time**   | POSIX timer (Linux)                           | 50 ms      |
| **Wall Clock** | Watchdog thread                               | 30 seconds |
| **Network**    | Fetch via operations handler                  | Controlled |
| **Filesystem** | Not exposed                                   | Blocked    |
| **Processes**  | Not exposed                                   | Blocked    |

---

## Defense in Depth

```
┌─────────────────────────────────────────────────────────────────┐
│                    Untrusted JavaScript                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     V8 Isolate Sandbox                           │
│                                                                  │
│   • Separate heap per worker                                     │
│   • No shared memory between isolates                            │
│   • Limited API surface (no fs, no child_process)                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Resource Limits                               │
│                                                                  │
│   • Memory: V8 heap + ArrayBuffer allocator                      │
│   • CPU: POSIX timer (Linux) / Wall-clock fallback               │
│   • Concurrency: Semaphore-controlled worker pool                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Operations Handler                            │
│                                                                  │
│   • All I/O routed through Rust                                  │
│   • Fetch requests validated/controlled                          │
│   • Bindings resolve credentials server-side                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Memory Isolation

### V8 Heap Limits

Each worker gets an isolated V8 heap with configurable limits:

```rust
pub struct RuntimeLimits {
    pub heap_initial_mb: usize,  // Default: 1 MB
    pub heap_max_mb: usize,      // Default: 128 MB
}
```

When the heap limit is exceeded, V8 throws an out-of-memory error and the worker is terminated.

### Custom ArrayBuffer Allocator

**Problem:** V8's heap limits don't cover ArrayBuffer allocations (Uint8Array, Buffer, etc.). A worker could allocate massive buffers without triggering heap limits.

**Solution:** Custom allocator that tracks and limits external memory:

```
Worker tries to allocate 1GB ArrayBuffer
        │
        ▼
┌─────────────────────────────────────┐
│    Custom ArrayBuffer Allocator      │
│                                      │
│    current: 50 MB                    │
│    max: 128 MB                       │
│    requested: 1024 MB                │
│                                      │
│    50 + 1024 > 128 → REJECT          │
└─────────────────────────────────────┘
        │
        ▼
RangeError: Array buffer allocation failed
        │
        ▼
Worker terminated with MemoryLimit
```

**Implementation details:**

- Uses `AtomicUsize` for lock-free tracking
- Sequential consistency (`SeqCst`) for strong ordering
- Rollback on rejection (prevents quota exhaustion)
- Memory freed when buffers are garbage collected

---

## CPU Time Limits

### Linux: POSIX Timer

On Linux, we use `CLOCK_THREAD_CPUTIME_ID` to track actual CPU time:

```
Worker starts executing
        │
        ▼
POSIX timer armed (50ms CPU time)
        │
        ├──► JavaScript runs (uses CPU)
        │
        ├──► await fetch(...) (CPU timer PAUSED - I/O wait)
        │
        ├──► JavaScript runs (CPU timer RESUMES)
        │
        ▼
Timer fires SIGALRM after 50ms of CPU time
        │
        ▼
isolate.terminate_execution()
        │
        ▼
Worker terminated with CpuTimeLimit
```

**Key properties:**

- Counts ONLY actual CPU cycles
- I/O waits, network latency, sleep don't count
- Per-thread timer (accurate for concurrent workers)
- One-shot timer per request

### macOS/BSD: Wall-Clock Fallback

macOS doesn't support per-thread CPU timers. Workers rely on wall-clock timeout instead.

---

## Wall-Clock Timeout

Protects against slow operations (network waits, infinite loops with sleep):

```rust
// Watchdog thread spawned per execution
thread::spawn(move || {
    match cancel_rx.recv_timeout(Duration::from_secs(30)) {
        Ok(()) => { /* completed normally */ }
        Err(Timeout) => {
            isolate_handle.terminate_execution();
        }
    }
});
```

**Default:** 30 seconds

**Cancellation:** When worker completes, signal sent to watchdog thread for cleanup.

---

## Termination Reasons

When a worker is terminated, we detect why (in priority order):

```rust
pub enum TerminationReason {
    CpuTimeLimit,         // CPU budget exhausted (Linux)
    WallClockTimeout,     // Wall-clock timeout exceeded
    MemoryLimit,          // Heap or ArrayBuffer limit hit
    Exception(String),    // JavaScript threw an error
    Terminated,           // External signal
    Aborted,              // abort() called
}
```

Each reason maps to an HTTP status:

| Reason           | HTTP Status               |
| ---------------- | ------------------------- |
| CpuTimeLimit     | 429 Too Many Requests     |
| MemoryLimit      | 429 Too Many Requests     |
| WallClockTimeout | 504 Gateway Timeout       |
| Exception        | 500 Internal Server Error |

---

## Available APIs

Workers have access to a limited set of Web APIs:

| Category        | APIs                                                                 |
| --------------- | -------------------------------------------------------------------- |
| **Console**     | `console.log`, `console.warn`, `console.error`, `console.debug`      |
| **Fetch**       | `fetch()` (via operations handler)                                   |
| **Timers**      | `setTimeout`, `setInterval`, `clearTimeout`, `clearInterval`         |
| **Crypto**      | `crypto.getRandomValues()`, `crypto.randomUUID()`, `crypto.subtle.*` |
| **Text**        | `TextEncoder`, `TextDecoder`, `btoa()`, `atob()`                     |
| **Web APIs**    | `Blob`, `File`, `FormData`, `Headers`, `Request`, `Response`         |
| **Streams**     | `ReadableStream`, `WritableStream`, `TransformStream`                |
| **URL**         | `URL`, `URLSearchParams`                                             |
| **Performance** | `performance.now()` (100µs precision)                                |

### Crypto Algorithms

- **Hash:** SHA-1, SHA-256, SHA-384, SHA-512
- **HMAC:** All SHA variants
- **Signatures:** ECDSA (P-256, P-384), RSA (RS256, RS384, RS512)

---

## Blocked APIs

The following are intentionally NOT available:

| Feature             | Why Blocked                                  |
| ------------------- | -------------------------------------------- |
| **File System**     | No `fs`, no disk access                      |
| **Child Processes** | No `spawn()`, `exec()`                       |
| **Raw Sockets**     | No TCP/UDP, only HTTP via fetch              |
| **Module System**   | No `require()`, no dynamic imports           |
| **Environment**     | No `process.env` (use `env` binding instead) |
| **System Calls**    | Rust boundary prevents libc access           |

---

## Network Control

All network access goes through the operations handler:

```
fetch("https://api.example.com")
        │
        ▼
__nativeFetchStreaming() - Native V8 function
        │
        ▼
SchedulerMessage::Fetch sent to event loop
        │
        ▼
┌─────────────────────────────────────┐
│       Operations Handler             │
│                                      │
│   • Validate URL (block localhost?) │
│   • Enforce rate limits              │
│   • Add timeout per request          │
│   • Track bytes in/out               │
└─────────────────────────────────────┘
        │
        ▼
reqwest::Client executes request
```

**Configurable controls:**

- DNS blocklist (internal IPs, localhost)
- Rate limiting per worker
- Request/response size limits
- Per-request timeout

---

## Environment Injection

Environment variables and bindings are injected as a frozen object:

```javascript
// Injected by runtime
Object.defineProperty(globalThis, 'env', {
    value: Object.freeze({
        API_KEY: "sk-xxx",        // From environment_values
        KV: { get, put, ... },    // Binding object
        STORAGE: { get, put, ... }
    }),
    writable: false,
    enumerable: true,
    configurable: false
});
```

**Properties:**

- Cannot be modified by worker code
- Cannot be deleted
- Credentials resolved server-side (worker never sees S3 keys, etc.)

---

## Concurrency Limits

### Sequential Worker Pool

Each worker runs in a V8 isolate, but **V8 isolates cannot safely share a thread**. V8's RAII scopes require strict LIFO ordering that async task interleaving would break.

**Solution:** A sequential worker pool where each thread processes ONE worker at a time:

```
┌─────────────────────────────────────────────────────────────┐
│  Thread 0          Thread 1          ...        Thread N-1  │
│  ┌─────────┐      ┌─────────┐                  ┌─────────┐  │
│  │ Channel │      │ Channel │                  │ Channel │  │
│  └────┬────┘      └────┬────┘                  └────┬────┘  │
│       ▼                ▼                            ▼       │
│  ┌─────────┐      ┌─────────┐                  ┌─────────┐  │
│  │LocalSet │      │LocalSet │                  │LocalSet │  │
│  │  + RT   │      │  + RT   │                  │  + RT   │  │
│  └─────────┘      └─────────┘                  └─────────┘  │
│       │                │                            │       │
│  [Task A]          [Task D]                    [Task G]     │
│  [Task B] queue    [Task E] queue              [Task H]     │
│  [Task C]          [Task F]                    [Task I]     │
└─────────────────────────────────────────────────────────────┘

Round-robin distribution: A→0, B→1, C→2, D→0, E→1, ...
Sequential execution: Each thread runs ONE task at a time
```

**Configuration:**

```rust
WORKER_POOL_SIZE = num_cpus        // Thread count (default: CPU cores)
MAX_QUEUED_WORKERS = pool_size * 10 // Queue depth limit

// Example on 8-core machine:
// - 8 concurrent workers (one per thread)
// - Up to 80 queued workers waiting
```

**Why sequential?**

V8's `HandleScope` and `ContextScope` use RAII pattern - they call `Enter()` on creation and `Exit()` on drop. If multiple isolates run on the same thread via async interleaving, the scope stack gets corrupted:

```
❌ With async interleaving (broken):
Thread: Enter(A) → await → Enter(B) → Exit(B) → Exit(A)
V8 sees: Enter(A) → Enter(B) → Exit(B) → Exit(A) ✗ Wrong order!

✅ With sequential execution (safe):
Thread: Enter(A) → work → Exit(A) → Enter(B) → work → Exit(B)
V8 sees: Enter(A) → Exit(A) → Enter(B) → Exit(B) ✓ Correct!
```

**Semaphore prevents queue explosion:**

```rust
let permit = semaphore.acquire_timeout(10s).await?;
// If timeout: return 503 Service Unavailable
```

---

## Timing Attack Mitigation

`performance.now()` is rounded to 100µs to prevent timing attacks:

```javascript
// Returns values like: 1234.5, 1234.6, 1234.7
// NOT: 1234.567891234
performance.now();
```

---

## Threat Model

| Threat               | Attack                     | Protection                      |
| -------------------- | -------------------------- | ------------------------------- |
| **Memory bomb**      | Allocate 1GB buffer        | ArrayBuffer allocator rejects   |
| **CPU mining**       | Infinite loop              | CPU timer terminates (50ms)     |
| **Slow loris**       | Hold connection forever    | Wall-clock timeout (30s)        |
| **Fork bomb**        | Spawn processes            | No process API exposed          |
| **Disk fill**        | Write huge files           | No filesystem API exposed       |
| **Network DoS**      | Infinite outbound requests | Operations handler controls     |
| **Timing attack**    | Measure crypto timing      | `performance.now()` rounded     |
| **Code injection**   | `eval()` malicious code    | Code pre-supplied, eval limited |
| **Credential theft** | Access S3 keys             | Bindings resolve server-side    |

---

## Configuration

### RuntimeLimits

```rust
pub struct RuntimeLimits {
    pub heap_initial_mb: usize,       // Default: 1
    pub heap_max_mb: usize,           // Default: 128
    pub max_cpu_time_ms: u64,         // Default: 50 (Linux only)
    pub max_wall_clock_time_ms: u64,  // Default: 30_000
}
```

### Environment Variables

| Variable                | Description                    | Default        |
| ----------------------- | ------------------------------ | -------------- |
| `WORKER_POOL_SIZE`      | Thread count                   | CPU cores      |
| `MAX_QUEUED_WORKERS`    | Max workers in queue           | pool_size × 10 |
| `WORKER_WAIT_TIMEOUT_MS`| Timeout waiting for queue slot | 10000 (10s)    |
| `RUNTIME_SNAPSHOT_PATH` | V8 snapshot blob               | None           |

---

## Audit Checklist

For security auditors:

- [ ] V8 heap limits enforced (`runtime/mod.rs`)
- [ ] ArrayBuffer allocator limits external memory (`security/array_buffer_allocator.rs`)
- [ ] CPU enforcer terminates on timeout (`security/cpu_enforcer.rs`)
- [ ] Wall-clock guard terminates on timeout (`security/timeout_guard.rs`)
- [ ] Sequential worker pool ensures one isolate per thread (`worker_pool.rs`)
- [ ] No filesystem APIs exposed
- [ ] No child_process APIs exposed
- [ ] Fetch routed through operations handler
- [ ] Bindings resolve credentials server-side
- [ ] Environment object is frozen
- [ ] performance.now() precision reduced
