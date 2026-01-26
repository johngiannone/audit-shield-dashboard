import { useParams, Link, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Shield, ArrowLeft, Clock, Calendar, User, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { blogPosts } from './Blog';

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = blogPosts.find(p => p.slug === slug);

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": post.excerpt,
    "datePublished": post.publishedAt,
    "dateModified": post.publishedAt,
    "author": {
      "@type": "Person",
      "name": post.author
    },
    "publisher": {
      "@type": "Organization",
      "name": "Return Shield",
      "logo": {
        "@type": "ImageObject",
        "url": "https://returnshield.com/logo.png"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://returnshield.com/blog/${post.slug}`
    },
    "articleSection": post.category,
    "wordCount": post.content.split(/\s+/).length
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://returnshield.com"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Blog",
        "item": "https://returnshield.com/blog"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": post.title,
        "item": `https://returnshield.com/blog/${post.slug}`
      }
    ]
  };

  // Get related posts (same category, excluding current)
  const relatedPosts = blogPosts
    .filter(p => p.category === post.category && p.slug !== post.slug)
    .slice(0, 2);

  // If no same-category posts, get any other posts
  const otherPosts = relatedPosts.length > 0 
    ? relatedPosts 
    : blogPosts.filter(p => p.slug !== post.slug).slice(0, 2);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{post.title} | Return Shield Blog</title>
        <meta name="description" content={post.excerpt} />
        <meta name="keywords" content={`${post.category}, tax tips, IRS, audit, ${post.title.toLowerCase()}`} />
        <link rel="canonical" href={`https://returnshield.com/blog/${post.slug}`} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://returnshield.com/blog/${post.slug}`} />
        <meta property="article:published_time" content={post.publishedAt} />
        <meta property="article:section" content={post.category} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.excerpt} />
        <script type="application/ld+json">
          {JSON.stringify(articleSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
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
          <Link to="/blog">
            <Button variant="ghost" size="sm">Blog</Button>
          </Link>
          <Link to="/auth">
            <Button variant="outline" size="sm">Sign In</Button>
          </Link>
        </div>
      </header>

      {/* Breadcrumb */}
      <nav className="container mx-auto px-6 py-4" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-sm text-muted-foreground">
          <li><Link to="/" className="hover:text-primary transition-colors">Home</Link></li>
          <li>/</li>
          <li><Link to="/blog" className="hover:text-primary transition-colors">Blog</Link></li>
          <li>/</li>
          <li className="text-foreground truncate max-w-[200px]">{post.title}</li>
        </ol>
      </nav>

      {/* Article */}
      <article className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Back Link */}
        <Link to="/blog" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8">
          <ArrowLeft className="h-4 w-4" />
          Back to all articles
        </Link>

        {/* Article Header */}
        <header className="mb-10">
          <Badge variant="secondary" className="mb-4">{post.category}</Badge>
          <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
            {post.title}
          </h1>
          <p className="text-xl text-muted-foreground mb-6">
            {post.excerpt}
          </p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pb-6 border-b border-border">
            <span className="flex items-center gap-1.5">
              <User className="h-4 w-4" />
              {post.author}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {post.readTime}
            </span>
          </div>
        </header>

        {/* Article Content */}
        <div className="prose prose-slate dark:prose-invert max-w-none
          prose-headings:font-display prose-headings:font-bold
          prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
          prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
          prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:mb-4
          prose-li:text-muted-foreground
          prose-strong:text-foreground
          prose-a:text-primary prose-a:no-underline hover:prose-a:underline
          prose-ul:my-4 prose-ol:my-4
          prose-li:my-1
        ">
          {post.content.split('\n').map((line, i) => {
            const trimmed = line.trim();
            if (!trimmed) return null;
            
            if (trimmed.startsWith('## ')) {
              return <h2 key={i}>{trimmed.slice(3)}</h2>;
            }
            if (trimmed.startsWith('### ')) {
              return <h3 key={i}>{trimmed.slice(4)}</h3>;
            }
            if (trimmed.startsWith('- ')) {
              return null; // Will be handled in list groups
            }
            if (trimmed.startsWith('1. ') || trimmed.startsWith('2. ') || trimmed.startsWith('3. ') || trimmed.startsWith('4. ') || trimmed.startsWith('5. ') || trimmed.startsWith('6. ') || trimmed.startsWith('7. ')) {
              return null; // Will be handled in list groups
            }
            
            // Handle paragraphs with markdown-style formatting
            const formatted = trimmed
              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
              .replace(/\*(.*?)\*/g, '<em>$1</em>');
            
            return <p key={i} dangerouslySetInnerHTML={{ __html: formatted }} />;
          })}
          
          {/* Render lists properly */}
          {post.content.includes('- ') && (
            <ul>
              {post.content.split('\n')
                .filter(line => line.trim().startsWith('- '))
                .map((line, i) => {
                  const formatted = line.trim().slice(2)
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>');
                  return <li key={i} dangerouslySetInnerHTML={{ __html: formatted }} />;
                })}
            </ul>
          )}
        </div>

        {/* CTA Box */}
        <div className="mt-12 p-8 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 rounded-2xl border border-primary/20">
          <h3 className="font-display text-2xl font-bold text-foreground mb-3">
            Protect Yourself from IRS Audits
          </h3>
          <p className="text-muted-foreground mb-6">
            Now that you know what triggers audits, make sure you're protected if one happens. Return Shield provides full audit defense coverage starting at just $99/year.
          </p>
          <Link to="/auth">
            <Button size="lg">
              Get Audit Protection
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </article>

      {/* Related Posts */}
      {otherPosts.length > 0 && (
        <section className="container mx-auto px-6 py-12 border-t border-border">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-display text-2xl font-bold text-foreground mb-8">
              Continue Reading
            </h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {otherPosts.map(relatedPost => (
                <Link key={relatedPost.slug} to={`/blog/${relatedPost.slug}`}>
                  <div className="group p-6 bg-card rounded-xl border border-border hover:shadow-lg hover:-translate-y-1 transition-all">
                    <Badge variant="outline" className="mb-3">{relatedPost.category}</Badge>
                    <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors mb-2">
                      {relatedPost.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {relatedPost.excerpt}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer CTA */}
      <section className="gradient-primary py-12">
        <div className="container mx-auto px-6 text-center">
          <p className="text-primary-foreground/80 mb-4">Ready to file with confidence?</p>
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
