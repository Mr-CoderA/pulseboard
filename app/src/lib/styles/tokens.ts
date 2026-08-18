/**
 * Canonical CSS custom-property names for the Pulseboard theme pipeline.
 * Values live only in `global.css`. This module is the typed inventory
 * consumed by Tailwind mapping and static assertions — no runtime CSS-in-JS.
 */

export const COLOR_TOKENS = {
  "--pb-ink": "#111827",
  "--pb-ink-2": "#1f2937",
  "--pb-ink-3": "#374151",
  "--pb-muted": "#6b7280",
  "--pb-line": "#d1d5db",
  "--pb-line-strong": "#9ca3af",
  "--pb-hairline": "#e5e7eb",
  "--pb-surface": "#f9fafb",
  "--pb-paper": "#ffffff",
  "--pb-accent": "#2563eb",
} as const;

export const SPACE_TOKENS = {
  "--pb-space-1": "8px",
  "--pb-space-2": "16px",
  "--pb-space-3": "24px",
  "--pb-space-4": "32px",
  "--pb-space-5": "40px",
  "--pb-space-6": "48px",
  "--pb-space-8": "64px",
  "--pb-section-gap": "32px",
  "--pb-block-gap": "24px",
} as const;

export const TYPE_TOKENS = {
  "--pb-font-sans": '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif',
  "--pb-font-mono": '"IBM Plex Mono", "ui-monospace", "SFMono-Regular", monospace',
  "--pb-size-kicker": "11px",
  "--pb-size-body": "16px",
  "--pb-size-lede": "20px",
  "--pb-size-display": "40px",
  "--pb-size-metric": "56px",
} as const;

export const MOTION_TOKENS = {
  "--pb-ease": "cubic-bezier(0.4, 0, 0.2, 1)",
  "--pb-duration": "150ms",
} as const;

export const CSS_TOKEN_MAP = {
  ...COLOR_TOKENS,
  ...SPACE_TOKENS,
  ...TYPE_TOKENS,
  ...MOTION_TOKENS,
} as const;

export type CssTokenName = keyof typeof CSS_TOKEN_MAP;

export const CSS_TOKEN_NAMES: readonly CssTokenName[] = Object.keys(
  CSS_TOKEN_MAP,
) as CssTokenName[];
