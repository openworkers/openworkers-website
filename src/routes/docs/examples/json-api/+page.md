# JSON API

A simple REST-like API with routing, demonstrating how to handle different HTTP methods and paths.

## Code

```typescript
addEventListener('fetch', (event: FetchEvent) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Route: GET /
  if (method === 'GET' && path === '/') {
    return json({ message: 'Welcome to the API', version: '1.0' });
  }

  // Route: GET /users
  if (method === 'GET' && path === '/users') {
    const users = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' }
    ];
    return json(users);
  }

  // Route: GET /users/:id
  const userMatch = path.match(/^\/users\/(\d+)$/);

  if (method === 'GET' && userMatch) {
    const id = parseInt(userMatch[1]);
    return json({ id, name: `User ${id}` });
  }

  // Route: POST /users
  if (method === 'POST' && path === '/users') {
    const body = await request.json();
    const newUser = { id: Date.now(), ...body };
    return json(newUser, 201);
  }

  // Route: GET /echo
  if (method === 'GET' && path === '/echo') {
    return json({
      method,
      path,
      query: Object.fromEntries(url.searchParams),
      headers: Object.fromEntries(request.headers)
    });
  }

  // 404 for everything else
  return json({ error: 'Not found' }, 404);
}

function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

## Usage

```bash
# Get API info
curl https://your-worker.workers.rocks/

# List users
curl https://your-worker.workers.rocks/users

# Get single user
curl https://your-worker.workers.rocks/users/42

# Create user
curl -X POST https://your-worker.workers.rocks/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Charlie"}'

# Echo request details
curl "https://your-worker.workers.rocks/echo?foo=bar"
```

## Key concepts

- **URL parsing** - Use `new URL(request.url)` to parse path and query params
- **Method routing** - Check `request.method` for GET, POST, PUT, DELETE
- **Path matching** - Use regex or string comparison for routes
- **JSON responses** - Helper function for consistent JSON output
- **Request body** - Use `await request.json()` to parse JSON body
