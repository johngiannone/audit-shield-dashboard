

## Fix Build Errors Across Edge Functions

The recent GitHub push introduced breaking inconsistencies between shared utility function signatures and their call sites across multiple edge functions. Here is the full breakdown and fix plan.

---

### Root Causes

**1. `getCorsHeaders(req)` signature mismatch**
The shared `_shared/cors.ts` updated `getCorsHeaders` to require a `Request` parameter, but **4 edge functions** still call it without arguments (`getCorsHeaders()`):
- `batch-scan-queue/index.ts` (11 occurrences)
- `export-calendar/index.ts` (6 occurrences)
- `gdpr-delete/index.ts` (10+ occurrences)
- `gdpr-export/index.ts` (multiple occurrences)
- `purge-expired-data/index.ts` (4 occurrences)

**2. `authenticateUser(req, supabase)` signature mismatch**
The shared `_shared/supabase.ts` defines `authenticateUser(req: Request, supabase: SupabaseClient)`, but three functions call it incorrectly:
- `gdpr-delete/index.ts` -- calls `authenticateUser(adminClient, authHeader)` (args swapped/wrong types)
- `gdpr-export/index.ts` -- same incorrect pattern
- `export-calendar/index.ts` -- same incorrect pattern
- `batch-scan-queue/index.ts` -- calls `authenticateUser(req)` (missing second argument)

**3. Type cast error in `activate-client/index.ts`**
Line 82 casts an array to a single object:
```typescript
const profile = codeData.profiles as { id: string; ... } | null;
```
Since the Supabase join returns an array, this needs to handle the array type.

**4. Null safety in `analyze-audit-risk/score.ts`**
Line 186 accesses `enrichment.benchmarks.avgCharitableDeduction` without a null check on `avgCharitableDeduction`.

**5. Type error in `_shared/security.ts`**
Line 49 inserts into `rate_limits` table but the TypeScript types don't recognize the table schema, resulting in a `never` type error. This needs a type assertion.

---

### Fix Plan

#### File 1: `supabase/functions/batch-scan-queue/index.ts`
- Thread the `req` parameter through the `handleRequest` function
- Change all `getCorsHeaders()` calls to `getCorsHeaders(req)`
- Change `authenticateUser(req)` to `authenticateUser(req, adminClient)` with `adminClient` created before auth
- Fix the `handleCorsPreflightIfNeeded` return check (it returns `Response | null`, not a boolean)

#### File 2: `supabase/functions/export-calendar/index.ts`
- Change all `getCorsHeaders()` calls to `getCorsHeaders(req)` (req is already available in the serve callback)
- Change `authenticateUser(adminClient, authHeader)` to `authenticateUser(req, adminClient)`
- Remove manual auth header extraction since `authenticateUser` handles it internally

#### File 3: `supabase/functions/gdpr-delete/index.ts`
- Change all `getCorsHeaders()` calls to `getCorsHeaders(req)`
- Change `authenticateUser(adminClient, authHeader)` to `authenticateUser(req, adminClient)`
- Remove manual auth header extraction

#### File 4: `supabase/functions/gdpr-export/index.ts`
- Same fixes as gdpr-delete: pass `req` to `getCorsHeaders` and fix `authenticateUser` call

#### File 5: `supabase/functions/purge-expired-data/index.ts`
- Change all `getCorsHeaders()` calls to `getCorsHeaders(req)`
- Fix `handleCorsPreflightIfNeeded` return check if needed

#### File 6: `supabase/functions/activate-client/index.ts`
- Line 82: Change the type assertion to handle the array response:
```typescript
const profileArr = codeData.profiles as { id: string; full_name: string | null; email: string | null; }[] | null;
const profile = profileArr?.[0] ?? null;
```

#### File 7: `supabase/functions/analyze-audit-risk/score.ts`
- Line 186: Add null guard for `avgCharitableDeduction`:
```typescript
} else if (enrichment.benchmarks?.avgCharitableDeduction != null && charityRatio > enrichment.benchmarks.avgCharitableDeduction * 2) {
```

#### File 8: `supabase/functions/_shared/security.ts`
- Line 49: Add type assertion for the `rate_limits` insert to bypass the schema mismatch:
```typescript
await (supabaseAdmin.from("rate_limits") as any).insert({ ... });
```

---

### Summary

| File | Errors Fixed |
|------|-------------|
| `batch-scan-queue/index.ts` | 13 (`getCorsHeaders` + `authenticateUser` + preflight check) |
| `export-calendar/index.ts` | 7 (`getCorsHeaders` + `authenticateUser`) |
| `gdpr-delete/index.ts` | ~12 (`getCorsHeaders` + `authenticateUser`) |
| `gdpr-export/index.ts` | ~8 (`getCorsHeaders` + `authenticateUser`) |
| `purge-expired-data/index.ts` | 4 (`getCorsHeaders`) |
| `activate-client/index.ts` | 1 (type cast) |
| `analyze-audit-risk/score.ts` | 1 (null safety) |
| `_shared/security.ts` | 1 (type assertion) |
| **Total** | **~47 errors resolved** |

