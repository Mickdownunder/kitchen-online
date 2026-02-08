# Code-Konventionen – kitchen-online / BaLeah CRM

## Error Handling

```typescript
// API-Routes: apiErrors verwenden
import { apiErrors } from '@/lib/utils/errorHandling'

return apiErrors.unauthorized()
return apiErrors.forbidden({ component: 'api/tickets' })
return apiErrors.badRequest()
return apiErrors.internal(error as Error, { component: 'api/xyz' })
```

- Keine internen Fehlerdetails an den Client senden
- `logger.error()` mit Kontext für Server-Logs

## Supabase-Client

| Ort | Client | Grund |
|-----|--------|-------|
| Browser (React) | `supabase` aus `lib/supabase/client` | ANON_KEY, Session |
| API-Route (Auth-Check) | `createClient()` | ANON_KEY, Cookies |
| API-Route (DB mit RLS-Bypass) | `createServiceClient()` | SERVICE_ROLE |
| Services (clientseitig) | `supabase` aus client | RLS greift |
| Services (serverseitig) | `createServiceClient()` als Param | z.B. `getCompanyIdForUser(userId, client)` |

**Niemals:** SERVICE_ROLE im Browser.

## Validierung

```typescript
import { validateRequest } from '@/lib/middleware/validateRequest'

const { data, error } = await validateRequest(request, MyZodSchema)
if (error) return error
// data ist typisiert
```

- Zod-Schemas für alle API-Inputs
- `sanitizeString()` für User-Input bei XSS-Risiko

## Services

- Services in `lib/supabase/services/`
- DB-Zeilen → Domain-Objekte über `mapXxxFromDB()`
- Typen aus `@/lib/types/service` (Row, Insert, Update)

## Namensgebung

- Dateien: camelCase für Utils, PascalCase für Komponenten
- API-Routen: `route.ts` in `app/api/.../route.ts`
- Hooks: `useXxx`
