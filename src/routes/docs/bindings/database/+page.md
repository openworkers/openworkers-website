# Database Binding

SQL database access from your workers.

> **Status:** Work in progress

## Usage

```javascript
addEventListener('fetch', async (event) => {
  const results = await env.DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(1)
    .all();

  event.respondWith(
    new Response(JSON.stringify(results), {
      headers: { 'Content-Type': 'application/json' }
    })
  );
});
```

## API

### prepare(sql)

Create a prepared statement.

```javascript
const stmt = env.DB.prepare('SELECT * FROM users WHERE email = ?');
```

### bind(...values)

Bind parameters to a prepared statement.

```javascript
const stmt = env.DB.prepare('INSERT INTO users (name, email) VALUES (?, ?)')
  .bind('John', 'john@example.com');
```

### all()

Execute query and return all rows.

```javascript
const { results } = await env.DB.prepare('SELECT * FROM posts')
  .all();

// results = [{ id: 1, title: '...' }, { id: 2, title: '...' }]
```

### first()

Execute query and return first row.

```javascript
const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?')
  .bind(1)
  .first();

// user = { id: 1, name: 'John', email: '...' }
```

### run()

Execute a statement (INSERT, UPDATE, DELETE).

```javascript
const { success, meta } = await env.DB.prepare('DELETE FROM sessions WHERE expires < ?')
  .bind(Date.now())
  .run();

// meta.changes = number of rows affected
```

---

## Examples

### CRUD operations

```javascript
// Create
await env.DB.prepare('INSERT INTO posts (title, body) VALUES (?, ?)')
  .bind('Hello', 'World')
  .run();

// Read
const posts = await env.DB.prepare('SELECT * FROM posts')
  .all();

// Update
await env.DB.prepare('UPDATE posts SET title = ? WHERE id = ?')
  .bind('Updated', 1)
  .run();

// Delete
await env.DB.prepare('DELETE FROM posts WHERE id = ?')
  .bind(1)
  .run();
```

### Transactions

```javascript
const results = await env.DB.batch([
  env.DB.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').bind(100, 1),
  env.DB.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').bind(100, 2)
]);
```

---

## Configuration

Databases are created in the dashboard under **Databases**.

Each database provides:
- A unique ID
- A token for authentication
- Connection details

---

## Limits

| Limit | Value |
|-------|-------|
| Max query size | 1 MB |
| Max rows returned | 10,000 |
| Max concurrent connections | 10 |

---

## Compatibility

The Database binding API is designed to be compatible with [Cloudflare D1](https://developers.cloudflare.com/d1/).
