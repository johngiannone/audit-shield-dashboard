# Contributing to Return Shield

Thank you for your interest in contributing to Return Shield! This guide will help you get started.

## Table of Contents
- [Development Workflow](#development-workflow)
- [Code Style Guidelines](#code-style-guidelines)
- [Branch Naming Conventions](#branch-naming-conventions)
- [Pull Request Process](#pull-request-process)
- [Commit Message Format](#commit-message-format)

---

## Development Workflow

### Using Lovable (Recommended)

1. Open the project in Lovable
2. Make changes via the chat interface or code editor
3. Preview changes in real-time
4. Changes auto-sync to GitHub when saved

### Using Local Development

1. Clone the repository:
   ```bash
   git clone <YOUR_GIT_URL>
   cd <YOUR_PROJECT_NAME>
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

4. Push changes to sync with Lovable:
   ```bash
   git add .
   git commit -m "feat: your feature description"
   git push origin main
   ```

---

## Code Style Guidelines

### TypeScript

```typescript
// ✅ Use explicit types for function parameters and returns
function calculateRisk(score: number, factors: RiskFactor[]): RiskResult {
  // ...
}

// ✅ Use interfaces for object shapes
interface RiskFactor {
  name: string;
  weight: number;
  category: 'income' | 'deduction' | 'filing';
}

// ✅ Use type for unions and simple types
type PlanLevel = 'silver' | 'gold' | 'platinum';

// ❌ Avoid 'any' - use 'unknown' if type is truly unknown
function processData(data: any) {} // Bad
function processData(data: unknown) {} // Better
```

### React Components

```typescript
// ✅ Use functional components with TypeScript
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export function Button({ label, onClick, variant = 'primary', disabled = false }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "px-4 py-2 rounded-md font-medium",
        variant === 'primary' && "bg-primary text-primary-foreground",
        variant === 'secondary' && "bg-secondary text-secondary-foreground"
      )}
    >
      {label}
    </button>
  );
}

// ✅ Extract complex logic into custom hooks
function useCaseData(caseId: string) {
  // ...
}

// ✅ Co-locate related files
// src/components/cases/
//   ├── CaseCard.tsx
//   ├── CaseList.tsx
//   └── index.ts
```

### Tailwind CSS

```tsx
// ✅ Use semantic design tokens from the design system
<div className="bg-background text-foreground" />
<div className="bg-primary text-primary-foreground" />
<div className="border-border" />
<div className="text-muted-foreground" />

// ❌ Never use raw color values
<div className="bg-blue-500" />  // Bad
<div className="bg-[#1e3a5f]" /> // Bad

// ✅ Use cn() utility for conditional classes
import { cn } from "@/lib/utils";

<div className={cn(
  "base-classes",
  isActive && "active-classes",
  isDisabled && "disabled-classes"
)} />

// ✅ Keep classes organized: layout → spacing → typography → colors → effects
<div className="flex items-center gap-4 p-4 text-sm font-medium text-foreground bg-card rounded-lg shadow-sm" />
```

### File Organization

```
src/
├── components/
│   ├── ui/              # shadcn/ui components (don't modify heavily)
│   ├── layout/          # Layout components (sidebar, header)
│   ├── cases/           # Case-related components
│   ├── audit/           # Audit risk components
│   └── landing/         # Landing page components
├── pages/               # Route pages
├── hooks/               # Custom React hooks
├── lib/                 # Utility functions
├── utils/               # Business logic utilities
├── i18n/                # Internationalization
│   └── locales/         # Translation files (en.json, es.json)
└── integrations/        # External service integrations
    └── supabase/        # Auto-generated Supabase client
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `CaseDetailModal.tsx` |
| Hooks | camelCase with `use` prefix | `useAuth.tsx` |
| Utilities | camelCase | `formatCurrency.ts` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_FILE_SIZE` |
| Types/Interfaces | PascalCase | `interface CaseData {}` |
| CSS classes | kebab-case (Tailwind) | `text-muted-foreground` |
| Database columns | snake_case | `created_at`, `user_id` |
| Edge functions | kebab-case folders | `analyze-notice/` |

### Internationalization (i18n)

```typescript
// ✅ Always use translation keys for user-facing text
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <Button>{t('common.submit')}</Button>
  );
}

