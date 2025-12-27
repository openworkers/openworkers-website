# About OpenWorkers

OpenWorkers is a serverless runtime environment that allows you to run your code without having to worry about the underlying infrastructure.

## Features

- **Fast** - OpenWorkers is built on top of the javascript V8 engine.
- **Secure** - Each worker runs in its own V8 isolate, which means that your code is isolated from other workers.
- **Easy to use** - OpenWorkers is designed to be easy to use, so you can focus on writing your code while we take care of the rest.

## Getting started

To get started, you need to create an account. You can do this by clicking the "Sign in" button in the top right corner of the page.

You will then be redirected to the sign in page. Sign in with your GitHub account.

After logging in, you will be redirected to the dashboard. Here you can see all your workers and create new ones.

### Creating a worker

To create a worker, click the "Create a worker" button in the top right corner of the page.

Here you can enter the name of the worker and select a language template.

The name of the worker must be unique and can only contain letters, numbers and dashes, it will be deployed to `https://<worker-name>.workers.rocks`.

### Editing a worker

To edit a worker, click the "Edit" button in worker overview page.

Here you can edit the code of the worker.

The default returns a "Hello World" html page.

```typescript
addEventListener('fetch', (event: FetchEvent) => {
  event.respondWith(handleRequest(event.request).catch((err: Error) => new Response(err.stack, { status: 500 })));
});

// More examples available at: https://openworkers.com/docs
async function handleRequest(request: Request): Promise<Response> {
  const { pathname } = new URL(request.url);

  // Return a 404 response for requests to /favicon.ico.
  if (pathname.startsWith('/favicon.ico')) {
    return new Response('Not found', { status: 404 });
  }

  // Return a JSON response for requests to /api containing the requested pathname.
  if (pathname.startsWith('/api')) {
    return new Response(JSON.stringify({ pathname }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Return a HTML response for all other requests.
  return new Response('<h3>Hello world!</h3>', {
    headers: { 'Content-Type': 'text/html' }
  });
}
```

From now on, you can edit the code of the worker and it will be automatically deployed.

