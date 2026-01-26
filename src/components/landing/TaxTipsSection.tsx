import { Calendar, FileText, AlertTriangle, TrendingUp, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const taxTips = [
  {
    category: 'Audit Prevention',
    title: '7 Red Flags That Trigger IRS Audits in 2025',
    excerpt: 'Learn the most common mistakes that put taxpayers on the IRS radar—and how to avoid them before filing.',
    icon: AlertTriangle,
    readTime: '5 min read',
  },
  {
    category: 'Tax Planning',
    title: 'Schedule C Deductions: What Self-Employed Filers Miss',
    excerpt: 'Maximize your legitimate deductions while staying compliant. A guide for freelancers and small business owners.',
    icon: FileText,
    readTime: '7 min read',
  },
  {
    category: 'IRS Updates',
    title: 'New IRS Enforcement Priorities for 2025',
    excerpt: 'The IRS is increasing audits in specific areas. Here\'s what you need to know to stay protected.',
    icon: TrendingUp,
    readTime: '4 min read',
  },
  {
    category: 'Deadlines',
    title: 'Key Tax Dates Every Taxpayer Should Know',
    excerpt: 'From quarterly estimates to extension deadlines—never miss an important tax date again.',
    icon: Calendar,
    readTime: '3 min read',
  },
];

export function TaxTipsSection() {
  return (
    <div className="mt-24 max-w-6xl mx-auto" id="tax-tips">
      <div className="text-center mb-14">
        <Badge variant="secondary" className="mb-4">
          Tax Resources
        </Badge>
        <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
          Tax Tips & Insights
        </h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Expert guidance to help you file smarter and reduce your audit risk
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {taxTips.map((tip, index) => (
          <Card 
            key={index} 
            interactive 
            className="group animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <tip.icon className="h-5 w-5 text-primary" />
                </div>
                <Badge variant="outline" className="text-xs">
                  {tip.category}
                </Badge>
              </div>
              
              <h3 className="font-display text-lg font-semibold text-foreground mb-2 leading-tight group-hover:text-primary transition-colors">
                {tip.title}
              </h3>
              
              <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                {tip.excerpt}
              </p>
              
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <span className="text-xs text-muted-foreground">{tip.readTime}</span>
                <span className="text-primary text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                  Read more
                  <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center mt-10">
        <p className="text-sm text-muted-foreground">
          More articles coming soon. Subscribe to our newsletter for the latest tax insights.
        </p>
      </div>
    </div>
  );
}
