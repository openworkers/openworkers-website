# Runtime APIs

OpenWorkers implements standard Web APIs compatible with Cloudflare Workers and the WinterCG spec.

## Fetch API

### fetch()

Make HTTP requests from your worker.

```javascript
const response = await fetch('https://api.example.com/data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ key: 'value' })
});

const data = await response.json();
```

Supported methods: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`.

### Request

```javascript
const request = new Request('https://example.com', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ hello: 'world' })
});

// Properties
request.method; // 'POST'
request.url; // 'https://example.com'
request.headers; // Headers object

// Body methods
await request.text(); // Read as string
await request.json(); // Parse as JSON
await request.arrayBuffer(); // Read as ArrayBuffer
await request.formData(); // Parse as FormData

// Clone (useful when body needs to be read multiple times)
const clone = request.clone();
```

### Response

```javascript
// Simple response
new Response('Hello World');

// With options
new Response(JSON.stringify({ ok: true }), {
  status: 200,
  headers: { 'Content-Type': 'application/json' }
});

// Properties
response.status; // 200
response.statusText; // 'OK'
response.ok; // true (status 200-299)
response.headers; // Headers object

// Body methods
await response.text();
await response.json();
await response.arrayBuffer();
await response.formData();
```

### Headers

```javascript
const headers = new Headers({
  'Content-Type': 'application/json',
  'X-Custom': 'value'
});

headers.set('Authorization', 'Bearer token');
headers.append('Accept', 'application/json');
headers.get('Content-Type'); // 'application/json'
headers.has('X-Custom'); // true
headers.delete('X-Custom');

// Iterate
for (const [name, value] of headers) {
  console.log(name, value);
}
```

---

## URL APIs

### URL

Parse and manipulate URLs.

```javascript
const url = new URL('https://example.com:8080/path?foo=bar#hash');

url.protocol; // 'https:'
url.host; // 'example.com:8080'
url.hostname; // 'example.com'
url.port; // '8080'
url.pathname; // '/path'
url.search; // '?foo=bar'
url.hash; // '#hash'
url.origin; // 'https://example.com:8080'

// Modify
url.pathname = '/new-path';
url.searchParams.set('key', 'value');
url.href; // 'https://example.com:8080/new-path?foo=bar&key=value#hash'
```

Relative URLs with base:

```javascript
const url = new URL('/api/users', 'https://example.com');
url.href; // 'https://example.com/api/users'
```

### URLSearchParams

```javascript
const params = new URLSearchParams('foo=1&bar=2');

params.get('foo'); // '1'
params.getAll('foo'); // ['1']
params.has('bar'); // true
params.set('foo', '3');
params.append('baz', '4');
params.delete('bar');
params.toString(); // 'foo=3&baz=4'

// From object
const params2 = new URLSearchParams({ a: '1', b: '2' });

// Iterate
for (const [key, value] of params) {
  console.log(key, value);
}
```

---

## Text Encoding

### TextEncoder

Encode strings to UTF-8 bytes.

```javascript
const encoder = new TextEncoder();
const bytes = encoder.encode('Hello World');
// Uint8Array(11) [72, 101, 108, 108, 111, ...]
```

### TextDecoder

Decode UTF-8 bytes to strings.

```javascript
const decoder = new TextDecoder();
const text = decoder.decode(new Uint8Array([72, 101, 108, 108, 111]));
// 'Hello'
```

### Base64

```javascript
// Encode string to base64
const encoded = btoa('Hello World'); // 'SGVsbG8gV29ybGQ='

// Decode base64 to string
const decoded = atob('SGVsbG8gV29ybGQ='); // 'Hello World'
```

---

## Binary Data

### Blob

Immutable raw binary data.

```javascript
const blob = new Blob(['Hello ', 'World'], { type: 'text/plain' });

blob.size; // 11
blob.type; // 'text/plain'

await blob.text(); // 'Hello World'
await blob.arrayBuffer(); // ArrayBuffer
blob.slice(0, 5); // New Blob with 'Hello'
```

### File

A Blob with a name and last modified date.

```javascript
const file = new File(['content'], 'file.txt', {
  type: 'text/plain',
  lastModified: Date.now()
});

file.name; // 'file.txt'
file.lastModified; // timestamp
```

### FormData

Handle multipart form data.

```javascript
const form = new FormData();
form.append('name', 'John');
form.append('file', new Blob(['data']), 'file.txt');

form.get('name'); // 'John'
form.getAll('name'); // ['John']
form.has('file'); // true
form.delete('name');

