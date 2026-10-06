"use client";
import Link from "next/link";
import { UserRound, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
export { Button, Input, Textarea };
export function Action({
  href,
  children,
  secondary = false,
}: {
  href: string;
  children: React.ReactNode;
  secondary?: boolean;
}) {
  return (
    <Button asChild className={secondary ? "btn-secondary" : "btn-primary"}>
      <Link href={href}>{children}</Link>
    </Button>
  );
}
export function Card({
  children,
  className = "",
  interactive = false,
}: {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={`mark-card ${interactive ? "interactive" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={`mark-badge ${tone}`}>{children}</span>;
}
export function Avatar({
  name = "",
  image = "",
  color = "violet",
  large = false,
}: {
  name?: string;
  image?: string;
  color?: string;
  large?: boolean;
}) {
  return (
    <span className={`avatar ${color} ${large ? "large" : ""}`}>
      {image ? (
        <img loading="lazy" src={image} alt={`${name || "Your"} profile`} />
      ) : name ? (
        name
          .split(" ")
          .map((x) => x[0])
          .slice(0, 2)
          .join("")
      ) : (
        <UserRound size={large ? 30 : 20} />
      )}
    </span>
  );
}
export function Brand({ small = false }: { small?: boolean }) {
  return (
    <span className={`brand ${small ? "small" : ""}`}>
      <span className="brand-icon">
        <Sparkles size={21} />
      </span>
      {!small && (
        <span>
          Mark<span className="brand-accent">HECX</span>
        </span>
      )}
    </span>
  );
}
export function PageTitle({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children && <div className="title-actions">{children}</div>}
    </div>
  );
}
export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <Empty className="empty-state">
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {children}
    </Empty>
  );
}
export function Choice({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (s: string) => void;
  options: string[];
  label: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="choice">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((x) => (
          <SelectItem value={x} key={x}>
            {x}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
