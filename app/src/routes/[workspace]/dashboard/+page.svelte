<script lang="ts">
import type { BlockerStatus } from "@pulseboard/types";
import Typography from "$lib/components/Typography.svelte";
import { PREVIEW_BLOCKERS, PREVIEW_STANDUPS, type PreviewWorkspace } from "$lib/preview/catalog";
import { formatWorkspaceDate } from "$lib/time/standup-window";

let { data }: { data: { workspace: PreviewWorkspace | undefined } } = $props();
const workspace = $derived(data.workspace);

function statusClass(status: BlockerStatus): string {
  return `status status-${status.toLowerCase()}`;
}
</script>

<svelte:head>
  <title>{workspace?.name ?? "Workspace"} dashboard · Pulseboard</title>
</svelte:head>

<main id="main" class="stack">
  {#if workspace}
    <Typography variant="kicker" as="p">Status overview</Typography>
    <Typography variant="display" as="h1">{workspace.name} today</Typography>
    <Typography variant="lede" as="p">
      Active standups and the blockers they named. Times are {workspace.timezone}, never the build
      machine’s clock.
    </Typography>

    <section class="stack-tight" aria-labelledby="standups-heading">
      <Typography variant="kicker" as="h2" id="standups-heading">Filed this stretch</Typography>
      {#each PREVIEW_STANDUPS as standup (standup.id)}
        <article class="entry">
          <time class="type-timestamp" datetime={standup.date}>
            {formatWorkspaceDate(standup.date, workspace.timezone)}
          </time>
          <div class="stack-tight">
            <p class="type type-body"><strong>Today.</strong> {standup.today}</p>
            <p class="type type-body"><strong>Yesterday.</strong> {standup.yesterday}</p>
            {#if standup.rawBlockers.length > 0}
              <p class="field-hint">{standup.rawBlockers.length} blocker named</p>
            {/if}
          </div>
        </article>
      {/each}
    </section>

    <section class="stack-tight" aria-labelledby="blockers-heading">
      <Typography variant="kicker" as="h2" id="blockers-heading">Blocker ledger</Typography>
      {#each PREVIEW_BLOCKERS as blocker (blocker.id)}
        <article class="entry">
          <p class={statusClass(blocker.status)}>{blocker.status}</p>
          <p class="type type-body">{blocker.description}</p>
        </article>
      {/each}
    </section>
  {/if}
</main>
