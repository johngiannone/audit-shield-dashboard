import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Shield, Calendar, FileText, AlertTriangle, TrendingUp, ArrowRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const blogPosts = [
  {
    slug: 'irs-palantir-snap-audit-tool-2025',
    category: 'IRS Updates',
    title: 'The IRS Is Using Palantir to Pick Its Next Audit Targets',
    excerpt: 'Leaked documents reveal a $1.8M AI-powered "Selection and Analytic Platform" designed to surface the highest-value fraud cases—including clean energy credit claims and gift tax returns.',
    icon: AlertTriangle,
    readTime: '6 min read',
    publishedAt: '2025-06-27',
    author: 'Return Shield Team',
    ogImage: '/images/og-irs-palantir-snap.jpg',
    content: `
## The IRS Has a New AI Weapon—and It's Built by Palantir

According to documents obtained by WIRED through a public records request, the Internal Revenue Service paid Palantir $1.8 million last year to upgrade a custom case-selection tool called the **Selection and Analytic Platform (SNAP)**. The platform is designed to help the IRS identify the "highest-value" cases for audits, tax collection, and potential criminal investigation.

This is a significant shift. For decades, the IRS relied on more than 100 fragmented business systems and 700 different methods to flag returns for review. SNAP is designed to consolidate that patchwork into a single, AI-assisted decision engine—one that can surface patterns human reviewers might miss.

## What SNAP Actually Does

SNAP is not a replacement for human auditors. Instead, it sits on top of the IRS's sprawling internal databases and helps analysts identify red flags more efficiently. According to the contract documents, the platform is designed to extract "key information about contracts, vehicles and vendors" from "unstructured data from supporting documents."

In plain terms: SNAP reads through the messy, non-standardized attachments and supporting forms that accompany tax filings—the kind of documents that are easy for a human reviewer to skim past—and flags inconsistencies or high-risk indicators.

## Three Areas the IRS Is Targeting First

The contract asked Palantir to build three specific "case selection methods" tied to parts of the existing tax code:

### 1. Disaster Zone Claims
Tax relief for natural disaster victims is a legitimate and important provision—but it's also one that's historically been exploited. SNAP is being configured to identify potentially fraudulent claims in this area.

### 2. Residential Clean Energy Credits
The Residential Clean Energy Credit program, which offsets the cost of installing solar panels, wind turbines, and similar improvements, has seen explosive growth. With that growth comes increased scrutiny. SNAP will help the IRS identify claims that don't match expected patterns.

### 3. Gift Tax Returns (Form 709)
When high-value assets like artwork, private business interests, or stock portfolios are transferred between individuals, the IRS requires detailed disclosure of how those assets were valued. SNAP is being trained to analyze the supporting documentation—appraisals, balance sheets, earnings statements—to flag cases where valuations may be understated.

## What Data Is SNAP Using?

An important detail from the documents: the IRS has specified that SNAP should only use "existing data in SNAP today." This means the platform is not currently pulling in external data sources like social media or third-party transaction platforms.

However, tax policy experts have noted that publicly available data—such as public Venmo transaction logs or Etsy storefronts—could theoretically be of interest to the IRS in the future. For now, SNAP is focused on the IRS's own internal records and the documents taxpayers submit.

## The Bigger Picture: A $200M+ Relationship

Palantir has been working with the IRS since at least 2014, and total contract awards have exceeded $200 million. The SNAP platform is currently in pilot mode, but the contract documents suggest the IRS is interested in deepening and expanding the relationship.

This aligns with the broader trend of IRS modernization. With billions in new funding from the Inflation Reduction Act, the agency is investing heavily in technology to close the estimated $600 billion annual tax gap—the difference between what Americans owe and what they actually pay.

## What This Means for Taxpayers

### If You Claimed Clean Energy Credits
Expect heightened scrutiny on Residential Clean Energy Credit claims. Make sure you have complete documentation: contractor invoices, equipment specifications, proof of installation, and certification that components meet efficiency standards.

### If You Filed a Gift Tax Return
Ensure that all property valuations are supported by qualified, independent appraisals. The IRS will be looking closely at the relationship between the stated value and supporting documentation.

### If You Claimed Disaster Relief
Retain proof of residency in the affected area, documentation of losses, and any FEMA correspondence. Claims that don't match geographic and timeline data are likely to be flagged.

### For Everyone Else
AI-assisted case selection means the IRS can now process and evaluate far more returns than before. The days of "safety in numbers"—assuming your return won't be reviewed because the IRS lacks bandwidth—are ending.

## How to Protect Yourself

The fundamentals haven't changed, but the stakes are higher:

- **Document everything.** If you can't prove a deduction, don't claim it.
- **Be precise.** Round numbers and estimated figures are exactly the kind of pattern AI tools are designed to catch.
- **File accurately the first time.** Amended returns draw additional attention.
- **Get professional help.** A qualified tax professional can identify potential red flags before you file.
- **Secure audit defense coverage.** If the IRS does come knocking, you want professional representation from day one—not after you've already made mistakes in your response.

## The Bottom Line

The IRS is no longer constrained by manual, fragmented review processes. With tools like SNAP, the agency can surface high-value audit targets faster and more accurately than ever before. For taxpayers, this means that thorough documentation and professional preparation aren't just good practice—they're essential.

*This article is based on reporting by WIRED, which obtained contract documents through a public records request. Neither Palantir nor the IRS responded to requests for comment.*
    `,
  },
  {
    slug: 'irs-audit-red-flags-2025',
    category: 'Audit Prevention',
    title: 'Seven Red Flags That Trigger IRS Audits in 2025',
    excerpt: 'How to recognize—and avoid—the filing patterns most likely to draw federal scrutiny.',
    icon: AlertTriangle,
    readTime: '5 min read',
    publishedAt: '2025-01-14',
    author: 'Return Shield Team',
    ogImage: '/images/og-irs-audit-red-flags.jpg',
    content: `
## What Puts a Tax Return on the IRS Radar

Every return filed with the Internal Revenue Service is evaluated by a scoring algorithm known as the Discriminant Information Function (DIF). The DIF assigns each return a numerical score based on its statistical likelihood of containing errors or underreported income. Returns that score above a certain threshold are flagged for further review—and potentially, a full audit.

While no filing strategy can guarantee immunity from examination, understanding the patterns that elevate DIF scores allows taxpayers to file with greater precision and confidence.

## 1. Discrepancies in Reported Income

The IRS independently receives copies of every W-2, 1099, and third-party income document issued in your name. Its matching systems are automated and exact. Any inconsistency between the income you report and the income reported to the IRS generates an immediate flag—often before a human examiner is ever involved.

**Best practice:** Before filing, reconcile your return against every income document you've received for the tax year. Even minor omissions—a forgotten 1099-INT from a savings account, for example—can trigger correspondence.

## 2. Charitable Deductions Disproportionate to Income

Generous philanthropy is commendable, but the IRS benchmarks charitable contributions against national averages within each income bracket. Deductions that significantly exceed those benchmarks invite closer examination.

A few thresholds to keep in mind:

- Contributions exceeding 10% of adjusted gross income tend to attract heightened scrutiny.
- Non-cash donations valued above $5,000 require a qualified independent appraisal.
- All contributions, regardless of size, should be supported by contemporaneous receipts and acknowledgment letters.

If your giving is genuinely above average, thorough documentation is your strongest defense.

## 3. Significant Cash-Based Revenue

Cash-intensive businesses—restaurants, salons, retail shops, and personal services—have long been a focal point for the IRS, largely because cash transactions are more difficult to verify independently. Taxpayers operating in these sectors should maintain especially rigorous records.

**Best practice:** Where feasible, shift toward electronic payment acceptance. Card transactions create an automatic paper trail that substantiates reported revenue and reduces the burden of proof in the event of an audit.

## 4. Home Office Deduction Misapplication

The home office deduction remains one of the most frequently claimed—and most frequently contested—line items on individual returns. To withstand examination, your claim must satisfy two core requirements:

- **Exclusive use:** The designated space must be used solely for business purposes, not shared with personal activities.
- **Regular use:** The space must serve as your principal place of business or be used consistently for client meetings or administrative functions.

Maintain precise measurements of the dedicated square footage and retain documentation for every household expense you allocate to the deduction.

## 5. Business Expenses Out of Step with Industry Norms

The IRS maintains detailed profiles of average expense ratios across industries and income levels. When a return reports business deductions that fall well outside those norms, it draws attention—not because high expenses are inherently suspect, but because they deviate from expected patterns.

If your legitimate costs genuinely exceed industry averages, detailed records and clear explanations are essential. Itemized receipts, contracts, and written justifications for unusual expenditures significantly strengthen your position.

## 6. Conspicuously Round Figures

A return that claims precisely $5,000 in meals, $10,000 in travel, and $3,000 in office supplies signals estimation rather than careful record-keeping. Authentic expenses virtually never resolve to tidy round numbers—and IRS examiners are trained to notice the pattern.

**Best practice:** Report exact figures drawn from actual receipts and financial records. Precision, even when it results in irregular numbers, conveys credibility.

## 7. Chronic Business Losses Suggesting Hobby Activity

A venture that consistently operates at a loss may be reclassified by the IRS as a hobby rather than a legitimate business—at which point related deductions become disallowable. The general safe harbor: a business should demonstrate a profit in at least three of the preceding five tax years.

If your enterprise is in a genuine growth phase or operates in an industry with long development cycles, maintain a documented business plan, evidence of effort to improve profitability, and records demonstrating professional intent.

## Safeguarding Your Filing Position

The most effective audit prevention is straightforward: file an accurate return, substantiated by organized and complete documentation. Beyond that foundation, consider the following:

- Retain records for a minimum of seven years, including receipts, bank statements, and correspondence.
- Engage a qualified tax professional to review your return before filing, particularly if your situation involves complex deductions, business income, or significant year-over-year changes.
- Respond promptly and professionally to any IRS correspondence. Early engagement with a notice often prevents escalation to a full audit.

## The Bottom Line

The vast majority of audits are preventable. They are triggered not by bad luck, but by identifiable patterns—patterns that careful, well-documented filing can avoid entirely. Accuracy and transparency remain the taxpayer's most reliable safeguards.

Should you receive notice of an examination, professional representation is not merely advisable—it is one of the most consequential decisions you can make in protecting your financial interests.
    `,
  },
  {
    slug: 'schedule-c-deductions-guide',
    category: 'Tax Planning',
    title: 'Schedule C Deductions: What Self-Employed Filers Consistently Overlook',
    excerpt: 'A comprehensive guide to maximizing legitimate deductions while maintaining full compliance—built for freelancers, independent contractors, and small business owners.',
    icon: FileText,
    readTime: '7 min read',
    publishedAt: '2025-01-09',
    author: 'Return Shield Team',
    content: `
## The Tax Landscape for Self-Employed Filers

Self-employment carries a distinct tax advantage: access to a broad set of deductions unavailable to traditional W-2 wage earners. Yet a surprising number of freelancers and small business owners fail to claim deductions they are fully entitled to—often because those deductions are poorly understood, easily overlooked, or filed on forms they don't expect.

What follows is a detailed guide to the most commonly missed deductions on Schedule C and related filings, along with the documentation standards required to support them.

## Ten Frequently Overlooked Deductions

### 1. The Self-Employment Tax Deduction

Self-employed individuals pay both the employer and employee portions of Social Security and Medicare taxes. What many filers miss is that the employer-equivalent portion—fully half of the self-employment tax—is deductible when calculating adjusted gross income. Critically, this deduction appears on Form 1040, not on Schedule C itself, which is precisely why it is so often neglected.

### 2. Health Insurance Premiums

Self-employed taxpayers who pay for their own health coverage may deduct 100% of premiums for themselves, their spouse, and their dependents. This is classified as an above-the-line deduction, meaning it reduces adjusted gross income directly—regardless of whether you itemize. For filers bearing the full cost of private insurance, this can represent one of the most substantial deductions available.

### 3. Retirement Plan Contributions

Self-employment offers access to several powerful retirement vehicles, each with meaningful contribution limits:

- **SEP-IRA**: Contributions of up to 25% of net self-employment earnings are permitted, subject to a maximum of $69,000 for the 2025 tax year.
- **Solo 401(k)**: Allows even higher contribution ceilings for sole proprietors with no employees, combining both employee deferrals and employer profit-sharing contributions.
- **SIMPLE IRA**: A practical alternative for self-employed individuals who employ additional staff, offering lower administrative complexity with moderate contribution limits.

These contributions reduce taxable income while simultaneously building long-term financial security—a dual benefit that warrants careful planning.

### 4. Home Office Deduction

The IRS provides two methods for calculating the home office deduction, and the optimal choice depends on your specific circumstances:

- **Simplified method**: A flat deduction of $5 per square foot of dedicated office space, up to a maximum of 300 square feet ($1,500 cap). This approach minimizes record-keeping requirements.
- **Regular method**: A calculation based on the actual percentage of your home devoted to business use, applied against real household expenses—mortgage interest or rent, utilities, insurance, maintenance, and depreciation.

In either case, the space must be used regularly and exclusively for business. Filers who qualify under both methods should calculate each to determine which yields the greater benefit.

### 5. Vehicle Expenses

Taxpayers who use a vehicle for business purposes may choose between two approaches:

- **Standard mileage rate**: 67 cents per mile for the 2025 tax year—a straightforward method that requires only a contemporaneous mileage log.
- **Actual expense method**: Deductions based on the true costs of operation, including fuel, maintenance, insurance, registration, and depreciation, prorated by the percentage of business use.

Regardless of which method you elect, a detailed mileage log is non-negotiable. Record the date, destination, business purpose, and miles driven for every trip. Without it, the deduction is effectively indefensible under audit.

### 6. Professional Development

Investments in your own expertise are fully deductible when they are directly related to your current trade or business. Commonly overlooked items in this category include:

- Online courses, certifications, and continuing education programs
- Industry conferences, seminars, and workshops
- Books, trade journals, and professional subscriptions
- Business coaching and mentorship fees

The key qualifier is relevance: the expenditure must maintain or improve skills required in your existing field, not prepare you for an entirely new one.

### 7. Business Insurance

Premiums paid for coverage that protects your business operations are deductible in full. This encompasses several policy types that self-employed filers frequently neglect to claim:

- Professional liability (errors and omissions) insurance
- General liability coverage
- Business property insurance
- Cyber liability insurance—an increasingly critical line item as digital threats continue to escalate

If a policy serves both personal and business purposes, only the business-attributable portion is deductible.

### 8. Marketing and Advertising

All ordinary and necessary expenses incurred to promote your business qualify as deductions. This includes, but is not limited to:

- Website hosting, domain registration, and design costs
- Social media and search engine advertising
- Business cards, brochures, and printed promotional materials
- Email marketing platforms and CRM software

These costs are often modest individually but substantial in aggregate—making them easy to overlook and well worth tracking systematically.

### 9. Professional Services

Fees paid to outside professionals who support your business operations are deductible. Common examples include:

- Accounting, bookkeeping, and tax preparation services
- Legal consultations and contract review
- Business strategy coaching and advisory services
- Freelance or subcontractor assistance on client projects

Retain invoices and engagement letters for every professional service you claim.

### 10. Banking and Payment Processing Fees

Transaction-level fees are a cost of doing business that many filers simply absorb without claiming. Deductible items include:

- Monthly maintenance fees on dedicated business bank accounts
- Processing fees charged by platforms such as PayPal, Stripe, and Square
- Credit card transaction charges on business-related sales

These are typically documented on monthly statements and year-end summaries from your financial institution or payment processor—making them straightforward to substantiate.

## Record-Keeping Standards

Claiming deductions without adequate documentation is worse than not claiming them at all—it creates liability without protection. Adopt the following practices as a baseline:

- **Maintain a dedicated business bank account and credit card.** Commingling personal and business funds is one of the fastest ways to complicate both your filing and any subsequent examination.
- **Retain all receipts, invoices, and contracts for a minimum of seven years.** Digital storage is acceptable, provided files are organized, backed up, and readily retrievable.
- **Log expenses contemporaneously.** Reconstructing records at year-end is unreliable and produces the kind of approximations—round numbers, missing details—that attract scrutiny.
- **Use accounting software to categorize transactions in real time.** Tools such as QuickBooks Self-Employed, FreshBooks, or Wave eliminate much of the manual burden and produce clean reports at filing time.

## Understanding the Audit Landscape

Schedule C filers face meaningfully higher audit rates than their W-2 counterparts. The reason is structural: self-employment offers greater latitude in both income reporting and expense classification, and the IRS allocates examination resources accordingly.

The most effective safeguards are preventive:

- File accurate, well-documented returns with deductions that are reasonable relative to your reported income.
- Engage a qualified tax professional who understands the nuances of self-employment taxation.
- Secure audit defense coverage before filing, so that professional representation is immediately available should you receive notice of examination.

## The Bottom Line

The deductions available to self-employed filers are extensive—but they are only valuable if properly claimed and thoroughly documented. Leaving legitimate deductions unclaimed costs you money; claiming unsupported deductions exposes you to penalties. The objective is precision: know what you're entitled to, substantiate every dollar, and file with confidence.

For Schedule C filers seeking comprehensive audit protection, Return Shield's Platinum Business plan provides full defense coverage tailored specifically to the complexities of self-employment.
    `,
  },
  {
    slug: 'irs-enforcement-priorities-2025',
    category: 'IRS Updates',
    title: 'New IRS Enforcement Priorities for 2025',
    excerpt: 'The IRS is increasing audits in specific areas. Here\'s what you need to know to stay protected.',
    icon: TrendingUp,
    readTime: '4 min read',
    publishedAt: '2025-01-05',
    author: 'Return Shield Team',
    content: `
## The IRS is Getting Serious

With billions in new funding from the Inflation Reduction Act, the IRS is dramatically expanding its enforcement capabilities. Here's what's changing and how it affects you.

## 87,000 New Agents

The IRS plans to hire tens of thousands of new employees, including:
- Revenue agents for complex audits
- Revenue officers for collections
- Criminal investigation special agents
- Customer service representatives

## Priority Enforcement Areas

### 1. High-Income Earners
The IRS is specifically targeting taxpayers with incomes over $400,000. Expect increased scrutiny on:
- Complex partnership structures
- Pass-through entities
- Large deductions relative to income

### 2. Cryptocurrency
The IRS has made crypto a major focus:
- Enhanced reporting requirements starting 2025
- New Form 1099-DA from exchanges
- Increased audits of crypto traders
- Criminal prosecution for tax evasion

### 3. Large Corporations
Major corporations with assets over $250 million are facing renewed attention, particularly around:
- Transfer pricing
- International tax planning
- Research and development credits

### 4. Pass-Through Entities
LLCs, S-corps, and partnerships are under the microscope:
- Reasonable compensation issues
- Self-employment tax avoidance
- Loss limitation rules

## What This Means for You

### More Correspondence Audits
The easiest way for the IRS to increase enforcement is through automated notices. Expect more CP2000 notices for income matching issues.

### Faster Processing
New technology investments mean the IRS can process more returns and identify discrepancies faster.

### Better Customer Service
Silver lining: phone wait times should decrease as the IRS hires more customer service staff.

## How to Prepare

1. **File accurately** – Double-check all income reporting
2. **Keep detailed records** – You may need to prove deductions
3. **Respond promptly** – Don't ignore IRS correspondence
4. **Get professional help** – Consider professional representation
5. **Get audit protection** – Return Shield provides peace of mind

## The Timeline

These changes are rolling out over the next several years. The IRS is prioritizing:
- **2024-2025**: Hiring and training
- **2025-2026**: Increased audit volume
- **2026+**: Full enforcement capabilities

## Stay Protected

With enforcement ramping up, now is the time to ensure you're protected. Return Shield's audit defense coverage ensures that if you receive any IRS notice, you have a dedicated Enrolled Agent handling your case—at no additional cost.
    `,
  },
  {
    slug: 'important-tax-deadlines-2025',
    category: 'Deadlines',
    title: 'Key Tax Dates Every Taxpayer Should Know',
    excerpt: 'From quarterly estimates to extension deadlines—never miss an important tax date again.',
    icon: Calendar,
    readTime: '3 min read',
    publishedAt: '2025-01-01',
    author: 'Return Shield Team',
    content: `
## 2025 Tax Calendar

Missing a tax deadline can mean penalties, interest, and unnecessary stress. Here are all the key dates you need to know.

## January 2025

### January 15
- **Q4 2024 Estimated Tax Due** – Final quarterly payment for 2024

### January 31
- **W-2 and 1099 Deadline** – Employers must send these forms to employees
- **Form 1099-NEC Due** – For independent contractor payments

## February 2025

### February 18
- **Form 1099-B, 1099-S, 1099-MISC Due** – Brokers and other payers

## March 2025

### March 17
- **S-Corporation Returns (Form 1120-S)** – Due for calendar-year S-corps
- **Partnership Returns (Form 1065)** – Due for calendar-year partnerships
- **Trust Returns (Form 1041)** – For calendar-year trusts

## April 2025

### April 15
- **Individual Tax Returns (Form 1040)** – The big deadline!
- **C-Corporation Returns (Form 1120)** – Calendar-year corporations
- **Q1 2025 Estimated Tax Due** – First quarterly payment
- **Last Day for IRA Contributions** – For 2024 tax year
- **Last Day for HSA Contributions** – For 2024 tax year

### April 15 Extension
If you can't file by April 15, file Form 4868 for an automatic 6-month extension. **Important**: This extends filing time, NOT payment time. You still owe any taxes by April 15.

## June 2025

### June 16
- **Q2 2025 Estimated Tax Due** – Second quarterly payment
- **U.S. Citizens Abroad** – Extended filing deadline

## September 2025

### September 15
- **Q3 2025 Estimated Tax Due** – Third quarterly payment
- **Extended S-Corp and Partnership Returns** – Final deadline

## October 2025

### October 15
- **Extended Individual Returns** – Final deadline for Form 1040
- **Extended C-Corp Returns** – For calendar-year corporations

## Avoiding Penalties

### Failure to File
5% of unpaid taxes per month, up to 25% maximum

### Failure to Pay
0.5% of unpaid taxes per month, up to 25% maximum

### Estimated Tax Penalty
Penalty for not paying enough throughout the year

## Pro Tips

1. **Set calendar reminders** – 2 weeks before each deadline
2. **File early** – Avoid last-minute stress and get refunds faster
3. **Use direct deposit** – Faster refunds than paper checks
4. **Keep records 7 years** – IRS can audit up to 6 years back in some cases
5. **Get protected early** – Buy Return Shield before you file

## Need an Extension?

Extensions are fine, but don't use them as an excuse to procrastinate. The longer you wait, the more stressful tax season becomes. And remember—you still need to pay by April 15!

## We've Got Your Back

No matter when you file, Return Shield has you covered. Our audit defense protection ensures that if the IRS has questions about your return, you don't have to face them alone.
    `,
  },
];

