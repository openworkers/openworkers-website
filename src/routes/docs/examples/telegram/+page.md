# Writing a Telegram bot

## Introduction

This example shows how to write a Telegram bot without using any module.

## Setup bot

First of all, you need to create a bot. To do this, you need to talk to the [@BotFather](https://t.me/BotFather) bot and follow a few simple steps. After that, you will receive a token that you will need to use to interact with your bot.

## Setup environment variables

In the OpenWorkers dashboard, go to the "Environment variables" tab and add the following variables:

### Bot token

Set a variable named `BOT_TOKEN` with the token you received from the BotFather.

### Hook secret

Set a variable named `HOOK_SECRET` with a random string. This will be used to verify that the request comes from Telegram.

## Getting updates

To get updates from Telegram, we need to [set up a webhook](https://core.telegram.org/bots/api#setwebhook).
To do this, we need to send a request to the Telegram API. We can do this using curl:

```bash
curl -X POST https://api.telegram.org/bot$BOT_TOKEN/setWebhook \
    -d "url=https://your-worker-name.workers.rocks&secret_token=$HOOK_SECRET"
```

## Handling updates

Now we can start writing our bot. To do this, we need to create a worker:

### Create a worker

Go to the "Workers" tab and click "Create a worker". Enter the name of the worker and select the "TypeScript" template.

### Bind the environment variables to the worker

In the worker overview page, change the "Environment variables" to the one set up earlier.

### Handling requests

Go to the "Edit" tab and paste the code below into the editor to have a minimally working bot.

```typescript
addEventListener('fetch', (event: FetchEvent) => {
  event.respondWith(
    handleRequest(event.request)
      // If the request handler throws an error, return a 500 response.
      .catch(() => new Response('Internal Server Error', { status: 500 }))
  );
});

function sendMessage(chatId: number, text: string): Promise<Response> {
  return fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      chat_id: chatId,
      text
    })
  });
}

async function handleRequest(request: Request): Promise<Response> {
  // Telegram sends a POST request to the webhook URL.
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // Check if the request comes from Telegram.
  const secret = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
  if (secret !== env.HOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Parse the request body.
  const data = await request.json();

  // Get the message text
  // See https://core.telegram.org/bots/api#message
  const message = data.message;
  const text = message.text;

  // Get the chat ID
  // See https://core.telegram.org/bots/api#chat
  const chatId = message.chat.id;

  // Send a message to the chat.
  if (text === '/start') {
    await sendMessage(chatId, 'Hello, world!');
  } else {
    await sendMessage(chatId, `You said: ${text}`);
  }

  return new Response(null, { status: 201 });
}
```

You can now verify that everything has been set up correctly by sending a message to your bot.

Happy coding!

## References

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Telegram Bot API - setWebhook](https://core.telegram.org/bots/api#setwebhook)
- [Telegram Bot API - sendMessage](https://core.telegram.org/bots/api#sendmessage)
