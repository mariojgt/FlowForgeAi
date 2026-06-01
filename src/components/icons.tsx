import {
  Braces,
  FileJson,
  GitBranch,
  Globe2,
  PanelBottom,
  Play,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

const icons: Record<string, LucideIcon> = {
  Braces,
  FileJson,
  GitBranch,
  Globe2,
  PanelBottom,
  Play,
  Sparkles,
};

export function CatalogIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = icons[name] ?? Sparkles;
  return <Icon className={className} aria-hidden="true" />;
}
