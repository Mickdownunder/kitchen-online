# @kitchen/db

Database package containing:
- SQL Migrations
- RLS Policies
- Database Types (generated)

## Structure

```
db/
├── migrations/          # SQL migration files
├── policies/           # RLS policy definitions
├── rpcs/               # Remote Procedure Calls
└── src/
    └── types.ts        # Generated TypeScript types
```

## Commands

```bash
# Push migrations to database
pnpm migrate

# Generate TypeScript types from database
pnpm generate-types

# Reset database (DANGER!)
pnpm reset
```
