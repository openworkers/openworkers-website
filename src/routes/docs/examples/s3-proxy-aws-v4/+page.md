# Create a proxy to S3 using AWS v4 signature type

The following example shows how to read from S3 using AWS v4 signature type without using any module.

See [S3 documentation](https://docs.aws.amazon.com/IAM/latest/UserGuide/create-signed-request.html) for more information.

## Prerequisites

Ensure that you have the following environment variables set:

- `S3_BUCKET_NAME`: The name of the S3 bucket.
- `S3_ACCESS_KEY`: The access key of the S3-compatible storage.
- `S3_SECRET_KEY`: The secret key of the S3-compatible storage.
- `S3_REGION`: The region of the S3-compatible storage.

## Reading from S3

To read from S3, we need to sign the request using HMAC-SHA1, which is supported by the Web Crypto API.
We define the `HMAC` function to sign the request, and the `getObject` function to prepare the request and send it to S3.

```typescript
const s3 = {
  endpoint: env.S3_ENDPOINT ?? 'https://example.s3.fr-par.scw.cloud',
  region: env.S3_REGION ?? 'fr-par',
  accessKey: env.S3_ACCESS_KEY ?? null,
  secretKey: env.S3_SECRET_KEY ?? null
};

// Ensure that keys are set
if (!s3.accessKey || !s3.secretKey) {
  throw new Error('Missing S3 configuration');
}

async function sha256(data: string): Promise<string> {
  const dataUint8 = toUint8Array(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataUint8);
  return toHexString(new Uint8Array(hashBuffer));
}

// Convert a string to Uint8Array
function toUint8Array(str: string) {
  return Uint8Array.from(str, (c) => c.charCodeAt(0));
}

// Convert an Uint8Array to a hex string
function toHexString(arr: Uint8Array) {
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function HMAC(key: Uint8Array, message: Uint8Array) {
  const algorithm = { name: 'HMAC', hash: 'SHA-256' };

  const cryptoKey = await crypto.subtle.importKey('raw', key, algorithm, true, ['sign']);

  const signature = await crypto.subtle.sign(algorithm, cryptoKey, message);

  return new Uint8Array(signature);
}

async function getS3Object(key: string) {
  const url = new URL(`${s3.endpoint}/${key}`);
  const date = new Date().toISOString().replace(/[:-]|\.\d{3}/g, ''); // format: YYYYMMDDTHHMMSSZ
  const shortDate = date.slice(0, 8); // format: YYYYMMDD
  const method = 'GET';
  const canonicalURI = url.pathname;
  const canonicalQueryString = '';
  const hashedPayload = await sha256(''); // For GET requests, the payload is empty
  const canonicalHeaders = `host:${url.host}\nx-amz-content-sha256:${hashedPayload}\nx-amz-date:${date}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';

  const canonicalRequest = [
    method,
    canonicalURI,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    hashedPayload
  ].join('\n');

  const canonicalRequestHash = await sha256(canonicalRequest);

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    date,
    `${shortDate}/${s3.region}/s3/aws4_request`,
    canonicalRequestHash
  ].join('\n');

  const dateKey = await HMAC(toUint8Array('AWS4' + s3.secretKey), toUint8Array(shortDate));
  const regionKey = await HMAC(dateKey, toUint8Array(s3.region));
  const serviceKey = await HMAC(regionKey, toUint8Array('s3'));
  const signingKey = await HMAC(serviceKey, toUint8Array('aws4_request'));
  const signature = toHexString(await HMAC(signingKey, toUint8Array(stringToSign)));

  const headers = new Headers();
  headers.set('x-amz-date', date);
  headers.set('x-amz-content-sha256', hashedPayload);
  headers.set(
    'Authorization',
    `AWS4-HMAC-SHA256 ` + //
      `Credential=${s3.accessKey}/${shortDate}/${s3.region}/s3/aws4_request, ` +
      `SignedHeaders=${signedHeaders}, ` +
      `Signature=${signature}`
  );

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

addEventListener('fetch', (event: FetchEvent) => {
  event.respondWith(
    handleRequest(event.request)
      // If the request handler throws an error, return a 500 response.
      .catch(() => new Response('Internal Server Error', { status: 500 }))
  );
});

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
