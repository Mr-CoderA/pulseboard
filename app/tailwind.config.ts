/**
 * Tailwind theme mapping for the CSS variable pipeline.
 * Utilities are not emitted in this milestone; the file exists so the
 * token names stay aligned with `global.css` and `tokens.ts`.
 */
const colors = {
  ink: "var(--pb-ink)",
  "ink-2": "var(--pb-ink-2)",
  "ink-3": "var(--pb-ink-3)",
  muted: "var(--pb-muted)",
  line: "var(--pb-line)",
  "line-strong": "var(--pb-line-strong)",
  hairline: "var(--pb-hairline)",
  surface: "var(--pb-surface)",
  paper: "var(--pb-paper)",
  accent: "var(--pb-accent)",
} as const;

const spacing = {
  1: "var(--pb-space-1)",
  2: "var(--pb-space-2)",
  3: "var(--pb-space-3)",
  4: "var(--pb-space-4)",
  5: "var(--pb-space-5)",
  6: "var(--pb-space-6)",
  8: "var(--pb-space-8)",
  section: "var(--pb-section-gap)",
  block: "var(--pb-block-gap)",
} as const;

const fontFamily = {
  sans: "var(--pb-font-sans)",
  mono: "var(--pb-font-mono)",
} as const;

const transitionTimingFunction = {
  intent: "var(--pb-ease)",
} as const;

const transitionDuration = {
  intent: "var(--pb-duration)",
} as const;

const config = {
  content: ["./src/**/*.{html,js,svelte,ts}"],
  theme: {
    extend: {
      colors,
      spacing,
      fontFamily,
      transitionTimingFunction,
      transitionDuration,
    },
  },
};

export default config;
export { colors, fontFamily, spacing, transitionDuration, transitionTimingFunction };
