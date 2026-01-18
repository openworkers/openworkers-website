# Custom Domains

Route your own domain to a worker.

## Setup

1. Go to your worker's **Domains** tab
2. Add your domain (e.g., `api.example.com`)
3. Add a CNAME record at your DNS provider:

```
api.example.com  CNAME  workers.rocks
```

4. Wait for DNS propagation (up to 24h, usually minutes)

## SSL/TLS

SSL certificates are provisioned automatically. Your domain will be accessible via HTTPS.

## Apex Domains

For apex domains (`example.com` without subdomain), use one of:

- **ALIAS record** (if your DNS supports it)
- **A record** pointing to our IP (contact support)
- **Subdomain redirect** from `example.com` → `www.example.com`

## Multiple Domains

A worker can have multiple domains. All domains route to the same worker code.

## Wildcard Domains

Not currently supported. Create separate workers for each subdomain.

## Troubleshooting

**Domain not resolving:**
- Verify CNAME is set correctly: `dig api.example.com CNAME`
- DNS propagation can take time

**SSL certificate error:**
- New domains may take a few minutes for certificate provisioning
- Ensure the domain resolves correctly first

**404 on custom domain:**
- Check the domain is added in the worker's Domains tab
- Verify the worker is deployed and working on the default URL
