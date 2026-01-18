# Form Handling

Handle HTML forms and file uploads.

## URL-Encoded Forms

Standard HTML form with `application/x-www-form-urlencoded`:

```typescript
export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'POST') {
      const form = await request.formData();
      const name = form.get('name');
      const email = form.get('email');

      return Response.json({ name, email });
    }

    // Show form
    const html = `
      <form method="POST">
        <input name="name" placeholder="Name" required>
        <input name="email" type="email" placeholder="Email" required>
        <button type="submit">Submit</button>
      </form>
    `;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
};
```

## JSON Body

API endpoint accepting JSON:

```typescript
export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const contentType = request.headers.get('content-type') || '';

    if (!contentType.includes('application/json')) {
      return new Response('Expected JSON', { status: 400 });
    }

    const body = await request.json();

    // Process body
    return Response.json({
      received: body,
      timestamp: Date.now()
    });
  }
};
```

## File Upload

Handle `multipart/form-data` with files:

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'POST') {
      const form = await request.formData();
      const file = form.get('file') as File;

      if (!file) {
        return new Response('No file uploaded', { status: 400 });
      }

      // Read file content
      const content = await file.arrayBuffer();

      // Save to storage (requires Storage binding)
      await env.STORAGE.put(file.name, new Uint8Array(content));

      return Response.json({
        name: file.name,
        size: file.size,
        type: file.type
      });
    }

    const html = `
      <form method="POST" enctype="multipart/form-data">
        <input name="file" type="file" required>
        <button type="submit">Upload</button>
      </form>
    `;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
};
```

## Validation

Validate form data before processing:

```typescript
interface ContactForm {
  name: string;
  email: string;
  message: string;
}

function validate(data: FormData): ContactForm | null {
  const name = data.get('name')?.toString().trim();
  const email = data.get('email')?.toString().trim();
  const message = data.get('message')?.toString().trim();

  if (!name || name.length < 2) return null;
  if (!email || !email.includes('@')) return null;
  if (!message || message.length < 10) return null;

  return { name, email, message };
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const form = await request.formData();
    const data = validate(form);

    if (!data) {
      return Response.json({ error: 'Invalid form data' }, { status: 400 });
    }

    // Process valid data
    return Response.json({ success: true, data });
  }
};
```
