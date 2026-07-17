import { cn } from "@/lib/utils";

interface VanguardLogoProps {
  className?: string;
  showWordmark?: boolean;
  size?: number;
}

export const VanguardLogo = ({ className, showWordmark = true, size = 32 }: VanguardLogoProps) => {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect x="1" y="1" width="38" height="38" rx="9" stroke="hsl(var(--accent))" strokeWidth="1.25" opacity="0.35" />
        <path
          d="M11 27L20 12L29 27"
          stroke="hsl(var(--accent))"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16 27L20 20L24 27"
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />
        <circle cx="20" cy="32.5" r="1.25" fill="hsl(var(--accent))" />
      </svg>
      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span className="font-display font-extrabold text-[15px] tracking-[0.14em] text-sidebar-primary-foreground">
            VANGUARD
          </span>
          <span className="text-[9px] uppercase tracking-[0.28em] text-sidebar-primary/80 mt-0.5">
            ITA · IME
          </span>
        </div>
      )}
    </div>
  );
};