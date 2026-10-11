<script>
  import Tabs from '$lib/components/Tabs.svelte';
</script>

# D1 Binding

A SQLite database with the [Cloudflare D1](https://developers.cloudflare.com/d1/worker-api/) Worker API: `prepare`, `bind`, `first`, `all`, `run`, `raw`, `batch` and `exec`. Code written for D1 runs unchanged on the supported subset below.

The database is a SQLite file in the runner. Use the [Database](/docs/bindings/database) binding for PostgreSQL instead.

D1 is off by default. An administrator turns it on for an account by raising its D1 limit; until then the dashboard does not show D1 and creation fails with 403.

## Setup

<Tabs tabs={['Dashboard', 'CLI', 'API']}>
{#snippet children(active)}
{#if active === 0}
<div>
<p>Go to <strong>D1</strong> in the sidebar and create a database (e.g., <code>guestbook</code>).</p>
<p>Then go to your worker's <strong>Environment</strong>, add a binding of type <strong>D1</strong>, name it (e.g., <code>DB</code>) and select your database.</p>
<p>The database page has a SQL console that runs one statement at a time.</p>
</div>
{:else if active === 1}
<div>

```bash
# Create a D1 database
ow d1 create guestbook

# Bind it to an environment and link the environment to a worker
ow env create my-env
ow env bind my-env DB guestbook --type d1
ow workers link my-worker my-env

# Run SQL
ow d1 execute guestbook --command "SELECT * FROM entries"
ow d1 execute guestbook --file seed.sql
```

      </div>
    {:else}
      <div>

```bash
# Create a D1 database
curl -X POST https://dash.openworkers.com/api/v1/d1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "guestbook"}'

# Add the binding to an environment
curl -X PATCH https://dash.openworkers.com/api/v1/environments/my-env \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"values": [{"key": "DB", "value": "<d1-id>", "type": "d1"}]}'
```

      </div>
    {/if}

{/snippet}
</Tabs>

## Usage

```javascript
export default {
  async fetch(request, env) {
    if (request.method === 'POST') {
      const form = await request.formData();

      await env.DB.prepare('INSERT INTO entries (author, message) VALUES (?1, ?2)')
        .bind(form.get('author'), form.get('message'))
        .run();

      return Response.redirect(new URL('/', request.url), 303);
    }

    const { results } = await env.DB.prepare('SELECT author, message FROM entries ORDER BY id DESC LIMIT 50').all();

    return Response.json(results);
  }
};
```

## Migrations

Put the schema in numbered files and apply them with the CLI:

```bash
mkdir migrations
cat > migrations/0001_entries.sql <<'EOF'
CREATE TABLE entries (
  id INTEGER PRIMARY KEY,
  author TEXT NOT NULL,
  message TEXT NOT NULL
);
EOF

ow d1 migrations status guestbook
ow d1 migrations apply guestbook
```

Each file runs in one transaction, with its row in the `d1_migrations` table of the database. A failed file leaves no change. `apply` skips the files already applied, and stops when an applied file has changed: add a new file instead.

## API

### D1Database

| Method              | Result                                                                                                     |
| ------------------- | ---------------------------------------------------------------------------------------------------------- |
| `prepare(sql)`      | A statement. Nothing runs yet.                                                                             |
| `batch(statements)` | One `D1Result` per statement, in order. The statements run in one transaction: a failure rolls back all.   |
| `exec(sql)`         | `{ count, duration }`. Statements without parameters, each committed on its own; stops at the first error. |
| `withSession()`     | Throws: no read replicas.                                                                                  |
| `dump()`            | Rejects.                                                                                                   |

### D1PreparedStatement

| Method                       | Result                                                                                  |
| ---------------------------- | --------------------------------------------------------------------------------------- |
| `bind(...values)`            | A new statement with these values for `?1`, `?2`... The original does not change.       |
| `all()`, `run()`             | `{ success, meta, results }`, with `results` as row objects.                            |
| `first()`                    | The first row, or `null`.                                                               |
| `first(column)`              | A column of the first row, or `null` when there is no row. Throws for a missing column. |
| `raw()`                      | Rows as arrays, columns in SQL order.                                                   |
| `raw({ columnNames: true })` | The column names first, then the rows.                                                  |

Parameters are `?NNN` or `?`. Named parameters (`:name`) are refused, as on D1.

### Values

| JavaScript                  | SQLite          | Read back as     |
| --------------------------- | --------------- | ---------------- |
| `null`                      | NULL            | `null`           |
| Number, safe integer        | INTEGER         | Number           |
| Number, other               | REAL            | Number           |
| String                      | TEXT            | String           |
| Boolean                     | INTEGER 1 or 0  | Number           |
| `ArrayBuffer`, typed array  | BLOB            | Array of numbers |
| `undefined`, BigInt, object | `D1_TYPE_ERROR` |                  |

An INTEGER above `Number.MAX_SAFE_INTEGER` loses precision when read, as on D1.

### Errors

An error message starts with `D1_ERROR`, `D1_TYPE_ERROR` or `D1_RANGE_ERROR`, then the SQLite message and code:

```
D1_ERROR: UNIQUE constraint failed: entries.id: SQLITE_CONSTRAINT
```

## Differences from Cloudflare D1

- `exec` splits statements with the SQLite parser, so a statement can span several lines.
- `meta` has `duration`, `changes`, `last_row_id`, `changed_db`, `size_after`, `served_by_primary` and `total_attempts`. It has no `rows_read`, `rows_written`, `served_by` or `served_by_region`. `changed_db` is true for any statement that is not read-only.
- `BEGIN`, `COMMIT`, `SAVEPOINT`, `ATTACH`, extensions and pragmas that are not schema reads are refused. Use `batch` for a transaction. `PRAGMA defer_foreign_keys` is allowed.
- Foreign keys are enforced.
- No read replicas, sessions, Time Travel or `dump`.

## Limits

| Limit                    | Value                                            |
| ------------------------ | ------------------------------------------------ |
| SQL statement            | 100,000 bytes                                    |
| Parameters per statement | 100                                              |
| Columns per table        | 100                                              |
| String, BLOB or row      | 2,000,000 bytes                                  |
| Result of one statement  | 16 MiB                                           |
| Database size            | 500 MiB                                          |
| Statement duration       | 30 seconds, or less when the request ends sooner |

## Durability

A write returns after SQLite commits it to the runner's disk. A runner crash or restart loses no confirmed write.

Every 5 minutes, and when the runner stops cleanly, each changed database is copied to object storage (R2). The last 3 copies are kept. A database whose file is missing comes back from its last copy before it serves a request.

**When the runner's disk or host is lost, the writes after the last copy are lost: up to about 5 minutes.** If copies fail for an hour, the runner refuses writes, with a retryable `D1_ERROR`, until a copy succeeds. Reads continue.

To go back to the last copy on purpose, for example after a bad change:

```bash
ow d1 restore guestbook
```

The runner keeps the replaced files aside, and the next request restores the copy. Commits after the copy are lost.
