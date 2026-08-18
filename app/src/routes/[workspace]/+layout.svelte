<script lang="ts">
import type { Snippet } from "svelte";
import { page } from "$app/state";
import Typography from "$lib/components/Typography.svelte";
import { PREVIEW_NOW, type PreviewWorkspace } from "$lib/preview/catalog";
import { leadSummaryPath, workspaceCoverPath, workspacePath } from "$lib/routes/manifest";
import { windowCopy, workspaceClock } from "$lib/time/standup-window";

let { children, data }: { children: Snippet; data: { workspace: PreviewWorkspace | undefined } } =
  $props();

const workspace = $derived(data.workspace);
const slug = $derived(page.params.workspace ?? "");
const path = $derived(page.url.pathname);
const clock = $derived(
  workspace === undefined ? undefined : workspaceClock(workspace.timezone, PREVIEW_NOW),
);

function current(href: string): "page" | undefined {
  return path === href || path === `${href}/` ? "page" : undefined;
}
</script>

{#if workspace === undefined || clock === undefined}
  <main id="main" class="page">
    <aside class="rail"><p class="rail-index">404</p></aside>
    <article class="canvas">
      <Typography variant="display" as="h1">No such floor.</Typography>
    </article>
  </main>
{:else}
  <div class="page">
    <aside class="rail">
      <p class="rail-index">{workspace.slug}</p>
      <Typography variant="kicker" as="p">{workspace.timezone}</Typography>
      <p class="type-timestamp">{clock.isoDate} · {clock.clockLabel}</p>
      <p class="window-flag" data-open={String(clock.windowOpen)}>{windowCopy(clock)}</p>
      <nav class="workspace-nav" aria-label="Workspace">
        <a href={workspaceCoverPath(slug)} aria-current={current(workspaceCoverPath(slug))}>Floor</a>
        <a href={workspacePath(slug, "dashboard")} aria-current={current(workspacePath(slug, "dashboard"))}>
          Dashboard
        </a>
        <a href={workspacePath(slug, "standup")} aria-current={current(workspacePath(slug, "standup"))}>
          Standup
        </a>
        <a href={workspacePath(slug, "history")} aria-current={current(workspacePath(slug, "history"))}>
          History
        </a>
        <a href={leadSummaryPath(slug)} aria-current={current(leadSummaryPath(slug))}>Lead</a>
      </nav>
    </aside>
    <div class="canvas">
      {@render children()}
    </div>
  </div>
{/if}
