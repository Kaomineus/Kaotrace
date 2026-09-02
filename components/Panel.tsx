import type { ReactNode } from "react";

export default function Panel({
  title,
  badge,
  tone,
  className = "",
  children,
}: {
  title: string;
  badge?: string;
  tone?: "green" | "red" | "gold";
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`t-panel ${className}`}>
      <header className="t-head">
        <span className="t-label">■ {title}</span>
        {badge && <span className={`t-badge ${tone ?? ""}`}>{badge}</span>}
      </header>
      <div className="p-3">{children}</div>
    </section>
  );
}