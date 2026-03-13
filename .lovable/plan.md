

## Fix: Expense Category Dropdown Not Working

### Problem
The console shows `Function components cannot be given refs` errors originating from `SelectContent` in `select.tsx`. This is a compatibility issue with `@radix-ui/react-select` v2.x -- the `SelectScrollUpButton` and `SelectScrollDownButton` components are being rendered inside `SelectContent` as function components that the Radix internals try to attach refs to, causing the dropdown to malfunction.

### Solution
Remove the inline `SelectScrollUpButton` and `SelectScrollDownButton` from inside `SelectContent`. In Radix Select v2.x, the scroll buttons are handled automatically by the component. Removing them eliminates the ref warning and fixes the dropdown interaction.

### Changes
**`src/components/ui/select.tsx`** -- Remove `<SelectScrollUpButton />` and `<SelectScrollDownButton />` from inside the `SelectContent` component body. The Radix v2 `SelectPrimitive.Content` handles scrolling natively.

