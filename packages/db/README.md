# @kitchen/db

Database package containing:
- Supabase CLI migrations
- Baseline schema dump (reference)

## Structure

```
db/
├── supabase/
│   └── migrations/      # CLI-managed migrations (authoritative)
├── migrations/          # Baseline schema dump (reference only)
└── package.json
```

Notes:
- `supabase/migrations` is the only path used by `supabase db push`.
- `migrations/001_initial_schema.sql` is a snapshot for documentation/rebuilds.

## Commands

```bash
# Push migrations to database
pnpm migrate

# Generate TypeScript types from database
pnpm generate-types

# Reset database (DANGER!)
pnpm reset
```
