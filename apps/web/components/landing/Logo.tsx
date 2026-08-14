import Link from "next/link";
import { HardHat } from "lucide-react";

interface LogoProps {
  size?: "sm" | "md";
}

export default function Logo({ size = "md" }: LogoProps) {
  const boxSize = size === "sm" ? "w-9 h-9" : "w-11 h-11";
  const iconSize = size === "sm" ? 20 : 24;
  const titleSize = size === "sm" ? "text-base" : "text-xl";

  return (
    <Link href="/" className="flex items-center gap-3 group">
      <div
        className={`${boxSize} bg-gradient-to-br from-secondary-400 to-secondary-600 rounded-xl flex items-center justify-center shadow-lg shadow-secondary-500/30 transition-transform group-hover:scale-105`}
      >
        <HardHat size={iconSize} className="text-white" />
      </div>
      <div className="leading-tight">
        <span
          className={`${titleSize} font-bold tracking-tight text-steel-900 block`}
        >
          FILAM
        </span>
        <span className="text-[11px] font-medium text-steel-400 uppercase tracking-widest">
          Tuberías PVC & Ferretería
        </span>
      </div>
    </Link>
  );
}
