/**
 * Canonical static route table for `@pulseboard/app`.
 * Dynamic workspace segments are prerendered from `PREVIEW_WORKSPACES`
 * via SvelteKit `entries()` — adapter-static is strict and has no SPA fallback.
 */

export const PREVIEW_WORKSPACES: readonly ["atlas"] = ["atlas"];

export type PreviewWorkspaceSlug = (typeof PREVIEW_WORKSPACES)[number];

export const APP_ROUTE_IDS = [
  "home",
  "login",
  "register",
  "workspace",
  "dashboard",
  "standup",
  "history",
  "leadSummary",
] as const;

export type AppRouteId = (typeof APP_ROUTE_IDS)[number];

export interface AppRouteRecord {
  readonly id: AppRouteId;
  readonly path: string;
  readonly source: string;
  readonly prerender: true;
}

export function workspacePath(slug: string, leaf: "dashboard" | "standup" | "history"): string {
  return `/${slug}/${leaf}`;
}

export function leadSummaryPath(slug: string): string {
  return `/${slug}/lead/summary`;
}

export function workspaceCoverPath(slug: string): string {
  return `/${slug}`;
}

export const STATIC_ROUTE_FILES: readonly AppRouteRecord[] = [
  { id: "home", path: "/", source: "src/routes/+page.svelte", prerender: true },
  {
    id: "login",
    path: "/auth/login",
    source: "src/routes/auth/login/+page.svelte",
    prerender: true,
  },
  {
    id: "register",
    path: "/auth/register",
    source: "src/routes/auth/register/+page.svelte",
    prerender: true,
  },
  {
    id: "workspace",
    path: "/[workspace]",
    source: "src/routes/[workspace]/+page.svelte",
    prerender: true,
  },
  {
    id: "dashboard",
    path: "/[workspace]/dashboard",
    source: "src/routes/[workspace]/dashboard/+page.svelte",
    prerender: true,
  },
  {
    id: "standup",
    path: "/[workspace]/standup",
    source: "src/routes/[workspace]/standup/+page.svelte",
    prerender: true,
  },
  {
    id: "history",
    path: "/[workspace]/history",
    source: "src/routes/[workspace]/history/+page.svelte",
    prerender: true,
  },
  {
    id: "leadSummary",
    path: "/[workspace]/lead/summary",
    source: "src/routes/[workspace]/lead/summary/+page.svelte",
    prerender: true,
  },
];

export function prerenderEntriesFor(slug: PreviewWorkspaceSlug): readonly string[] {
  return [
    workspaceCoverPath(slug),
    workspacePath(slug, "dashboard"),
    workspacePath(slug, "standup"),
    workspacePath(slug, "history"),
    leadSummaryPath(slug),
  ];
}

export const AUTH_PATHS: readonly string[] = ["/auth/login", "/auth/register"];

/** Cover path of the first preview workspace; login and register navigate here after a cookie session is set. */
export const POST_AUTH_PATH = workspaceCoverPath(PREVIEW_WORKSPACES[0]);

export const STATIC_PRERENDER_PATHS: readonly string[] = [
  "/",
  ...AUTH_PATHS,
  ...PREVIEW_WORKSPACES.flatMap((slug) => [...prerenderEntriesFor(slug)]),
];

export function workspaceParamEntries(): Array<{ workspace: PreviewWorkspaceSlug }> {
  return PREVIEW_WORKSPACES.map((workspace) => ({ workspace }));
}

/** SvelteKit `entries` export for `[workspace]` pages (not layouts). */
export function entries(): Array<{ workspace: PreviewWorkspaceSlug }> {
  return workspaceParamEntries();
}

export const REQUIRED_LAYOUT_FILES: readonly string[] = [
  "src/routes/+layout.svelte",
  "src/routes/+layout.ts",
  "src/routes/[workspace]/+layout.svelte",
  "src/routes/[workspace]/+layout.ts",
  "src/lib/components/Layout.svelte",
  "src/lib/components/StandupForm.svelte",
  "src/lib/components/Typography.svelte",
  "src/lib/styles/global.css",
  "src/lib/api/client.ts",
  "src/lib/api/endpoints.ts",
];
