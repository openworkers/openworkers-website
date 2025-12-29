# Database Binding

PostgreSQL database access from your workers.

---

## Usage

```javascript
export default {
  async fetch(request, env, ctx) {
    const results = await env.DB.query(
      'SELECT * FROM users WHERE id = $1',
      [1]
    );

    return new Response(JSON.stringify(results), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

---

## API

### query(sql, params?)

Execute a SQL query with optional parameters.

```javascript
// Without parameters
const users = await env.DB.query('SELECT * FROM users');

// With parameters (use $1, $2, $3...)
const user = await env.DB.query(
  'SELECT * FROM users WHERE id = $1',
  [userId]
);
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `sql` | `string` | SQL query with `$1`, `$2`... placeholders |
| `params` | `any[]` | Optional array of values to bind |

**Returns:** `Promise<any[]>` - Array of row objects

---

## Parameter Binding

Use PostgreSQL-style placeholders (`$1`, `$2`, `$3`...). Parameters are 1-indexed.

```javascript
// Single parameter
await env.DB.query('SELECT * FROM posts WHERE id = $1', [42]);

// Multiple parameters
await env.DB.query(
  'SELECT * FROM posts WHERE author = $1 AND status = $2',
  ['john', 'published']
);

// Type casting (when needed)
await env.DB.query(
  'INSERT INTO scores (value) VALUES ($1::int)',
  [scoreString]
);
```

> **Note:** All parameters are passed as strings. PostgreSQL handles type conversion automatically in most cases. Use explicit casts (`::int`, `::boolean`, etc.) when needed.

---

## Examples

### CRUD Operations

```javascript
// Create
const newPost = await env.DB.query(
  'INSERT INTO posts (title, body) VALUES ($1, $2) RETURNING *',
  ['Hello', 'World']
);

// Read
const posts = await env.DB.query('SELECT * FROM posts');

// Read with filter
const post = await env.DB.query(
  'SELECT * FROM posts WHERE id = $1',
  [postId]
);

// Update
const updated = await env.DB.query(
  'UPDATE posts SET title = $1 WHERE id = $2 RETURNING *',
  ['Updated Title', postId]
);

// Delete
await env.DB.query('DELETE FROM posts WHERE id = $1', [postId]);
```

### Aggregations

```javascript
const stats = await env.DB.query(`
  SELECT
    COUNT(*) as total,
    AVG(score)::int as avg_score
  FROM games
  WHERE created_at > NOW() - INTERVAL '7 days'
`);
```

### Joins

```javascript
const postsWithAuthors = await env.DB.query(`
  SELECT
    p.id,
    p.title,
    u.name as author_name
  FROM posts p
  JOIN users u ON p.author_id = u.id
  WHERE p.status = $1
  ORDER BY p.created_at DESC
  LIMIT $2
`, ['published', 10]);
```

---

## Configuration

Add a database binding in the dashboard:

1. Go to your worker settings
2. Click **Add Binding**
3. Select **Database**
4. Choose your database and set the binding name (e.g., `DB`)

---

## Limits

| Limit | Value |
|-------|-------|
| Query timeout | 30 seconds |
| Max result size | 10 MB |

---

## Differences from Cloudflare D1

OpenWorkers uses a simpler API than Cloudflare D1:

| D1 | OpenWorkers |
|----|-------------|
| `env.DB.prepare(sql).bind(...).all()` | `env.DB.query(sql, params)` |
| `env.DB.prepare(sql).bind(...).first()` | `(await env.DB.query(sql, params))[0]` |
| `env.DB.prepare(sql).bind(...).run()` | `env.DB.query(sql, params)` |
| `?` placeholders | `$1`, `$2`... placeholders |
