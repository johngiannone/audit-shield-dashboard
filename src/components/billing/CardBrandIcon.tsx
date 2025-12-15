interface CardBrandIconProps {
  brand: string;
  className?: string;
}

export function CardBrandIcon({ brand, className = "w-10 h-7" }: CardBrandIconProps) {
  const normalizedBrand = brand.toLowerCase();

  switch (normalizedBrand) {
    case 'visa':
      return (
        <svg viewBox="0 0 48 32" className={className} aria-label="Visa">
          <rect width="48" height="32" rx="4" fill="#1A1F71" />
          <path
            d="M19.5 21.5h-3l1.9-11.5h3l-1.9 11.5zm12.6-11.2c-.6-.2-1.5-.5-2.7-.5-3 0-5.1 1.5-5.1 3.7 0 1.6 1.5 2.5 2.6 3 1.2.6 1.6 1 1.6 1.5 0 .8-1 1.2-1.9 1.2-1.2 0-1.9-.2-2.9-.6l-.4-.2-.4 2.5c.7.3 2.1.6 3.5.6 3.2 0 5.2-1.5 5.2-3.8 0-1.3-.8-2.3-2.6-3.1-1.1-.5-1.7-.9-1.7-1.4 0-.5.6-1 1.8-1 1 0 1.8.2 2.4.5l.3.1.4-2.5zm7.9-.3h-2.3c-.7 0-1.3.2-1.6 1l-4.4 10h3.1l.6-1.7h3.8l.4 1.7H42l-2.5-10.5-.5-.5zm-3.6 6.8l1.6-4.1.9 4.1h-2.5zM17 10l-3 7.8-.3-1.5c-.5-1.8-2.2-3.7-4.1-4.7l2.7 9.9h3.2l4.7-11.5H17z"
            fill="#fff"
          />
          <path
            d="M11.3 10H6.1l-.1.3c3.8.9 6.3 3.2 7.3 5.9l-1.1-5.2c-.2-.8-.7-1-1.9-1z"
            fill="#F9A533"
          />
        </svg>
      );

    case 'mastercard':
      return (
        <svg viewBox="0 0 48 32" className={className} aria-label="Mastercard">
          <rect width="48" height="32" rx="4" fill="#000" />
          <circle cx="18" cy="16" r="9" fill="#EB001B" />
          <circle cx="30" cy="16" r="9" fill="#F79E1B" />
          <path
            d="M24 9.5c2.2 1.7 3.6 4.3 3.6 7.2s-1.4 5.5-3.6 7.2c-2.2-1.7-3.6-4.3-3.6-7.2s1.4-5.5 3.6-7.2z"
            fill="#FF5F00"
          />
        </svg>
      );

    case 'amex':
    case 'american_express':
      return (
        <svg viewBox="0 0 48 32" className={className} aria-label="American Express">
          <rect width="48" height="32" rx="4" fill="#006FCF" />
          <path
            d="M6 16.5l1.5-3.5h2l.5 1 .5-1h2l1.5 3.5h-1.5l-.3-.7h-1.5l-.3.7H8.9l-.3-.7H7l-.3.7H6zm2.8-1.3l.4-1 .4 1h-.8zm6.2 1.3v-3.5h2.5l1 1.5 1-1.5h2.5v3.5h-1.5v-2l-1.3 2h-.8l-1.3-2v2H15zm9 0v-3.5h4v1h-2.5v.5h2.5v1h-2.5v.5h2.5v.5h-4zm5.5 0l2-1.8-2-1.7h2l1 1 1-1h2l-2 1.7 2 1.8h-2l-1-1-1 1h-2z"
            fill="#fff"
          />
          <path
            d="M6 20.5l1.5-3.5h2l.5 1 .5-1h2l1.5 3.5h-1.5l-.3-.7h-1.5l-.3.7H8.9l-.3-.7H7l-.3.7H6zm2.8-1.3l.4-1 .4 1h-.8zm6.2 1.3v-3.5h2.5l1 1.5 1-1.5h2.5v3.5h-1.5v-2l-1.3 2h-.8l-1.3-2v2H15zm9 0v-3.5h4v1h-2.5v.5h2.5v1h-2.5v.5h2.5v.5h-4zm5.5 0l2-1.8-2-1.7h2l1 1 1-1h2l-2 1.7 2 1.8h-2l-1-1-1 1h-2z"
            fill="#fff"
            opacity="0"
          />
          <text x="24" y="19" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold" fontFamily="Arial">
            AMEX
          </text>
        </svg>
      );

    case 'discover':
      return (
        <svg viewBox="0 0 48 32" className={className} aria-label="Discover">
          <rect width="48" height="32" rx="4" fill="#fff" />
          <rect x="0.5" y="0.5" width="47" height="31" rx="3.5" stroke="#E5E7EB" strokeWidth="1" fill="none" />
          <path d="M0 16h48v12a4 4 0 01-4 4H4a4 4 0 01-4-4V16z" fill="#F47216" />
          <circle cx="30" cy="14" r="6" fill="#F47216" />
          <text x="12" y="14" fill="#000" fontSize="6" fontWeight="bold" fontFamily="Arial">
            DISCOVER
          </text>
        </svg>
      );

    case 'diners':
    case 'diners_club':
      return (
        <svg viewBox="0 0 48 32" className={className} aria-label="Diners Club">
          <rect width="48" height="32" rx="4" fill="#fff" />
          <rect x="0.5" y="0.5" width="47" height="31" rx="3.5" stroke="#E5E7EB" strokeWidth="1" fill="none" />
          <circle cx="24" cy="16" r="10" fill="none" stroke="#004A97" strokeWidth="2" />
          <path d="M18 10v12M30 10v12" stroke="#004A97" strokeWidth="2" />
        </svg>
      );

    case 'jcb':
      return (
        <svg viewBox="0 0 48 32" className={className} aria-label="JCB">
          <rect width="48" height="32" rx="4" fill="#fff" />
          <rect x="10" y="6" width="8" height="20" rx="2" fill="#0B4EA2" />
          <rect x="20" y="6" width="8" height="20" rx="2" fill="#E31837" />
          <rect x="30" y="6" width="8" height="20" rx="2" fill="#00A94F" />
          <text x="14" y="18" fill="#fff" fontSize="5" fontWeight="bold" fontFamily="Arial">J</text>
          <text x="24" y="18" fill="#fff" fontSize="5" fontWeight="bold" fontFamily="Arial">C</text>
          <text x="34" y="18" fill="#fff" fontSize="5" fontWeight="bold" fontFamily="Arial">B</text>
        </svg>
      );

    case 'unionpay':
      return (
        <svg viewBox="0 0 48 32" className={className} aria-label="UnionPay">
          <rect width="48" height="32" rx="4" fill="#1A3D6D" />
          <path d="M8 6h10l-3 20H5l3-20z" fill="#E31837" />
          <path d="M16 6h10l-3 20H13l3-20z" fill="#00447C" />
          <path d="M24 6h10l-3 20H21l3-20z" fill="#007B84" />
          <text x="35" y="20" fill="#fff" fontSize="5" fontFamily="Arial">银联</text>
        </svg>
      );

    default:
      // Generic card icon for unknown brands
      return (
        <svg viewBox="0 0 48 32" className={className} aria-label="Card">
          <rect width="48" height="32" rx="4" fill="#64748B" />
          <rect x="6" y="8" width="12" height="8" rx="1" fill="#94A3B8" />
          <rect x="6" y="20" width="20" height="2" rx="1" fill="#94A3B8" />
          <rect x="6" y="24" width="14" height="2" rx="1" fill="#94A3B8" />
        </svg>
      );
  }
}
