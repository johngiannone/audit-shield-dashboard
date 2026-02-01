# API Reference

This document provides a complete reference for all Edge Function endpoints in the Return Shield platform.

## Table of Contents

- [Authentication](#authentication)
- [AI Analysis Endpoints](#ai-analysis-endpoints)
- [Payment & Subscription](#payment--subscription)
- [Client Management](#client-management)
- [Email Notifications](#email-notifications)
- [Document Generation](#document-generation)

---

## Authentication

All authenticated endpoints require a valid JWT token in the `Authorization` header:

```
Authorization: Bearer <JWT_TOKEN>
```

| Endpoint | Auth Required | Description |
|----------|---------------|-------------|
| `analyze-notice` | ✅ Yes | Analyze uploaded tax notices |
| `analyze-audit-risk` | ✅ Yes | Comprehensive audit risk assessment |
| `analyze-penalty-notice` | ✅ Yes | Extract penalty details from notices |
| `analyze-schedule-c` | ✅ Yes | Analyze Schedule C for business risks |
| `decode-transcript` | ✅ Yes | Decode IRS account transcripts |
| `draft-response` | ✅ Yes | AI-draft response letters |
| `create-checkout` | ✅ Yes | Create Stripe checkout session |
| `check-subscription` | ✅ Yes | Check user subscription status |
| `customer-portal` | ✅ Yes | Get Stripe customer portal URL |
| `generate-fta-letter` | ✅ Yes | Generate FTA request letter |
| `generate-activation-link` | ✅ Yes | Generate client activation link |
| `process-bulk-invites` | ✅ Yes | Process bulk client invitations |
| `process-scan-job` | ✅ Yes | Process batch scan jobs |
| `send-fta-letter` | ✅ Yes | Email FTA letter to recipient |
| `send-intro-email` | ✅ Yes | Send case introduction email |
| `send-status-update` | ✅ Yes | Send case status update email |
| `send-message-notification` | ✅ Yes | Notify of new case messages |
| `send-document-request` | ✅ Yes | Request document from client |
| `send-document-rejection` | ✅ Yes | Notify client of rejected document |
| `send-document-upload-notification` | ✅ Yes | Notify agent of new upload |
| `send-client-reminder` | ✅ Yes | Send reminder to client |
| `send-partner-invites` | ✅ Yes | Send partner program invitations |
| `send-welcome-email` | ✅ Yes | Send welcome email to new users |
| `activate-client` | ❌ No | Client account activation |
| `send-deadline-reminder` | ❌ No | Scheduled deadline reminders |
| `send-partner-lead-notification` | ❌ No | Notify of new partner leads |
| `stripe-webhook` | ❌ No | Stripe webhook handler |

---

## AI Analysis Endpoints

### `POST /analyze-notice`

Analyzes uploaded IRS or state tax notices using AI to extract key information.

**Authentication:** Required

**Content-Type:** `multipart/form-data`

#### Request

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | ✅ | PDF or image file (PNG, JPG, GIF, WebP) |

#### Response

```json
{
  "analysis": {
    "agency": "IRS",
    "notice_type": "CP2000",
    "tax_year": 2023,
    "client_name_on_notice": "John Smith",
    "response_due_date": "2024-03-15",
    "summary": "Notice proposing additional tax due to unreported income. Response required within 30 days."
  }
}
```

#### Error Responses

| Status | Description |
|--------|-------------|
| 400 | No file provided or unsupported file type |
| 402 | AI usage limit reached |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

### `POST /analyze-audit-risk`

Comprehensive audit risk assessment analyzing tax returns for red flags.

**Authentication:** Required

**Content-Type:** `application/json`

#### Request

```json
{
  "filePath": "temp-audit-files/abc123/return.pdf",
  "fileType": "pdf",
  "formType": "1040",
  "priorYearLosses": 0,
  "manualHousingCost": null,
  "activeShareholders": null,
  "totalAssets": null,
  "businessYearsActive": null,
  "profitableYears": null,
  "hasMileageLog": false
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `filePath` | string | ✅ | Path to file in `temp-audit-files` bucket |
| `fileType` | string | ❌ | File type (default: pdf) |
| `formType` | string | ❌ | Form type: `1040`, `1120-S`, `1120` |
| `priorYearLosses` | number | ❌ | Prior year losses count |
| `manualHousingCost` | number | ❌ | Manual housing cost override |
| `activeShareholders` | number | ❌ | S-Corp active shareholders count |
| `totalAssets` | number | ❌ | Total business assets |
| `businessYearsActive` | number | ❌ | Years in business |
| `profitableYears` | number | ❌ | Profitable years count |
| `hasMileageLog` | boolean | ❌ | Has mileage documentation |

#### Response

```json
{
  "score": 65,
  "flags": [
    {
      "flag": "High Charitable Deductions",
      "severity": "high",
      "details": "Charitable contributions of $15,000 exceed IRS benchmark of $5,000 for your income level by 200%."
    }
  ],
  "extractedData": {
    "agi": 150000,
    "businessIncome": 50000,
    "charitableContributions": 15000,
    "taxYear": 2023,
    "stateCode": "CA"
  },
  "benchmarks": {
    "avgCharitableDeduction": 5000,
    "avgMortgageInterest": 12000
  },
  "industryBenchmark": {
    "industryName": "Professional Services",
    "avgProfitMargin": 0.25,
    "userProfitMargin": 0.35
  },
  "geoRisk": {
    "stateCode": "CA",
    "stateName": "California",
    "auditRate": 5.2,
    "isHighRisk": true
  }
}
```

---

### `POST /analyze-penalty-notice`

Extracts penalty details and taxpayer information from IRS/FTB penalty notices.

**Authentication:** Required

**Content-Type:** `multipart/form-data`

#### Request

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | ✅ | PDF or image of penalty notice |

#### Response

```json
{
  "analysis": {
    "agency_type": "IRS",
    "notice_number": "CP14",
    "tax_year": 2023,
    "taxpayer_name": "John Smith",
    "address_line_1": "123 Main Street",
    "address_city": "Los Angeles",
    "address_state": "CA",
    "address_zip": "90001",
    "failure_to_file_penalty": 500,
    "failure_to_pay_penalty": 250,
    "other_penalties": 0,
    "interest_amount": 75,
    "total_amount_due": 825,
    "notice_date": "2024-01-15",
    "response_due_date": "2024-02-15",
    "ssn_last_4": "1234"
  }
}
```

---

### `POST /decode-transcript`

Decodes IRS account transcripts and identifies transaction codes.

**Authentication:** Required

**Content-Type:** `application/json`

#### Request

```json
{
  "pdfBase64": "<base64-encoded-pdf>",
  "fileName": "account_transcript.pdf"
}
```

#### Response

```json
{
  "timeline": [
    {
      "code": "420",
      "date": "04-15-2024",
      "description": "Examination indicator",
      "severity": "critical",
      "category": "audit",
      "explanation": "Your return has been selected for examination.",
      "recommendedAction": "Gather all supporting documentation immediately."
    }
  ],
  "statusSummary": {
    "status": "AUDIT RISK DETECTED",
    "riskLevel": "critical",
    "criticalCodes": ["420"],
    "highCodes": [],
    "message": "Critical audit-related codes found (420). Your return may be under examination."
  },
  "rawExtractedCodes": [
    { "code": "420", "date": "04-15-2024" }
  ]
}
```

---

### `POST /draft-response`

AI-drafts formal response letters to IRS/state notices.

**Authentication:** Required

**Content-Type:** `application/json`

#### Request

```json
{
  "noticeType": "CP2000",
  "taxYear": 2023,
  "clientName": "John Smith",
  "summary": "Client received CP2000 for unreported 1099 income of $5,000.",
  "agency": "IRS",
  "caseId": "uuid-of-case",
  "profileId": "uuid-of-profile"
}
```

#### Response

```json
{
  "draft": "# Response to Notice CP2000\n\n[Full markdown-formatted letter content...]"
}
```

---

## Payment & Subscription

### `POST /create-checkout`

Creates a Stripe Checkout session for plan subscription.

**Authentication:** Required

**Content-Type:** `application/json`

#### Request

```json
{
  "planType": "individual",
  "retroactiveYears": [2023, 2022],
  "referralCode": "ABC123",
  "promoCode": "SAVE10"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `planType` | string | ✅ | `individual` or `business` |
| `retroactiveYears` | number[] | ❌ | Additional years to cover |
| `referralCode` | string | ❌ | Affiliate referral code |
| `promoCode` | string | ❌ | Stripe promotion code |

#### Response

```json
{
  "url": "https://checkout.stripe.com/pay/cs_test_..."
}
```

---

### `POST /check-subscription`

Retrieves user's subscription status and billing history.

**Authentication:** Required

**Content-Type:** `application/json`

#### Response

```json
{
  "subscribed": true,
  "subscription": {
    "id": "sub_1234567890",
    "status": "active",
    "planName": "Individual Plan",
    "priceId": "price_1234567890",
    "currentPeriodEnd": "2025-01-15T00:00:00Z",
    "cancelAtPeriodEnd": false,
    "paymentMethod": {
      "last4": "4242",
      "brand": "visa",
      "expMonth": 12,
      "expYear": 2027
    }
  },
  "invoices": [
    {
      "id": "in_1234567890",
      "number": "INV-001",
      "status": "paid",
      "amount": 9900,
      "currency": "usd",
      "created": "2024-01-15T00:00:00Z",
      "invoicePdf": "https://pay.stripe.com/invoice/...",
      "hostedInvoiceUrl": "https://invoice.stripe.com/..."
    }
  ]
}
```

---

### `POST /customer-portal`

Generates a Stripe Customer Portal URL for billing management.

**Authentication:** Required

#### Response

```json
{
  "url": "https://billing.stripe.com/session/..."
}
```

---

### `POST /stripe-webhook`

Handles Stripe webhook events (checkout completion, subscription updates).

**Authentication:** Stripe signature verification

**Headers:**
- `stripe-signature`: Stripe webhook signature

#### Handled Events

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Creates/updates `audit_plans`, processes referral commissions, sends welcome email |

---

## Client Management

### `POST /activate-client`

Activates a client account using an activation code.

**Authentication:** Not required

**Content-Type:** `application/json`

#### Validate Action

```json
// Request
{
  "code": "ABC12345"
}

// Add query param: ?action=validate

// Response
{
  "valid": true,
  "clientName": "John Smith",
  "clientEmail": "john@example.com"
}
```

#### Activate Action

```json
// Request
{
  "code": "ABC12345",
  "password": "securePassword123"
}

// Response
{
  "success": true,
  "email": "john@example.com",
  "message": "Account activated successfully! You can now log in."
}
```

---

### `POST /generate-activation-link`

Generates an activation link for a new client.

**Authentication:** Required (Tax Preparer role)

**Content-Type:** `application/json`

#### Request

```json
{
  "clientEmail": "client@example.com",
  "clientName": "John Smith"
}
```

#### Response

```json
{
  "activationLink": "https://app.returnshield.com/activate?code=ABC12345",
  "code": "ABC12345"
}
```

---

### `POST /process-bulk-invites`

Processes bulk client invitations from CSV upload.

**Authentication:** Required (Tax Preparer role)

**Content-Type:** `application/json`

#### Request

```json
{
  "clients": [
    { "email": "client1@example.com", "name": "Client One" },
    { "email": "client2@example.com", "name": "Client Two" }
  ]
}
```

---

## Email Notifications

### `POST /send-intro-email`

Sends introduction email when a new case is created.

**Authentication:** Required

```json
{
  "case_id": "uuid-of-case",
  "client_profile_id": "uuid-of-client"
}
```

---

### `POST /send-status-update`

Notifies client of case status changes.

**Authentication:** Required

```json
{
  "case_id": "uuid-of-case",
  "new_status": "agent_action",
  "message": "Your case is now being reviewed by an agent."
}
```

---

### `POST /send-document-request`

Requests a document from a client.

**Authentication:** Required

```json
{
  "case_id": "uuid-of-case",
  "document_name": "2023 W-2 Forms",
  "description": "Please upload all W-2 forms for tax year 2023.",
  "agent_profile_id": "uuid-of-agent"
}
```

---

### `POST /send-document-rejection`

Notifies client that an uploaded document was rejected.

**Authentication:** Required

```json
{
  "case_id": "uuid-of-case",
  "document_name": "2023 W-2 Forms",
  "rejection_reason": "Document is illegible. Please upload a clearer copy.",
  "agent_profile_id": "uuid-of-agent"
}
```

---

### `POST /send-document-upload-notification`

Notifies assigned agent when client uploads a document.

**Authentication:** Required

```json
{
  "case_id": "uuid-of-case",
  "document_name": "2023 W-2 Forms",
  "client_profile_id": "uuid-of-client"
}
```

---

### `POST /send-client-reminder`

Sends reminder to client about pending actions.

**Authentication:** Required

```json
{
  "case_id": "uuid-of-case",
  "agent_profile_id": "uuid-of-agent",
  "days_waiting": 7
}
```

---

### `POST /send-deadline-reminder`

Sends automated deadline reminder emails.

**Authentication:** Not required (scheduled function)

---

### `POST /send-welcome-email`

Sends welcome email after successful subscription.

**Authentication:** Required

```json
{
  "email": "user@example.com",
  "name": "John Smith",
  "planLevel": "individual"
}
```

---

### `POST /send-partner-lead-notification`

Notifies team of new partner program applications.

**Authentication:** Not required (triggered by form submission)

---

### `POST /send-partner-invites`

Sends partner program invitations.

**Authentication:** Required

---

## Document Generation

### `POST /generate-fta-letter`

Generates a First-Time Penalty Abatement (FTA) request letter PDF.

**Authentication:** Required

**Content-Type:** `application/json`

#### Request

```json
{
  "userName": "John Smith",
  "address": "123 Main Street",
  "city": "Los Angeles",
  "state": "CA",
  "zip": "90001",
  "ssnLast4": "1234",
  "taxYear": "2023",
  "penaltyAmount": 500,
  "noticeNumber": "CP14",
  "penaltyType": "Failure to File",
  "agencyType": "IRS",
  "saveToDatabase": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userName` | string | ✅ | Taxpayer full name |
| `address` | string | ✅ | Street address |
| `city` | string | ✅ | City |
| `state` | string | ✅ | 2-letter state code |
| `zip` | string | ✅ | ZIP code |
| `ssnLast4` | string | ✅ | Last 4 digits of SSN |
| `taxYear` | string | ✅ | Tax year |
| `penaltyAmount` | number | ✅ | Penalty amount in dollars |
| `noticeNumber` | string | ✅ | IRS notice number |
| `penaltyType` | string | ✅ | Type of penalty |
| `agencyType` | string | ❌ | `IRS` or `State_CA` (default: IRS) |
| `saveToDatabase` | boolean | ❌ | Save to `fta_letters` table |

#### Response

```json
{
  "pdfBase64": "<base64-encoded-pdf>",
  "irsAddress": {
    "service_center_name": "Ogden Service Center",
    "address_line_1": "Ogden, UT 84201-0030",
    "address_line_2": "Internal Revenue Service"
  }
}
```

---

### `POST /send-fta-letter`

Emails a generated FTA letter to recipient(s).

**Authentication:** Required

```json
{
  "pdfBase64": "<base64-encoded-pdf>",
  "recipientEmail": "taxpayer@example.com",
  "ccEmail": "preparer@example.com",
  "taxpayerName": "John Smith",
  "taxYear": "2023"
}
```

---

## Error Response Format

All endpoints return errors in a consistent format:

```json
{
  "error": "Human-readable error message"
}
```

### Common Error Status Codes

| Status | Meaning |
|--------|---------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing or invalid token |
| 402 | Payment Required - AI credits exhausted |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

---

## Rate Limits

- AI endpoints (analyze-*, decode-*, draft-*): Subject to per-user rate limits
- Payment endpoints: Standard Stripe rate limits apply
- Email endpoints: Subject to Resend API limits

---

## Environment Variables

Edge functions require these secrets (configured in Lovable Cloud):

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for admin operations |
| `SUPABASE_ANON_KEY` | Anonymous key for client operations |
| `LOVABLE_API_KEY` | Lovable AI gateway key |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `RESEND_API_KEY` | Resend email service key |