// ✅ Organize keys by feature namespace
// en.json
{
  "common": { "submit": "Submit", "cancel": "Cancel" },
  "auth": { "login": "Log In", "signup": "Sign Up" },
  "cases": { "title": "My Cases", "newCase": "Report New Notice" }
}

// ❌ Never hardcode user-facing strings
<Button>Submit</Button>  // Bad
```

---

## Branch Naming Conventions

Use descriptive branch names with prefixes:

| Prefix | Purpose | Example |
|--------|---------|---------|
| `feature/` | New features | `feature/batch-risk-scan` |
| `fix/` | Bug fixes | `fix/login-redirect-loop` |
| `hotfix/` | Urgent production fixes | `hotfix/stripe-webhook-error` |
| `refactor/` | Code refactoring | `refactor/case-status-workflow` |
| `docs/` | Documentation updates | `docs/api-reference` |
| `chore/` | Maintenance tasks | `chore/update-dependencies` |
| `i18n/` | Translation updates | `i18n/spanish-auth-forms` |

### Examples

```bash
# Feature branches
feature/fta-letter-generator
feature/transcript-decoder
feature/affiliate-portal

# Bug fixes
fix/document-upload-validation
fix/case-status-not-updating

# Documentation
docs/developer-guide
docs/edge-function-reference
```

---

## Pull Request Process

### Before Creating a PR

1. **Test your changes** in the Lovable preview
2. **Run tests** locally if applicable:
   ```bash
   npm run test
   ```
3. **Check for TypeScript errors**:
   ```bash
   npm run build
   ```

### Creating a PR

1. **Title format**: `type: brief description`
   ```
   feat: add batch risk scanning for tax preparers
   fix: resolve case status not updating after document upload
   docs: add edge function API reference
   ```

2. **Description template**:
   ```markdown
   ## Summary
   Brief description of changes.

   ## Changes
   - Added X component
   - Updated Y logic
   - Fixed Z issue

   ## Testing
   - [ ] Tested in Lovable preview
   - [ ] Tested edge functions
   - [ ] Verified on mobile viewport

   ## Screenshots
   (if applicable)

   ## Related Issues
   Closes #123
   ```

### Review Checklist

Reviewers should verify:

- [ ] Code follows style guidelines
- [ ] Components use design system tokens
- [ ] User-facing text uses i18n translations
- [ ] Edge functions have proper error handling
- [ ] RLS policies are appropriate for new tables
- [ ] No sensitive data exposed in logs or responses

### Merging

1. Squash commits for clean history
2. Delete branch after merge
3. Verify deployment in Lovable

---

## Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `refactor` | Code restructuring |
| `test` | Adding/updating tests |
| `chore` | Maintenance, dependencies |
| `i18n` | Translation updates |

### Examples

```bash
feat(cases): add document request rejection workflow

fix(auth): resolve infinite redirect on expired session

docs: add DEVELOPER.md with architecture overview

refactor(audit): extract risk calculation into utility function

i18n: add Spanish translations for landing page

chore: update Tailwind to v3.4
```

### Scope Examples

- `auth` - Authentication
- `cases` - Case management
- `audit` - Audit risk features
- `billing` - Stripe/payments
- `i18n` - Internationalization
- `ui` - UI components
- `edge` - Edge functions

---

## Getting Help

- **Lovable Chat**: Use the AI assistant for guidance
- **Documentation**: Check `DEVELOPER.md` for architecture details
- **Issues**: Create GitHub issues for bugs or feature requests

---

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the code, not the person
- Help others learn and grow

Thank you for contributing! 🎉
