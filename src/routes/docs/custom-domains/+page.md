# Custom Domains

Route your own domain to a worker.

Custom domains require your domain to be managed by **Cloudflare** (the free plan is enough). Cloudflare issues the SSL certificate for your domain automatically, so the whole setup is self-service — no provisioning step, no support ticket.

## How it works

Every worker is already reachable at `<name>.workers.rocks` — no setup needed.

A custom domain is an extra hostname routed to the same worker. When a request arrives with a hostname the proxy does not already know, the proxy asks the API which worker owns that hostname and caches the answer for 30 seconds. A domain you just added therefore starts serving within that window.

Your Cloudflare zone terminates TLS for your domain (certificates are issued and renewed automatically by Cloudflare), then forwards requests — encrypted — to our origin. This is why Cloudflare is required: it is what makes SSL work for your domain without any manual step.

## Setup

1. Go to your worker's **Domains** tab and add your domain (e.g., `api.example.com`)
2. In your Cloudflare dashboard, set **SSL/TLS → Full**.
   Not _Full (Strict)_: our origin presents a generic certificate, so strict mode would refuse the connection.
3. Add a **proxied** (orange cloud) CNAME record:

```
api.example.com  CNAME  workers.rocks  (Proxied)
```

4. Verify: `curl https://api.example.com/` — the record is live as soon as Cloudflare saves it.

## Apex Domains

Cloudflare flattens CNAME records at the apex, so the setup above works as-is for `example.com` without a subdomain.

## Multiple Domains

A worker can have multiple domains. All domains route to the same worker code.

## Wildcard Domains

Not currently supported. Create separate workers for each subdomain.

## Domain not on Cloudflare?

Not supported yet. We don't provision SSL certificates for arbitrary domains, so the certificate has to come from your own Cloudflare zone.

## Troubleshooting

Each symptom below has a single cause:

**SSL certificate error in the browser:**

- The DNS record is set to _DNS only_ (grey cloud) — switch it to **Proxied**

**Error 418:**

- The zone's SSL mode is _Flexible_ — set it to **Full**

**Error 526 (Invalid SSL certificate):**

- The zone's SSL mode is _Full (Strict)_ — set it to **Full**

**404 on custom domain:**

- Check the domain is added in the worker's **Domains** tab
- Verify the worker is deployed and responds on its `workers.rocks` URL
