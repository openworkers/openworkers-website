# Handle HTTP requests

To handle HTTP requests, you need to listen for the `fetch` event. This event is triggered whenever a request is made to your worker.

## Fetch event

The `fetch` event provides the following properties and methods:
 - `request`: The [Request object](https://developer.mozilla.org/en-US/docs/Web/API/Request) representing the incoming request.
 - `respondWith`: A callback to send the [Response object](https://developer.mozilla.org/en-US/docs/Web/API/Request).


```typescript
interface FetchEvent {
  request: Request;
  respondWith(response: Response | Promise<Response>): void;
}
```

## Example
```typescript
addEventListener('fetch', (event: FetchEvent) => {
  event.respondWith(
    handleRequest(event.request)
      .catch((err: Error) => new Response(err.stack, { status: 500 }))
  );
});

async function handleRequest(request: Request): Promise<Response> {
  const { pathname } = new URL(request.url);

  // Return a 404 response for requests to /favicon.ico.
  if (pathname.startsWith('/favicon.ico')) {
    return new Response('Not found', { status: 404 });
  }

  // Return a HTML response for all other requests.
  return new Response('<h3>Hello world!</h3>', {
    headers: { 'Content-Type': 'text/html' }
  });
}
```


--------------


Let's break down the code:

```typescript
addEventListener('fetch', (event: FetchEvent) => { ... })
```

This line listens for the `fetch` event and calls the provided callback function whenever a request is made to the worker.


--------------


```typescript
event.respondWith(...)
```

This line tells the worker how to respond to the request. You can respond with a `Response` object, a `Promise<Response>` object, or a `Response` object wrapped in a `Promise`.


--------------

```typescript
handleRequest(request: Request): Promise<Response>
```

This function takes a `Request` object as input and returns a `Promise<Response>`. It is responsible for processing the request and generating a response.

A common pattern is to define a function like `handleRequest` to handle the request processing logic. This function can be as complex or as simple as needed, depending on the requirements of your worker.

A simple example is provided in the code snippet above, where the function checks the requested pathname and returns different responses based on the path.
