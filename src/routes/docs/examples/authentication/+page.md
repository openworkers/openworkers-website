# Authentication

Protect routes with authentication.

## Basic Auth

HTTP Basic Authentication:

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const auth = request.headers.get('Authorization');

    if (!auth || !auth.startsWith('Basic ')) {
      return new Response('Unauthorized', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="Protected"' }
      });
    }

    const credentials = atob(auth.slice(6));
    const [username, password] = credentials.split(':');

    if (username !== env.USERNAME || password !== env.PASSWORD) {
      return new Response('Invalid credentials', { status: 403 });
    }

    return new Response('Welcome, ' + username);
  }
};
```

Set `USERNAME` and `PASSWORD` as secrets in your environment.

## Bearer Token

API key or token authentication:

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const auth = request.headers.get('Authorization');

    if (!auth || !auth.startsWith('Bearer ')) {
      return Response.json({ error: 'Missing token' }, { status: 401 });
    }

    const token = auth.slice(7);

    if (token !== env.API_KEY) {
      return Response.json({ error: 'Invalid token' }, { status: 403 });
    }

    return Response.json({ data: 'Protected resource' });
  }
};
```

## JWT Validation

Validate JWT tokens using HMAC:

```typescript
async function verifyJWT(token: string, secret: string): Promise<object | null> {
  const [headerB64, payloadB64, signatureB64] = token.split('.');

  if (!headerB64 || !payloadB64 || !signatureB64) {
    return null;
  }

  // Verify signature
  const encoder = new TextEncoder();
  const data = encoder.encode(`${headerB64}.${payloadB64}`);
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const signature = Uint8Array.from(atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const valid = await crypto.subtle.verify('HMAC', key, signature, data);

  if (!valid) {
    return null;
  }

  // Decode payload
  const payload = JSON.parse(atob(payloadB64));

  // Check expiration
  if (payload.exp && payload.exp < Date.now() / 1000) {
    return null;
  }

  return payload;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const auth = request.headers.get('Authorization');

    if (!auth || !auth.startsWith('Bearer ')) {
      return Response.json({ error: 'Missing token' }, { status: 401 });
    }

    const token = auth.slice(7);
    const payload = await verifyJWT(token, env.JWT_SECRET);

    if (!payload) {
      return Response.json({ error: 'Invalid token' }, { status: 403 });
    }

    return Response.json({ user: payload });
  }
};
```

## Protected Routes

Middleware pattern for multiple protected routes:

```typescript
type Handler = (request: Request, env: Env, user: object) => Promise<Response>;

async function withAuth(
  request: Request,
  env: Env,
  handler: Handler
): Promise<Response> {
  const auth = request.headers.get('Authorization');

  if (!auth || !auth.startsWith('Bearer ')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = auth.slice(7);

  // Validate token (simplified - use JWT in production)
  const user = await env.KV.get(`session:${token}`, 'json');

  if (!user) {
    return Response.json({ error: 'Invalid session' }, { status: 403 });
  }

  return handler(request, env, user);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);

    // Public routes
    if (pathname === '/login') {
      return handleLogin(request, env);
    }

    // Protected routes
    if (pathname === '/profile') {
      return withAuth(request, env, handleProfile);
    }

    if (pathname === '/settings') {
      return withAuth(request, env, handleSettings);
    }

    return new Response('Not Found', { status: 404 });
  }
};

async function handleLogin(request: Request, env: Env): Promise<Response> {
  // Login logic...
  return Response.json({ token: 'generated-session-token' });
}

async function handleProfile(request: Request, env: Env, user: object): Promise<Response> {
  return Response.json({ user });
}

async function handleSettings(request: Request, env: Env, user: object): Promise<Response> {
  return Response.json({ settings: { theme: 'dark' } });
}
```
