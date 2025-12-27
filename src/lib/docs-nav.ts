export interface NavItem {
  name: string;
  path: string;
  children?: NavItem[];
}

export const docsNav: NavItem[] = [
  {
    name: 'Introduction',
    path: '/docs',
    children: [
      { name: 'Overview', path: '/docs' },
      { name: 'Runtime', path: '/docs/runtime' },
      { name: 'Custom domains', path: '/docs/custom-domains' },
      { name: 'Online editor', path: '/docs/online-editor' },
      { name: 'Environment variables', path: '/docs/environment-variables' },
      { name: 'Limits & Quotas', path: '/docs/limits' }
    ]
  },
  {
    name: 'Bindings',
    path: '/docs/bindings',
    children: [
      { name: 'Overview', path: '/docs/bindings' },
      { name: 'Storage', path: '/docs/bindings/storage' },
      { name: 'KV', path: '/docs/bindings/kv' },
      { name: 'Database', path: '/docs/bindings/database' }
    ]
  },
  {
    name: 'Workers',
    path: '/docs/workers',
    children: [
      { name: 'Handle HTTP requests', path: '/docs/workers/event-fetch' },
      { name: 'Scheduled tasks', path: '/docs/workers/scheduled-tasks' }
    ]
  },
  {
    name: 'Examples',
    path: '/docs/examples',
    children: [
      { name: 'JSON API', path: '/docs/examples/json-api' },
      { name: 'Redirect Service', path: '/docs/examples/redirect' },
      { name: 'CORS Proxy', path: '/docs/examples/cors-proxy' },
      { name: 'Telegram Bot', path: '/docs/examples/telegram' },
      { name: 'S3 Proxy', path: '/docs/examples/s3-proxy' },
      { name: 'S3 Proxy (AWS v4)', path: '/docs/examples/s3-proxy-aws-v4' }
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
      { name: 'Security', path: '/docs/architecture/security' }
    ]
  }
];
