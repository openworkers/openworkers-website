# Create a proxy to S3

The following example shows how to read from S3 without using any module.

See [S3 documentation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/RESTAuthentication.html) for more information.

## Prerequisites

Ensure that you have the following environment variables set:

- `S3_BUCKET_NAME`: The name of the S3 bucket.
- `S3_ACCESS_KEY`: The access key of the S3-compatible storage.
- `S3_SECRET_KEY`: The secret key of the S3-compatible storage.
- `S3_ENDPOINT`: The endpoint of the S3-compatible storage. For example `https://nyc3.digitaloceanspaces.com`.

## Reading from S3

To read from S3, we need to sign the request using HMAC-SHA1, which is supported by the Web Crypto API.
We define the `HMAC` function to sign the request, and the `getObject` function to prepare the request and send it to S3.

```typescript
async function HMAC(key: string, message: string) {
  const k = Uint8Array.from(key, (c) => c.charCodeAt(0));
  const m = Uint8Array.from(message, (c) => c.charCodeAt(0));
  const algorithm = { name: 'HMAC', hash: 'SHA-1' };

  const cryptoKey = await crypto.subtle.importKey('raw', k, algorithm, true, ['sign']);

  const signature = await crypto.subtle.sign(algorithm, cryptoKey, m);

  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

async function getS3Object(key: string) {
  const url = new URL(`${s3.endpoint}/${s3.bucketName}/${key}`);
  const date = new Date().toUTCString();
  const method = 'GET';

  // Create the string to sign
  const data = `${method}\n\n\n${date}\n/${s3.bucketName}/${key}`;
  const signature = await HMAC(s3.secretKey, data);

  // Define the headers
  const headers = new Headers();
  headers.set('Date', date);
  headers.set('Authorization', `AWS ${s3.accessKey}:${signature}`);

  // Send the request
  return fetch(url.toString(), { headers, method }).then((res) => {
    switch (res.status) {
      case 200:
        return res;
      case 404:
        return new Response('Not found', { status: 404 });
      default:
        throw new Error(`Unexpected status code: ${res.status}`);
    }
  });
}
```

Now we use our `getObject` function to read from S3:

```typescript
addEventListener('fetch', (event: FetchEvent) => {
  event.respondWith(
    handleRequest(event.request)
      // If the request handler throws an error, return a 500 response.
      .catch(() => new Response('Internal Server Error', { status: 500 }))
  );
});

const s3 = {
  endpoint: env.S3_ENDPOINT ?? 'https://s3.eu-west-2.wasabisys.com',
  accessKey: env.S3_ACCESS_KEY ?? null,
  secretKey: env.S3_SECRET_KEY ?? null,
  bucketName: env.S3_BUCKET_NAME ?? null
};

if (!s3.accessKey || !s3.secretKey || !s3.bucketName) {
  throw new Error('Missing S3 configuration');
}

async function HMAC(key: string, message: string) {
  // ...
}

async function getObject(key: string) {
  // ...
}

async function handleRequest(request: Request): Promise<Response> {
  const { pathname } = new URL(request.url);

  // If the request is for the root, return the index.html file, otherwise
  // return the file matching the path (note that we strip the leading slash)
  const key = pathname === '/' ? 'index.html' : pathname.slice(1);
  if (request.method === 'GET') {
    return getS3Object(key);
  }

  return new Response('Not found', { status: 404 });
}
```

Your worker is now ready to be deployed and serve files from S3.
