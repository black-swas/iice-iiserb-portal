import {
  Building2,
  Dna,
  FlaskConical,
  GraduationCap,
  Handshake,
  Landmark,
  Lightbulb,
  Network,
  Rocket,
  Scale,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * The icons content may name (`icon` fields in ecosystem tiles and path cards). They are imported one by one so the
 * bundle carries only these. validate-content checks a name is a real Lucide icon; tests/unit/icons.test.ts checks every
 * name used in content is registered here, so adding an icon to content means adding it below.
 */
export const ICONS: Record<string, LucideIcon> = {
  "building-2": Building2,
  dna: Dna,
  "flask-conical": FlaskConical,
  "graduation-cap": GraduationCap,
  handshake: Handshake,
  landmark: Landmark,
  lightbulb: Lightbulb,
  network: Network,
  rocket: Rocket,
  scale: Scale,
  users: Users,
};

/** A decorative content icon. It is hidden from assistive technology: the text beside it carries the meaning. */
export function Icon({ name, className }: { name: string; className?: string }) {
  const Component = ICONS[name];
  if (!Component) throw new Error(`Icon "${name}" is not registered in src/components/ui/Icon.tsx`);
  return <Component aria-hidden="true" {...(className ? { className } : {})} />;
}
