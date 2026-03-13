

## Add Download/Preview to Audit Vault Document Cards

### Changes

**`src/pages/AuditVault.tsx`**

Add two buttons to each document card (next to the delete button):

1. **Preview** (Eye icon) -- Opens the file in a new browser tab using a signed URL from the `audit-vault` storage bucket
2. **Download** (Download icon) -- Downloads the file using a signed URL with the `download` query param

Implementation:
- Add a helper function `getSignedUrl(filePath)` that calls `supabase.storage.from('audit-vault').createSignedUrl(path, 3600)` (1-hour expiry)
- For **Preview**: open the signed URL in a new tab (`window.open`)
- For **Download**: create a temporary anchor element with `download` attribute to trigger browser download
- Add `Eye` and `Download` icons from lucide-react
- Place both buttons alongside the existing delete button in the card footer, all using the same ghost/icon styling with hover-reveal behavior

No database or storage changes needed -- the `audit-vault` bucket and RLS policies already exist.

