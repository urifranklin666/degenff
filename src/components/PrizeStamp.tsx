import type { ReactNode } from "react";

type Tone = "gold" | "fuchsia" | "cyan" | "red" | "banned";
type Rot = "r-3" | "r-6" | "r-n8" | "r-n12";

type Props = {
  children: ReactNode;
  tone?: Tone;
  rotate?: Rot;
  className?: string;
  style?: React.CSSProperties;
};

export default function PrizeStamp({
  children,
  tone = "gold",
  rotate,
  className,
  style,
}: Props) {
  const toneClass = tone === "gold" ? "" : tone;
  return (
    <span
      className={`stamp ${toneClass} ${rotate ?? ""} ${className ?? ""}`}
      style={style}
    >
      {children}
    </span>
  );
}
