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
			{ name: 'Bindings', path: '/docs/bindings' },
			{ name: 'Limits & Quotas', path: '/docs/limits' }
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
		name: 'Internals',
		path: '/docs/internals',
		children: [
			{ name: 'Storage Bindings', path: '/docs/internals/storage' }
		]
	}
];
