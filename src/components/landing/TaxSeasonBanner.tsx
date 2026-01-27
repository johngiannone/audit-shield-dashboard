import { useState, useEffect } from 'react';
import { Calendar, ArrowRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

export const TaxSeasonBanner = () => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(true);
  const [daysUntilDeadline, setDaysUntilDeadline] = useState(0);

  useEffect(() => {
    const deadline = new Date(2025, 3, 15); // April 15, 2025
    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    setDaysUntilDeadline(Math.max(0, diffDays));
  }, []);

  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-brand-900 via-brand-800 to-brand-900 text-white py-2.5 px-4 relative">
      <div className="container mx-auto flex items-center justify-center gap-3 text-sm">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="font-semibold text-primary">{t('landing.taxSeason')}</span>
        </div>
        <span className="hidden sm:inline text-white/80">|</span>
        <span className="hidden sm:inline text-white/90">
          {t('landing.daysUntilDeadline', { days: daysUntilDeadline })}
        </span>
        <Link to="/auth" className="ml-2">
          <Button 
            size="sm" 
            variant="secondary" 
            className="h-7 px-3 text-xs font-semibold"
          >
            {t('landing.getProtected')}
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </Link>
        <button
          onClick={() => setIsVisible(false)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
          aria-label={t('common.dismiss')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
