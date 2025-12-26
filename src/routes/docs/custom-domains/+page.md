# Custom domains

You can add a custom domain to your worker in the "Domains" section of the worker overview page.

For example, for `example.com` to points to your worker, add `example.com` to the "Domains" section.

Then, add a CNAME record to your DNS provider pointing to `workers.rocks`.

Requests to `example.com` will now be routed to your worker.
