export interface NavItem {
  name: string;
  path: string;
  children?: NavItem[];
}

export const docsNav: NavItem[] = [
  {
    name: 'Getting Started',
    path: '/docs',
    children: [
      { name: 'Overview', path: '/docs' },
      { name: 'Quick Start', path: '/docs/quickstart' },
      { name: 'CLI', path: '/docs/cli' }
    ]
  },
  {
    name: 'Workers',
    path: '/docs/workers',
    children: [
      { name: 'HTTP Handlers', path: '/docs/workers/event-fetch' },
      { name: 'Scheduled Tasks', path: '/docs/workers/scheduled-tasks' }
    ]
  },
  {
    name: 'Bindings',
    path: '/docs/bindings',
    children: [
      { name: 'Overview', path: '/docs/bindings' },
      { name: 'KV', path: '/docs/bindings/kv' },
      { name: 'Storage', path: '/docs/bindings/storage' },
      { name: 'Database', path: '/docs/bindings/database' }
    ]
  },
  {
    name: 'Examples',
    path: '/docs/examples',
    children: [
      { name: 'Overview', path: '/docs/examples' },
      { name: 'Hello World', path: '/docs/examples/hello-world' },
      { name: 'JSON API', path: '/docs/examples/json-api' },
      { name: 'Form Handling', path: '/docs/examples/form-handling' },
      { name: 'Authentication', path: '/docs/examples/authentication' },
      { name: 'CORS Proxy', path: '/docs/examples/cors-proxy' },
      { name: 'Redirect Service', path: '/docs/examples/redirect' },
      { name: 'Telegram Bot', path: '/docs/examples/telegram' },
      { name: 'S3 Proxy', path: '/docs/examples/s3-proxy' },
      { name: 'S3 Proxy (v4)', path: '/docs/examples/s3-proxy-aws-v4' }
    ]
  },
  {
    name: 'Frameworks',
    path: '/docs/frameworks',
    children: [
      { name: 'Overview', path: '/docs/frameworks' },
      { name: 'SvelteKit', path: '/docs/frameworks/sveltekit' },
      { name: 'React', path: '/docs/frameworks/react' }
    ]
  },
  {
    name: 'Reference',
    path: '/docs/runtime',
    children: [
      { name: 'Runtime APIs', path: '/docs/runtime' },
      { name: 'Limits', path: '/docs/limits' },
      { name: 'Custom Domains', path: '/docs/custom-domains' }
    ]
  },
  {
    name: 'Deployment',
    path: '/docs/self-hosting',
    children: [
      { name: 'Self-Hosting', path: '/docs/self-hosting' }
    ]
  },
  {
    name: 'Architecture',
    path: '/docs/architecture',
    children: [
      { name: 'Overview', path: '/docs/architecture' },
      { name: 'Bindings', path: '/docs/architecture/bindings' },
      { name: 'HTTP Flow', path: '/docs/architecture/http-flow' },
      { name: 'Event Loop', path: '/docs/architecture/event-loop' },
      { name: 'Stream Cancellation', path: '/docs/architecture/stream-cancellation' },
      { name: 'Security', path: '/docs/architecture/security' }
    ]
  }
];
