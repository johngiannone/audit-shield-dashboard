# System Architecture

This document provides a visual overview of the Return Shield platform architecture, including data flow diagrams and component interactions.

## Table of Contents

- [High-Level Architecture](#high-level-architecture)
- [Authentication Flow](#authentication-flow)
- [AI Analysis Pipeline](#ai-analysis-pipeline)
- [Case Management Flow](#case-management-flow)
- [Payment Processing Flow](#payment-processing-flow)
- [Notification System](#notification-system)
- [File Storage Architecture](#file-storage-architecture)

---

## High-Level Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[React/Vite SPA]
        RC[React Components]
        RQ[TanStack Query]
        RR[React Router]
    end

    subgraph "Backend Services"
        SB[Supabase]
        subgraph "Supabase Core"
            AUTH[Auth Service]
            DB[(PostgreSQL)]
            STORAGE[Storage Buckets]
            RT[Realtime]
        end
        subgraph "Edge Functions"
            AI_FN[AI Analysis]
            PAY_FN[Payment Processing]
            EMAIL_FN[Email Notifications]
            DOC_FN[Document Generation]
        end
    end

    subgraph "External Services"
        OPENROUTER[OpenRouter/Lovable AI]
        STRIPE[Stripe]
        RESEND[Resend Email]
    end

    UI --> RC
    RC --> RQ
    RC --> RR
    RQ --> SB
    
    SB --> AUTH
    SB --> DB
    SB --> STORAGE
    SB --> RT
    
    AI_FN --> OPENROUTER
    PAY_FN --> STRIPE
    EMAIL_FN --> RESEND
    DOC_FN --> STORAGE
```

---

## Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant UI as React App
    participant Auth as Supabase Auth
    participant DB as PostgreSQL
    participant Trigger as DB Trigger

    U->>UI: Sign Up with Email/Password
    UI->>Auth: supabase.auth.signUp()
    Auth->>Auth: Create auth.users record
    Auth->>Trigger: NEW user inserted
    Trigger->>DB: handle_new_user()
    DB->>DB: Create profiles record
    Auth-->>UI: Return session + JWT
    UI-->>U: Redirect to Dashboard

    Note over U,Trigger: Profile auto-created via trigger
```

### Role-Based Access

```mermaid
graph LR
    subgraph "User Roles"
        CLIENT[Client]
        AGENT[Agent]
        EA[Enrolled Agent]
        TP[Tax Preparer]
        SA[Super Admin]
    end

    subgraph "Access Levels"
        OWN[Own Data Only]
        ASSIGNED[Assigned Cases]
        MANAGED[Managed Clients]
        ALL[All Data]
    end

    CLIENT --> OWN
    AGENT --> ASSIGNED
    EA --> ASSIGNED
    TP --> MANAGED
    SA --> ALL
```

---

## AI Analysis Pipeline

### Notice Analysis Flow

```mermaid
sequenceDiagram
    participant U as User
    participant UI as React App
    participant EF as analyze-notice
    participant AI as Lovable AI
    participant DB as PostgreSQL
    participant S as Storage

    U->>UI: Upload Notice PDF
    UI->>S: Store file in 'notices' bucket
    UI->>EF: POST /analyze-notice
    EF->>S: Retrieve file
    EF->>EF: Convert to base64
    EF->>AI: Send to Gemini 2.5 Flash
    AI->>AI: Extract structured data
    AI-->>EF: Return JSON analysis
    EF->>DB: Log AI usage
    EF-->>UI: Return analysis result
    UI->>DB: Create case record
    UI-->>U: Display extracted info
```

### Audit Risk Assessment Flow

```mermaid
sequenceDiagram
    participant U as User
    participant UI as React App
    participant S as Storage
    participant EF as analyze-audit-risk
    participant AI as Lovable AI
    participant DB as PostgreSQL

    U->>UI: Upload Tax Return
    UI->>S: Store in 'temp-audit-files'
    UI->>EF: POST /analyze-audit-risk
    EF->>S: Retrieve file
    EF->>AI: Extract return data
    AI-->>EF: Return extracted fields
    
    EF->>DB: Fetch IRS benchmarks
    EF->>DB: Fetch industry benchmarks
    EF->>DB: Fetch geo risk factors
    
    EF->>EF: Calculate risk score
    EF->>EF: Generate red flags
    
    EF->>S: Delete temp file
    EF->>DB: Log AI usage
    EF-->>UI: Return risk assessment
    UI-->>U: Display risk dashboard
```

### Transcript Decoder Flow

```mermaid
flowchart TD
    A[Upload Transcript PDF] --> B[decode-transcript Edge Function]
    B --> C[AI Extracts Transaction Codes]
    C --> D{Match Against irs_transaction_codes}
    D --> E[Code 420/421 Found?]
    E -->|Yes| F[CRITICAL: Audit Risk]
    E -->|No| G[Code 570/571 Found?]
    G -->|Yes| H[HIGH: Account Hold]
    G -->|No| I[Standard Processing]
    F --> J[Generate Timeline]
    H --> J
    I --> J
    J --> K[Return Decoded Analysis]
```

---

## Case Management Flow

```mermaid
stateDiagram-v2
    [*] --> triage: Case Created
    triage --> agent_action: Agent Assigned
    agent_action --> client_action: Documents Requested
    client_action --> agent_action: Client Responds
    agent_action --> resolved: Issue Resolved
    resolved --> [*]

    note right of triage
        New case awaiting
        agent assignment
    end note

    note right of client_action
        Awaiting client
        document upload
    end note
```

### Case Data Flow

```mermaid
graph TB
    subgraph "Case Creation"
        UPLOAD[Upload Notice] --> ANALYZE[AI Analysis]
        ANALYZE --> CREATE[Create Case Record]
    end

    subgraph "Case Tables"
        CASES[(cases)]
        DOCS[(case_documents)]
        MSGS[(case_messages)]
        NOTES[(case_notes)]
        HIST[(case_status_history)]
        REQS[(document_requests)]
    end

    subgraph "Notifications"
        STATUS_NOTIFY[Status Change]
        MSG_NOTIFY[New Message]
        DOC_NOTIFY[Document Upload]
    end

    CREATE --> CASES
    CASES --> DOCS
    CASES --> MSGS
    CASES --> NOTES
    CASES --> HIST
    CASES --> REQS

    HIST --> STATUS_NOTIFY
    MSGS --> MSG_NOTIFY
    DOCS --> DOC_NOTIFY
```

---

## Payment Processing Flow

```mermaid
sequenceDiagram
    participant U as User
    participant UI as React App
    participant EF as create-checkout
    participant S as Stripe
    participant WH as stripe-webhook
    participant DB as PostgreSQL
    participant EM as send-welcome-email

    U->>UI: Select Plan
    UI->>EF: POST /create-checkout
    EF->>S: Create Checkout Session
    S-->>EF: Return session URL
    EF-->>UI: Redirect URL
    UI->>S: Redirect to Stripe
    
    U->>S: Complete Payment
    S->>WH: checkout.session.completed
    WH->>DB: Create audit_plans record
    WH->>DB: Process referral commission
    WH->>EM: Trigger welcome email
    EM-->>U: Send confirmation
    
    S-->>UI: Redirect to success page
```

### Subscription Management

```mermaid
flowchart LR
    subgraph "Stripe Integration"
        CS[Checkout Session]
        SUB[Subscription]
        WH[Webhook Handler]
        CP[Customer Portal]
    end

    subgraph "Database"
        AP[(audit_plans)]
        AFF[(affiliates)]
        PROF[(profiles)]
    end

    CS --> WH
    WH --> AP
    WH --> AFF
    SUB --> CP
    CP --> SUB
    AP --> PROF
```

---

## Notification System

```mermaid
graph TB
    subgraph "Trigger Events"
        T1[Case Status Change]
        T2[New Message]
        T3[Document Request]
        T4[Agent Assigned]
        T5[Document Uploaded]
    end

    subgraph "Database Triggers"
        TR1[notify_case_status_change]
        TR2[notify_new_case_message]
        TR3[notify_document_request]
        TR4[notify_agent_assigned]
        TR5[notify_document_uploaded]
    end

    subgraph "Notification Storage"
        NT[(notifications table)]
    end

    subgraph "Delivery"
        BELL[In-App Bell]
        EMAIL[Email via Resend]
    end

    T1 --> TR1 --> NT
    T2 --> TR2 --> NT
    T3 --> TR3 --> NT
    T4 --> TR4 --> NT
    T5 --> TR5 --> NT

    NT --> BELL
    NT --> EMAIL
```

### Email Notification Flow

```mermaid
sequenceDiagram
    participant EF as Edge Function
    participant DB as PostgreSQL
    participant R as Resend API
    participant U as User

    EF->>DB: Fetch case details
    EF->>DB: Fetch client profile
    EF->>DB: Fetch agent profile
    EF->>EF: Build email HTML
    EF->>R: POST /emails
    R-->>EF: Email sent confirmation
    EF-->>U: Email delivered
```

---

## File Storage Architecture

```mermaid
graph TB
    subgraph "Storage Buckets"
        B1[notices<br/>Private]
        B2[audit-notices<br/>Private]
        B3[temp-audit-files<br/>Private]
        B4[fta-letters<br/>Private]
        B5[scan-queue<br/>Private]
        B6[brand-logos<br/>Public]
    end

    subgraph "File Lifecycle"
        UPLOAD[User Upload]
        PROCESS[Edge Function Processing]
        STORE[Permanent Storage]
        CLEANUP[Auto Cleanup]
    end

    UPLOAD --> B1
    UPLOAD --> B2
    UPLOAD --> B3
    
    B3 --> PROCESS
    PROCESS --> CLEANUP
    
    PROCESS --> B4
    B4 --> STORE
    
    B6 --> STORE
```

### Temporary File Cleanup

```mermaid
flowchart TD
    A[File Uploaded to temp-audit-files] --> B[Edge Function Processes]
    B --> C[Analysis Complete]
    C --> D[Delete File Immediately]
    D --> E{Cleanup Job}
    E -->|Every 24h| F[Delete files older than 24h]
    F --> G[cleanup_temp_audit_files function]
```

---

## Database Schema Overview

```mermaid
erDiagram
    auth_users ||--o{ profiles : "has"
    profiles ||--o{ cases : "client_id"
    profiles ||--o{ cases : "assigned_agent_id"
    profiles ||--o{ audit_plans : "has"
    profiles ||--o{ user_roles : "has"
    
    cases ||--o{ case_documents : "contains"
    cases ||--o{ case_messages : "contains"
    cases ||--o{ case_notes : "contains"
    cases ||--o{ case_status_history : "tracks"
    cases ||--o{ document_requests : "has"
    
    profiles ||--o{ notifications : "receives"
    profiles ||--o{ risk_assessments : "has"
    profiles ||--o{ fta_letters : "generates"
    
    profiles {
        uuid id PK
        uuid user_id FK
        string full_name
        string email
        string referral_code
        uuid managed_by FK
    }
    
    cases {
        uuid id PK
        uuid client_id FK
        uuid assigned_agent_id FK
        string status
        string notice_type
        int tax_year
        date response_due_date
    }
    
    audit_plans {
        uuid id PK
        uuid profile_id FK
        string plan_level
        string status
        int tax_year
        array covered_years
    }
```

---

## Security Architecture

```mermaid
graph TB
    subgraph "Authentication Layer"
        JWT[JWT Token]
        RLS[Row Level Security]
    end

    subgraph "Authorization Checks"
        ROLE[has_role function]
        OWNER[Owner Check]
        AGENT[Agent Assignment]
        MANAGED[Managed By]
    end

    subgraph "Data Access"
        CLIENT_DATA[Client sees own data]
        AGENT_DATA[Agent sees assigned cases]
        ADMIN_DATA[Admin sees all]
    end

    JWT --> RLS
    RLS --> ROLE
    RLS --> OWNER
    RLS --> AGENT
    RLS --> MANAGED

    ROLE --> CLIENT_DATA
    OWNER --> CLIENT_DATA
    AGENT --> AGENT_DATA
    MANAGED --> AGENT_DATA
    ROLE --> ADMIN_DATA
```

---

## Deployment Architecture

```mermaid
graph TB
    subgraph "Development"
        DEV[Local Development]
        PREVIEW[Lovable Preview]
    end

    subgraph "Production"
        PROD[Published App]
        EDGE[Edge Functions]
        DB_PROD[(Production DB)]
    end

    subgraph "CI/CD"
        AUTO[Auto Deploy on Save]
        MIGRATE[Schema Migrations]
    end

    DEV --> PREVIEW
    PREVIEW --> AUTO
    AUTO --> PROD
    AUTO --> EDGE
    MIGRATE --> DB_PROD
```

---

## Related Documentation

- [API.md](./API.md) - Complete API endpoint reference
- [DEVELOPER.md](./DEVELOPER.md) - Developer setup and guidelines
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Contribution guidelines
