/**
 * cn — a tiny class-name combiner for the GER4K UI primitives.
 *
 * Deliberately dependency-free (no clsx / tailwind-merge) to keep the MVP
 * framework-light. It flattens falsy values so primitives can compose
 * conditional classes cleanly:
 *
 *   cn("px-4", isActive && "bg-violet", disabled ? "opacity-50" : null)
 *
 * It does NOT de-duplicate conflicting Tailwind utilities. Primitives order
 * their own classes so caller overrides (passed via `className`) come last and
 * therefore win under normal CSS cascade for same-specificity utilities.
 */
export type ClassValue =
  | string
  | number
  | false
  | null
  | undefined
  | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];

  for (const input of inputs) {
    if (!input) continue;

    if (Array.isArray(input)) {
      const nested = cn(...input);
      if (nested) out.push(nested);
    } else {
      out.push(String(input));
    }
  }

  return out.join(" ");
}
