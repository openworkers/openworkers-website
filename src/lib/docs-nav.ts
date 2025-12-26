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
			{ name: 'Roadmap', path: '/docs/roadmap' },
			{ name: 'Runtime', path: '/docs/runtime' },
			{ name: 'Custom domains', path: '/docs/custom-domains' },
			{ name: 'Online editor', path: '/docs/online-editor' },
			{ name: 'Environment variables', path: '/docs/environment-variables' }
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
			{ name: 'Poll App', path: '/docs/examples/poll' },
			{ name: 'Telegram Bot', path: '/docs/examples/telegram' },
			{ name: 'QR Code Generator', path: '/docs/examples/qr-code' },
			{ name: 'S3 Proxy', path: '/docs/examples/s3-proxy' },
			{ name: 'S3 Proxy with AWSv4', path: '/docs/examples/s3-proxy-aws-v4' }
		]
	},
	{
		name: 'Packages',
		path: '/docs/packages',
		children: [
			{ name: 'redis-fetch', path: '/docs/packages/redis-fetch' },
			{ name: 'redis-fetch-server', path: '/docs/packages/redis-fetch-server' }
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