// Iterate
for (const [key, value] of form) {
  console.log(key, value);
}
```

Parse incoming form data:

```javascript
addEventListener('fetch', async (event) => {
  const form = await event.request.formData();
  const name = form.get('name');
  const file = form.get('file'); // File object
});
```

---

## Streams

### ReadableStream

Create streaming responses (SSE, chunked data).

```javascript
const stream = new ReadableStream({
  start(controller) {
    controller.enqueue(new TextEncoder().encode('Hello '));
    controller.enqueue(new TextEncoder().encode('World'));
    controller.close();
  }
});

new Response(stream, {
  headers: { 'Content-Type': 'text/plain' }
});
```

Server-Sent Events example:

```javascript
const stream = new ReadableStream({
  async start(controller) {
    const encoder = new TextEncoder();

    for (let i = 0; i < 5; i++) {
      controller.enqueue(encoder.encode(`data: Message ${i}\n\n`));
      await new Promise((r) => setTimeout(r, 1000));
    }

    controller.close();
  }
});

new Response(stream, {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache'
  }
});
```

Reading a stream:

```javascript
const reader = stream.getReader();

while (true) {
  const { done, value } = await reader.read();

  if (done) break;

  console.log(new TextDecoder().decode(value));
}
```

Split a stream with `tee()`:

```javascript
const [stream1, stream2] = stream.tee();
```

---

## Crypto

### Random values

```javascript
// Generate random UUID
crypto.randomUUID(); // 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

// Fill array with random bytes
const array = new Uint8Array(16);
crypto.getRandomValues(array);
```

### Hashing (digest)

```javascript
const data = new TextEncoder().encode('Hello World');

const hash = await crypto.subtle.digest('SHA-256', data);
// ArrayBuffer

// Convert to hex
const hashArray = Array.from(new Uint8Array(hash));
const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
```

Supported algorithms: `SHA-1`, `SHA-256`, `SHA-384`, `SHA-512`.

### HMAC signing

```javascript
const encoder = new TextEncoder();
const keyData = encoder.encode('secret-key');
const data = encoder.encode('message to sign');

// Import key
const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);

// Sign
const signature = await crypto.subtle.sign('HMAC', key, data);

// Verify
const isValid = await crypto.subtle.verify('HMAC', key, signature, data);
```

---

## Timers

```javascript
// Execute after delay
const timeoutId = setTimeout(() => {
  console.log('Executed after 1 second');
}, 1000);

clearTimeout(timeoutId); // Cancel

// Execute repeatedly
const intervalId = setInterval(() => {
  console.log('Every 500ms');
}, 500);

clearInterval(intervalId); // Cancel

// Queue microtask
queueMicrotask(() => {
  console.log('Runs before next event loop tick');
});
```

---

## Abort Controller

Cancel fetch requests or other async operations.

```javascript
const controller = new AbortController();

// Abort after 5 seconds
setTimeout(() => controller.abort(), 5000);

try {
  const response = await fetch('https://slow-api.example.com', {
    signal: controller.signal
  });
} catch (err) {
  if (err.name === 'AbortError') {
    console.log('Request was aborted');
  }
}
```

---

## Console

```javascript
console.log('Info message');
console.info('Info message');
console.warn('Warning message');
console.error('Error message');
console.debug('Debug message');

// Objects are JSON-serialized
console.log({ user: 'john', id: 123 });
```

---

## Other APIs

### structuredClone

Deep clone any value.

```javascript
const original = { nested: { value: 42 }, array: [1, 2, 3] };
const clone = structuredClone(original);

clone.nested.value = 100;
original.nested.value; // Still 42
```

### performance.now()

High-resolution timestamp (milliseconds since worker start).

```javascript
const start = performance.now();
// ... do work ...
const duration = performance.now() - start;
console.log(`Took ${duration}ms`);
```

### Global aliases

```javascript
globalThis; // The global object
self; // Alias (Web Worker compatibility)
global; // Alias (Node.js compatibility)
```

---

## Limitations

- **No dynamic imports** — Code must be pre-bundled. Use `esbuild` or similar to bundle your code before deploying. The `export default` handler syntax works, but `import './module.js'` at runtime does not.
- **No DOM** — No `document`, `window`, or browser-specific APIs
- **No WebSocket** — Only HTTP via Fetch API
- **No Node.js APIs** — No `fs`, `path`, `process`, etc.
- **Single-threaded** — No Web Workers or shared memory
