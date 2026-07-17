import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import mark from "@/assets/vanguard-mark.png.asset.json";

interface VanguardLogoProps {
  className?: string;
  showWordmark?: boolean;
  size?: number;
  animated?: boolean;
}

export const VanguardLogo = ({
  className,
  showWordmark = true,
  size = 36,
  animated = true,
}: VanguardLogoProps) => {
  const MotionWrap = animated ? motion.div : "div";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <MotionWrap
        {...(animated
          ? {
              initial: { opacity: 0, scale: 0.85, rotate: -6 },
              animate: { opacity: 1, scale: 1, rotate: 0 },
              transition: { type: "spring", stiffness: 220, damping: 18 },
              whileHover: { scale: 1.06, rotate: 2 },
            }
          : {})}
        className="relative shrink-0"
        style={{ width: size, height: size }}
      >
        <div className="absolute inset-0 rounded-[10px] bg-accent/20 blur-md opacity-70" />
        <img
          src={mark.url}
          alt="VANGUARD"
          width={size}
          height={size}
          className="relative h-full w-full rounded-[10px] object-cover shadow-gold"
          loading="eager"
          decoding="async"
        />
      </MotionWrap>
      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span className="font-display font-extrabold text-[17px] tracking-[0.16em] text-sidebar-primary-foreground">
            VANGUARD
          </span>
          <span className="text-[9px] uppercase tracking-[0.24em] text-accent/80 mt-1">
            À frente da aprovação
          </span>
        </div>
      )}
    </div>
  );
};