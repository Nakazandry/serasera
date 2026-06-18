export default function Logo({ className = '', showText = false, markClassName = '' }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <svg
        className={markClassName}
        width="44"
        height="44"
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Logo Sera-Sera"
      >
        <rect width="64" height="64" rx="18" fill="#67E8F9" />
        <path d="M19 23.5C19 18.8 22.8 15 27.5 15H38.5C43.2 15 47 18.8 47 23.5V40.5C47 45.2 43.2 49 38.5 49H25.5C20.8 49 17 45.2 17 40.5V36.5H24.5V39.5C24.5 41 25.6 42 27 42H38C39.4 42 40.5 41 40.5 39.5V35.8C40.5 34.4 39.4 33.4 38 33.4H27.5C22.8 33.4 19 29.6 19 24.9V23.5Z" fill="#0F172A" />
        <path d="M24.5 24.5C24.5 23.1 25.6 22 27 22H39.5V29.1H28C26.6 29.1 25.5 28 25.5 26.6V25.6C25.5 25 25.1 24.5 24.5 24.5Z" fill="#F43F5E" />
        <path d="M39.5 14.5C39.5 12.6 41 11 43 11C44.9 11 46.5 12.6 46.5 14.5C46.5 16.5 44.9 18 43 18C41 18 39.5 16.5 39.5 14.5Z" fill="#FBBF24" />
        <path d="M17 36.5H31.5C34 36.5 36.3 37.5 38 39.2L40.8 42H27C25.6 42 24.5 41 24.5 39.5V36.5H17Z" fill="#14B8A6" />
      </svg>
      {showText && (
        <span className="leading-none">
          <span className="block text-base font-black tracking-wide">Sera-Sera</span>
          <span className="block text-[10px] font-semibold uppercase text-cyan-200">Marketplace</span>
        </span>
      )}
    </span>
  );
}
