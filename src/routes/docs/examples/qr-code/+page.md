# Writing a QR code generator

## Introduction

This example shows how to write a QR code generator and how to import a module.

## Setup your development environment

First of all, you need to install [Node.js](https://nodejs.org/en/) and [NPM](https://www.npmjs.com/).

## Setup your project

Create a new directory and initialize a new Node.js project:

```bash
mkdir qr-code
cd qr-code

npm init -y
```

## Install dependencies

```
npm install --save qrcode-svg esbuild
```

## Write the code

Create a file named `worker.ts` and paste the following code:

```typescript
import QRCode from 'qrcode-svg';

addEventListener('fetch', (event: FetchEvent) => {
  event.respondWith(
    handleRequest(event.request)
      // If the request handler throws an error, return a 500 response.
      .catch(() => new Response('Internal Server Error', { status: 500 }))
  );
});

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);

  const content = url.searchParams.get('text') || 'Hello, World!';

  const svg = new QRCode({ content, background: 'transparent' }).svg();

  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
}
```

## Build the worker

Add the following script to the `package.json` file:

```json
{
  "scripts": {
    "build": "esbuild worker.ts --bundle --minify --outfile=worker.js"
  }
}
```

Then run the following command to build the worker:

```bash
npm run build
```

## Deploy the worker

Go to the [OpenWorkers dashboard](https://openworkers.rocks/dashboard) and create a new worker.

Then, go to the "Edit" tab and paste the generated code into the editor.

Finally, click "Save and deploy" to deploy the worker.

## Test the worker

In the preview section of the edit page, you can see the generated QR code.

Change the URL to add a `text` query parameter to change the content of the QR code:

```
/?text=Hello World!
```
