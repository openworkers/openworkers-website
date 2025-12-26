# Create a Simple Poll App with PlanetScale

In this tutorial, you will learn how to create a simple poll worker that allows users to vote for their favorite color and stores the votes in a PlanetScale database.

## Prerequisites:

- Basic knowledge of TypeScript and HTML
- A [OpenWorkers](https://openworkers.com) account
- A [PlanetScale](https://planetscale.com/) account and database

# Create a simple worker

## Step 1: Create a new OpenWorkers worker

First, we need to create a new worker. You can create a new worker by going to the [OpenWorkers dashboard](https://dash.openworkers.com) and clicking on the "Create Worker" button.

<!-- ![Create Worker](https://i.imgur.com/0Z7Z7Zp.png) -->

## Step 2: Copy the worker code

Here's a simple worker that displays an HTML poll for users to vote for their favorite color and accepts POST requests to record the results:

```typescript
// Define an asynchronous function to handle incoming requests.
async function handleRequest(request: Request): Promise<Response> {
  if (request.method === 'GET') {
    return new Response(pollHTML(), { headers: { 'Content-Type': 'text/html' } });
  } else if (request.method === 'POST') {
    const formData = await request.formData();
    const color = formData.get('color');

    if (color === 'blue' || color === 'red' || color === 'green') {
      return new Response(`You voted for ${color}!`);
    } else {
      return new Response('Invalid vote', { status: 400 });
    }
  } else {
    return new Response('Method not allowed', { status: 405 });
  }
}

function pollHTML(): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Favorite Color Poll</title>
    </head>
    <body>
      <h1>Favorite Color Poll</h1>
      <form action="/" method="POST">
        <label>
          <input type="radio" name="color" value="blue" required>
          Blue
        </label><br>
        <label>
          <input type="radio" name="color" value="red">
          Red
        </label><br>
        <label>
          <input type="radio" name="color" value="green">
          Green
        </label><br>
        <button type="submit">Vote</button>
      </form>
    </body>
    </html>
  `;
}

// Add an event listener to listen for the "fetch" event.
addEventListener('fetch', (event: FetchEvent) => {
  event.respondWith(handleRequest(event.request));
});
```

# Add PlanetScale database integration

## Step 1: Set up the PlanetScale database

Log in to your PlanetScale account and create a new database.

In the SQL editor, execute the following command to create a table called votes:

```sql
CREATE TABLE votes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  color VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Step 2: Add the PlanetScale database credentials to the worker's environment

In the OpenWorkers dashboard, click on the "Environments" button to open the environment settings.

<!-- ![Worker Settings](https://i.imgur.com/0Z7Z7Zp.png) -->

In the environment settings, create a new environment variable called `PlanetScale` the following values:

- DATABASE_HOST
- DATABASE_USERNAME
- DATABASE_PASSWORD

<!-- ![Environment Variables](https://i.imgur.com/0Z7Z7Zp.png) -->

## Step 3: Add the PlanetScale database code to the worker

### Install the PlanetScale database package

As this worker uses a package, we need to compile the worker before we can deploy it.

```bash
npm install -D @planetscale/database esbuild
```

### Add the PlanetScale database code to the worker

Add the following code to the worker to connect to the PlanetScale database and insert the vote into the votes table:

```typescript
/// <reference lib="WebWorker" />

import { connect } from '@planetscale/database';

declare const env: {
  DATABASE_HOST: string;
  DATABASE_USERNAME: string;
  DATABASE_PASSWORD: string;
};

const config = {
  host: env.DATABASE_HOST,
  username: env.DATABASE_USERNAME,
  password: env.DATABASE_PASSWORD
};

const conn = connect(config);

async function insertVote(color: string) {
  await conn.execute('insert into votes (`color`) values (?)', [color]);
}

// ...
if (color === 'blue' || color === 'red' || color === 'green') {
  await insertVote(color); // Insert the vote into the database
  return new Response(`You voted for ${color}!`);
}
// ...
```

### Step 4: Compile the worker

```bash
mkdir -p dist
npx esbuild main.ts --bundle --main-fields=browser,module,main > dist/index.js
```

### Step 5: Deploy the worker

Copy the contents of the `dist/index.js` file and paste it into the worker code editor.

<br>

In a near future, this will be simplified to a single command:

```bash
openworkers deploy --name poll dist/index.js
```

## Bonus: display the results

We now want to display the results of the poll when the user has voted.
To do this, we need to add a new function to the worker that fetches the results from the database.

```typescript
async function getVotes() {
  const results = await conn.execute(`
    SELECT color, COUNT(*) as votes
    FROM votes
    GROUP BY color
    ORDER BY votes DESC;`);
  return results.rows as { color: string; votes: number }[];
}

// ...
if (color === 'blue' || color === 'red' || color === 'green') {
  await insertVote(color);
  const results = await getVotes();
  const resultText = results.map(({ color, votes }) => ` ${color}: ${votes}`).join('\n');
  return new Response(`You voted for ${color}!\n\n${resultText}`);
}
// ...
```