export default function Blog() {
  const blogSchema = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "Return Shield Tax Tips Blog",
    "description": "Expert tax advice, audit prevention tips, and IRS updates to help you file smarter.",
    "url": "https://returnshield.com/blog",
    "publisher": {
      "@type": "Organization",
      "name": "Return Shield",
      "logo": {
        "@type": "ImageObject",
        "url": "https://returnshield.com/logo.png"
      }
    },
    "blogPost": blogPosts.map(post => ({
      "@type": "BlogPosting",
      "headline": post.title,
      "description": post.excerpt,
      "datePublished": post.publishedAt,
      "author": {
        "@type": "Person",
        "name": post.author
      },
      "url": `https://returnshield.com/blog/${post.slug}`
    }))
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Tax Tips & Insights | Return Shield Blog</title>
        <meta name="description" content="Expert tax advice, audit prevention tips, and IRS updates. Learn how to file smarter and reduce your audit risk with Return Shield." />
        <meta name="keywords" content="tax tips, IRS audit, tax deductions, tax planning, audit prevention, self-employed taxes" />
        <link rel="canonical" href="https://returnshield.com/blog" />
        <meta property="og:title" content="Tax Tips & Insights | Return Shield Blog" />
        <meta property="og:description" content="Expert tax advice, audit prevention tips, and IRS updates to help you file smarter." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://returnshield.com/blog" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Tax Tips & Insights | Return Shield Blog" />
        <meta name="twitter:description" content="Expert tax advice, audit prevention tips, and IRS updates." />
        <script type="application/ld+json">
          {JSON.stringify(blogSchema)}
        </script>
      </Helmet>

      {/* Header */}
      <header className="container mx-auto px-6 py-4 flex items-center justify-between border-b border-border">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center shadow-md">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-semibold text-foreground hidden sm:inline">Return Shield</span>
        </Link>
        
        <div className="flex items-center gap-2 md:gap-4">
          <Link to="/partners">
            <Button variant="ghost" size="sm" className="hidden md:inline-flex">For Tax Pros</Button>
          </Link>
          <Link to="/auth">
            <Button variant="outline" size="sm">Sign In</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-6 py-16 text-center">
        <Badge variant="secondary" className="mb-4">Tax Resources</Badge>
        <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
          Tax Tips & Insights
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Expert guidance to help you file smarter, maximize deductions, and reduce your audit risk.
        </p>
      </section>

      {/* Blog Posts Grid */}
      <section className="container mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {blogPosts.map((post, index) => (
            <Link key={post.slug} to={`/blog/${post.slug}`}>
              <Card 
                interactive 
                className="h-full group animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <post.icon className="h-6 w-6 text-primary" />
                    </div>
                    <Badge variant="outline">{post.category}</Badge>
                  </div>
                  
                  <h2 className="font-display text-2xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                    {post.title}
                  </h2>
                  
                  <p className="text-muted-foreground mb-6 line-clamp-3">
                    {post.excerpt}
                  </p>
                  
                  <div className="flex items-center justify-between pt-5 border-t border-border">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {post.readTime}
                      </span>
                      <span>{new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <span className="text-primary font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                      Read
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="gradient-primary py-16">
        <div className="container mx-auto px-6 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
            Get Audit Protection Today
          </h2>
          <p className="text-primary-foreground/80 text-lg mb-8 max-w-2xl mx-auto">
            Reading about tax tips is great, but having professional representation if you get audited is even better.
          </p>
          <Link to="/auth">
            <Button size="lg" variant="secondary">
              Get Protected Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
