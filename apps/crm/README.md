# @kitchen/crm

Das CRM (Customer Relationship Management) für KüchenOnline.

## Setup

Der Code wird aus dem bestehenden `Kitchen-Ki-APP` Projekt kopiert.

### Dateien kopieren

```bash
# Vom Kitchen-Ki-APP Ordner alle relevanten Dateien kopieren:
cp -r /Users/michaellabitzke/Kitchen-Ki-APP/app ./app
cp -r /Users/michaellabitzke/Kitchen-Ki-APP/components ./components
cp -r /Users/michaellabitzke/Kitchen-Ki-APP/hooks ./hooks
cp -r /Users/michaellabitzke/Kitchen-Ki-APP/lib ./lib
cp -r /Users/michaellabitzke/Kitchen-Ki-APP/public ./public
cp /Users/michaellabitzke/Kitchen-Ki-APP/middleware.ts ./
cp /Users/michaellabitzke/Kitchen-Ki-APP/next.config.js ./
cp /Users/michaellabitzke/Kitchen-Ki-APP/tailwind.config.js ./
cp /Users/michaellabitzke/Kitchen-Ki-APP/postcss.config.js ./
cp /Users/michaellabitzke/Kitchen-Ki-APP/tsconfig.json ./
cp /Users/michaellabitzke/Kitchen-Ki-APP/types.ts ./
```

### Nach dem Kopieren

1. `pnpm install` im Root ausführen
2. `.env.local` erstellen mit Supabase Keys
3. `pnpm dev` starten

## Struktur

```
crm/
├── app/              # Next.js App Router
├── components/       # React Components
├── hooks/            # Custom Hooks
├── lib/              # Utilities, Services
├── public/           # Static Assets
└── types.ts          # Type Definitions
```

## Customer API Routes

Die Customer API Routes werden hier hinzugefügt unter:
```
app/api/customer/
├── auth/
│   ├── login/route.ts
│   └── logout/route.ts
├── documents/route.ts
├── tickets/route.ts
└── project/route.ts
```
