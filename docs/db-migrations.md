# Database Migrations (Drizzle + Neon)

This project uses Drizzle to manage schema changes. You should never edit schema manually in production.

## Roles and security model

- App users: use Neon Auth + Data API and can read/write only through RLS policies.
- Owner/migrations role: the only role allowed to apply schema changes.

## Required env

Set a privileged migration connection string in your shell or CI secrets:

```bash
export DATABASE_URL='postgresql://<owner_user>:<owner_password>@<host>/<db>?sslmode=require'
```

Do not expose `DATABASE_URL` to frontend runtime.

## Commands

```bash
bun run db:generate   # Generate SQL migration files from src/db/schema.ts
bun run db:migrate    # Apply pending migrations to DATABASE_URL
bun run db:studio     # Inspect schema/data (optional)
```

## Workflow

1. Update schema in `src/db/schema.ts`
2. Generate migration: `bun run db:generate`
3. Review generated SQL in `drizzle/`
4. Apply migration: `bun run db:migrate`
5. Refresh Neon Data API schema cache

## Production recommendation

- Run migrations in CI/CD with owner credentials.
- Keep app runtime credentials separate and unprivileged.
- Enable RLS and grant only required DML privileges to `authenticated`.
