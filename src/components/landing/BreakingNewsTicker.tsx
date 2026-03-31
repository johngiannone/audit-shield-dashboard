import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function BreakingNewsTicker() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="relative bg-[#0B1120] border-b-2 border-[#D4AF37]/60 overflow-hidden"
      >
        <div className="container mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          {/* Pulse dot + label */}
          <div className="flex items-center gap-3 min-w-0">
            <span className="hidden sm:inline-flex items-center gap-1.5 shrink-0 rounded bg-red-600/90 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
              Breaking
            </span>

            <Link
              to="/blog/irs-palantir-snap-audit-tool-2025"
              className="group flex items-center gap-2 min-w-0"
            >
              <AlertTriangle className="h-4 w-4 text-[#D4AF37] shrink-0" />
              <span className="text-sm text-white/90 truncate">
                <span className="font-semibold text-[#D4AF37]">IRS partners with Palantir</span>
                <span className="hidden md:inline"> — AI-powered audit targeting is here. Are you protected?</span>
                <span className="inline md:hidden"> — AI audits are here.</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 shrink-0 text-xs font-medium text-[#D4AF37] group-hover:underline">
                Read more <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          </div>

          {/* CTA + Dismiss */}
          <div className="flex items-center gap-2 shrink-0">
            <Link to="/auth">
              <button className="hidden lg:inline-flex items-center gap-1.5 rounded-md bg-[#D4AF37] px-3 py-1 text-xs font-bold text-[#0B1120] hover:bg-[#C5A028] transition-colors active:scale-95">
                Get Protected
                <ArrowRight className="h-3 w-3" />
              </button>
            </Link>
            <button
              onClick={() => setDismissed(true)}
              className="p-1 rounded text-white/40 hover:text-white/80 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
