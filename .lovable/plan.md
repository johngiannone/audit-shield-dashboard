

## Fix: Duplicate `createAdminClient()` in `analyze-audit-risk`

### Problem
The `analyze-audit-risk/index.ts` edge function has `const supabase = createAdminClient()` declared twice — once at line 31 (added during rate-limiter integration) and again at line 70 (the original). This causes a JavaScript runtime error (`SyntaxError: Identifier 'supabase' has already been declared`), meaning the audit risk analysis endpoint is currently **broken**.

### Fix
Remove the duplicate declaration on line 70. The `supabase` client created at line 31 is already in scope and used correctly throughout the rest of the function.

### Changes
- **`supabase/functions/analyze-audit-risk/index.ts`** — Delete line 70 (`const supabase = createAdminClient();`)

