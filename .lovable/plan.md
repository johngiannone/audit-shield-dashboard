
# Plan: IRS Form 2848 (Power of Attorney) Generator

## Overview
Add a feature to generate IRS Form 2848 (Power of Attorney and Declaration of Representative) from the Agent Case Detail page. When clicked, the button will fetch both the agent's and client's profile data and generate a pre-filled PDF.

## Implementation Steps

### Step 1: Create Form 2848 Generator Utility
**File:** `src/utils/form-2848-generator.ts` (new file)

Create a utility module following the same pattern as `fta-letter-generator.ts`:

**Data Interfaces:**
- `AgentData` - Representative information (name, address, phone, CAF number, PTIN, firm name)
- `ClientData` - Taxpayer information (name, address, SSN, tax year, tax matters)

**Core Functions:**
- `generateForm2848(agentData, clientData)` - Creates the PDF with IRS Form 2848 layout
- `downloadForm2848(agentData, clientData)` - Triggers browser download

**Form Layout Sections:**
1. **Part I - Power of Attorney** (Taxpayer Information)
   - Taxpayer name, address, SSN/EIN
   - Daytime phone number

2. **Part II - Representative(s)** 
   - Representative name, CAF number, PTIN, phone
   - Address (street, city, state, ZIP)
   - Designation (Enrolled Agent checkbox)
   - Signature line with date

3. **Part III - Tax Matters**
   - Tax form number (1040, etc.)
   - Tax year(s) covered
   - Tax matter description

4. **Part IV - Specific Acts Authorized**
   - Standard checkboxes for common authorizations

5. **Part V - Declaration of Representative**
   - Signature line for representative

6. **Footer** - Form number reference (IRS Form 2848, Rev. 2021)

### Step 2: Update AgentCaseDetail Page
**File:** `src/pages/AgentCaseDetail.tsx`

**Changes:**
1. Add import for the new generator utility
2. Add state for `generatingPOA` loading indicator
3. Create `generatePOA` async function that:
   - Fetches current agent's full profile data
   - Fetches client's full profile data using `caseDetail.client_id`
   - Calls `downloadForm2848()` with the data
   - Shows toast on success/error

4. Add "Generate POA (2848)" button in header actions area (next to "Unassign Case"):
   - Uses `FileSignature` icon from lucide-react
   - Shows loading spinner when generating
   - Disabled during generation

## User Experience Flow
1. Agent views a case in the Case Workspace
2. Agent clicks "Generate POA (2848)" button in header
3. System fetches agent and client profile data
4. PDF downloads automatically with filename like `Form_2848_ClientName_2024.pdf`
5. Toast notification confirms successful generation

## Technical Details

**Profile Data Usage:**
- Agent: `full_name`, `address`, `phone`, `brand_firm_name` (for firm name)
- Client: `full_name`, `address`, `phone`
- Case: `tax_year` for the tax matters section

**Form Pre-filling Notes:**
- Some fields (SSN, CAF#, PTIN) will have placeholder text since they aren't stored in profiles
- The form will include clear instructions for manually completing these fields
- Tax form type will default to "1040" based on the case context

**Error Handling:**
- Missing required profile data shows warning toast
- PDF generation errors caught and displayed to user
