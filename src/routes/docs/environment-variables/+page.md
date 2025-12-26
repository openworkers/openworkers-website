# Environment Variables

Environment variables are key-value pairs that are passed to the worker when it starts, you can use it to pass sensitive information to the worker.


![Environment variables](/images/environment-variables.png)

## Setting Environment Variables

Environment variables can be set in the "Environments" tab. 

Click on "Add Environment" to create a new environment set.

Once you have created an environment set, you can add key-value pairs to it.

Then, you can select the environment set you want to use in the worker settings.

![Environment variables](/images/set-environment-variable.png)

## Usage

You can access environment variables in your worker using the `env` global object.

```typescript
addEventListener('fetch', (event: FetchEvent) => {
  const name = env.NAME;

  event.respondWith(
      new Response(`Hello, ${name}!`)
  );
});
```

When your environment variable is correctly set, the [online editor](/docs/online-editor) is able to autocomplete the variable name.

![Autocomplete](/images/environment-completion.png)

## Future Work

- [x] Add support for secrets
- [ ] Mergeable environments: allow to merge environment variables from different environments sets
