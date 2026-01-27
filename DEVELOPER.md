# Return Shield - Developer Documentation

## Table of Contents
- [System Architecture](#system-architecture)
- [Key Workflows](#key-workflows)
- [Deployment Guide](#deployment-guide)
- [Database Schema](#database-schema)
- [Edge Functions Reference](#edge-functions-reference)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     React + Vite + TypeScript                        │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │    │
│  │  │   Pages      │  │  Components  │  │    Hooks     │               │    │
│  │  │  - Index     │  │  - UI (shadcn)│  │  - useAuth   │               │    │
│  │  │  - Auth      │  │  - Layout    │  │  - useToast  │               │    │
│  │  │  - Dashboard │  │  - Cases     │  │  - useBranding│              │    │
│  │  │  - Cases     │  │  - Audit     │  │              │               │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │    │
│  │                              │                                       │    │
│  │                    ┌─────────▼─────────┐                            │    │
│  │                    │  Supabase Client  │                            │    │
│  │                    │  @/integrations/  │                            │    │
│  │                    │  supabase/client  │                            │    │
│  │                    └─────────┬─────────┘                            │    │
│  └──────────────────────────────┼──────────────────────────────────────┘    │
└─────────────────────────────────┼───────────────────────────────────────────┘
                                  │
                                  │ HTTPS / WebSocket
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           LOVABLE CLOUD (Supabase)                          │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                         Edge Functions (Deno)                         │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐       │  │
│  │  │ analyze-notice  │  │ generate-fta-   │  │ create-checkout │       │  │
│  │  │                 │  │ letter          │  │                 │       │  │
│  │  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘       │  │
│  │           │                    │                    │                 │  │
│  │  ┌────────┴────────┐  ┌────────┴────────┐  ┌────────┴────────┐       │  │
│  │  │ decode-         │  │ send-welcome-   │  │ stripe-webhook  │       │  │
│  │  │ transcript      │  │ email           │  │                 │       │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│  ┌─────────────────────────────────▼────────────────────────────────────┐  │
│  │                         PostgreSQL Database                           │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐              │  │
│  │  │ profiles │  │  cases   │  │ audit_   │  │ document │              │  │
│  │  │          │  │          │  │ plans    │  │ requests │              │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘              │  │
│  │                                                                       │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐              │  │
│  │  │ user_    │  │ fta_     │  │ case_    │  │ notifi-  │              │  │
│  │  │ roles    │  │ letters  │  │ messages │  │ cations  │              │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘              │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                         Storage Buckets                               │  │
│  │  • notices (private) - Uploaded audit notices                         │  │
│  │  • fta-letters (private) - Generated FTA letters                      │  │
│  │  • temp-audit-files (private) - Temporary processing files            │  │
│  │  • brand-logos (public) - Tax preparer branding assets                │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                         Auth (Supabase Auth)                          │  │
│  │  • Email/Password authentication                                      │  │
│  │  • OAuth providers (Google, Apple, LinkedIn)                          │  │
│  │  • Role-based access (client, agent, enrolled_agent, tax_preparer)    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL SERVICES                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   OpenRouter │  │    Resend    │  │    Stripe    │  │  Lovable AI  │    │
│  │   (AI/LLM)   │  │   (Email)    │  │  (Payments)  │  │  (Analysis)  │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React 18 + TypeScript | UI framework |
| Styling | Tailwind CSS + shadcn/ui | Component library |
| Build | Vite | Fast development & bundling |
| State | TanStack Query | Server state management |
| Backend | Supabase (Lovable Cloud) | Database, Auth, Storage |
| Edge Functions | Deno | Serverless API endpoints |
| AI | OpenRouter / Lovable AI | Document analysis |
| Email | Resend | Transactional emails |
| Payments | Stripe | Subscriptions & checkout |

---

## Key Workflows

### 1. Notice Analysis Workflow (`analyze-notice`)

This workflow handles the AI-powered extraction of data from uploaded IRS/State notices.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │     │   Storage   │     │    Edge     │     │  AI Model   │
│   Upload    │────▶│   Bucket    │────▶│  Function   │────▶│  (Gemini)   │
│   (PDF)     │     │  (notices)  │     │             │     │             │
└─────────────┘     └─────────────┘     └──────┬──────┘     └──────┬──────┘
                                               │                    │
                                               │◀───────────────────┘
                                               │    Extracted Data
                                               ▼
                                        ┌─────────────┐
                                        │   Create    │
                                        │    Case     │
                                        │   Record    │
                                        └─────────────┘
```

**Flow Details:**

1. **Upload**: Client uploads PDF/image via `ReportNotice.tsx`
2. **Storage**: File saved to `notices` bucket with path `{userId}/{uuid}.pdf`
3. **Invoke Edge Function**: Frontend calls `analyze-notice` with file path
4. **AI Processing**: Edge function:
   - Fetches file from storage
   - Converts to base64
   - Sends to Gemini 2.5 Flash via OpenRouter
   - Extracts: `agency`, `notice_type`, `tax_year`, `amount_due`, `summary`
5. **Response**: Returns structured JSON to frontend
6. **Case Creation**: User confirms details → case record created in `cases` table

**Code Path:**
```
src/pages/ReportNotice.tsx
  └── supabase.functions.invoke('analyze-notice')
        └── supabase/functions/analyze-notice/index.ts
              └── OpenRouter API (google/gemini-2.5-flash)
```

### 2. FTA Letter Generation Workflow (`generate-fta-letter`)

Generates formal First-Time Abatement request letters with proper IRS routing.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Penalty   │     │   Analyze   │     │  Generate   │     │    Save     │
│   Notice    │────▶│   Notice    │────▶│    PDF      │────▶│   Letter    │
│   Upload    │     │   (AI)      │     │   Letter    │     │   Record    │
└─────────────┘     └─────────────┘     └──────┬──────┘     └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │  Optional   │
                                        │   Email     │
                                        │  Delivery   │
                                        └─────────────┘
```

**Flow Details:**

1. **Notice Upload**: User uploads penalty notice (CP14, CP503, CP504)
2. **AI Extraction** (`analyze-penalty-notice`): Extracts taxpayer info, penalty amounts, dates
3. **User Review**: Confirm/edit extracted details
4. **Letter Generation** (`generate-fta-letter`):
   - Queries `irs_service_centers` table for correct mailing address based on state
   - Generates formal letter citing IRM 20.1.1.3.3.2.1
   - Creates PDF with instruction sheet + letter
5. **Persistence**: Saves to `fta_letters` table and `fta-letters` storage bucket
6. **Optional Email**: Sends via `send-fta-letter` edge function using Resend

**IRS Service Center Routing:**
| States | Service Center |
|--------|----------------|
| AL, AR, AZ, FL, GA, LA, MS, NC, NM, OK, SC, TN, TX | Austin, TX |
| CT, DC, DE, IA, IL, IN, KY, MA, MD, ME, MN, MO, NH, NJ, NY, PA, RI, VA, VT, WI, WV | Kansas City, MO |
| AK, CA, CO, HI, ID, KS, MI, MT, ND, NE, NV, OH, OR, SD, UT, WA, WY | Ogden, UT |

**Code Path:**
```
src/pages/PenaltyEraser.tsx
  └── supabase.functions.invoke('analyze-penalty-notice')
  └── src/utils/fta-letter-generator.ts
        └── supabase.functions.invoke('generate-fta-letter')
              └── jsPDF generation
              └── Storage upload
              └── Database insert
```

### 3. Case Status Workflow

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌──────────┐
│ triage  │────▶│ agent_action│────▶│client_action│────▶│ resolved │
│ (new)   │     │ (assigned)  │     │ (waiting)   │     │ (closed) │
└─────────┘     └─────────────┘     └─────────────┘     └──────────┘
     │                 │                   │
     │                 │                   │
     └─────────────────┴───────────────────┘
              Can return to triage
```

---

## Deployment Guide

### Prerequisites

- Node.js 18+ and npm/bun
- Lovable account with Cloud enabled
- Access to project secrets

### Local Development

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables

The `.env` file is **auto-generated** by Lovable Cloud. Do not edit manually.

```env
VITE_SUPABASE_PROJECT_ID="zpolliyfxojotuszomhj"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbG..."
VITE_SUPABASE_URL="https://zpolliyfxojotuszomhj.supabase.co"
```

### Edge Function Secrets

Secrets are configured via Lovable Cloud UI. Current secrets:

| Secret Name | Purpose |
|-------------|---------|
| `OPENROUTER_API_KEY` | AI model access (Gemini, Claude) |
| `RESEND_API_KEY` | Transactional email sending |
| `STRIPE_SECRET_KEY` | Payment processing |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook verification |
| `LOVABLE_API_KEY` | Lovable AI integration |

**To add/update secrets:**
1. Open Lovable project
2. Navigate to Settings → Cloud → Secrets
3. Add or update the secret value

### Edge Function Deployment

Edge functions are **automatically deployed** when you push changes through Lovable.

**Manual redeployment steps:**
1. Make changes to files in `supabase/functions/`
2. Commit and push to trigger deployment
3. Lovable automatically deploys updated functions

**Function Configuration** (`supabase/config.toml`):
```toml
[functions.analyze-notice]
verify_jwt = true  # Requires authentication

[functions.stripe-webhook]
verify_jwt = false  # Public endpoint (Stripe calls this)

[functions.activate-client]
verify_jwt = false  # Public activation links
```

### Database Migrations

Database changes are managed through Lovable's migration tool:

1. Request changes via Lovable chat
2. Lovable generates SQL migration
3. User approves migration
4. Migration is applied automatically

**Never directly edit:**
- `src/integrations/supabase/types.ts` (auto-generated)
- `src/integrations/supabase/client.ts` (auto-generated)

---

## Database Schema

### Core Tables

#### `profiles`
User profile information linked to Supabase Auth.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | Links to auth.users |
| `full_name` | text | Display name |
| `email` | text | Contact email |
| `phone` | text | Phone number |
| `address` | text | Mailing address |
| `managed_by` | uuid | FK to profiles (for tax preparer clients) |
| `referral_code` | text | Unique referral code |
| `brand_logo_url` | text | Tax preparer branding |
| `brand_primary_color` | text | Brand color |
| `brand_firm_name` | text | Firm name |
| `ptin` | text | Preparer Tax ID |
| `caf_number` | text | CAF number |

#### `cases`
Audit/notice cases being handled.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `client_id` | uuid | FK to profiles |
| `assigned_agent_id` | uuid | FK to profiles (agent) |
| `notice_agency` | text | IRS or State name |
| `notice_type` | text | e.g., CP2000, CP14 |
| `tax_year` | integer | Affected tax year |
| `status` | text | triage/agent_action/client_action/resolved |
| `summary` | text | AI-generated summary |
| `response_due_date` | date | Deadline |
| `file_path` | text | Storage path to notice |
| `tax_return_path` | text | Storage path to return |

#### `audit_plans`
Subscription/membership records.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `profile_id` | uuid | FK to profiles |
| `plan_level` | text | silver/gold/platinum |
| `tax_year` | integer | Base coverage year |
| `covered_years` | integer[] | Array of covered years |
| `status` | text | active/cancelled |
| `stripe_customer_id` | text | Stripe customer |
| `stripe_subscription_id` | text | Stripe subscription |

#### `user_roles`
Role-based access control.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | Links to auth.users |
| `role` | app_role | client/agent/enrolled_agent/tax_preparer/super_admin |

### Relationships Diagram

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│  auth.users  │       │   profiles   │       │  user_roles  │
│              │◀──────│   user_id    │       │   user_id    │──────▶│
│      id      │       │              │       │     role     │       │
└──────────────┘       └──────┬───────┘       └──────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
            ▼                 ▼                 ▼
     ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
     │    cases     │  │  audit_plans │  │  fta_letters │
     │  client_id   │  │  profile_id  │  │  profile_id  │
     │ agent_id     │  │              │  │              │
     └──────┬───────┘  └──────────────┘  └──────────────┘
            │
    ┌───────┼───────┬───────────────┐
    │       │       │               │
    ▼       ▼       ▼               ▼
┌────────┐ ┌────────┐ ┌────────────┐ ┌──────────────┐
│case_   │ │case_   │ │ document_  │ │ case_status_ │
│messages│ │notes   │ │ requests   │ │ history      │
└────────┘ └────────┘ └────────────┘ └──────────────┘
```

### Row-Level Security (RLS)

All tables have RLS enabled with policies based on:

- **Clients**: Can only access their own data
- **Enrolled Agents**: Can access all cases and client data
- **Tax Preparers**: Can access clients they manage (`managed_by`)
- **Super Admins**: Full access to all data

---

## Edge Functions Reference

| Function | Auth | Purpose |
|----------|------|---------|
| `analyze-notice` | JWT | AI extraction from notices |
| `analyze-penalty-notice` | JWT | Extract penalty details |
| `generate-fta-letter` | JWT | Create FTA PDF letters |
| `send-fta-letter` | JWT | Email FTA letters |
| `decode-transcript` | JWT | Parse IRS transcripts |
| `analyze-audit-risk` | JWT | Risk score calculation |
| `create-checkout` | JWT | Stripe checkout session |
| `stripe-webhook` | None | Handle Stripe events |
| `check-subscription` | JWT | Verify subscription status |
| `send-welcome-email` | JWT | Onboarding emails |
| `send-document-request` | JWT | Request docs from clients |
| `send-status-update` | JWT | Case status notifications |
| `activate-client` | None | Public activation links |
| `process-bulk-invites` | JWT | Batch client enrollment |
| `process-scan-job` | JWT | Batch risk scanning |

---

## Testing

```bash
# Run unit tests
npm run test

# Run specific test file
npm run test src/utils/audit-logic.test.ts
```

---

## Contributing

1. Create a feature branch
2. Make changes through Lovable
3. Test thoroughly in preview
4. Changes auto-deploy on publish

---

## Support

For issues or questions, contact the development team or use the Lovable chat interface.
