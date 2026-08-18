<script lang="ts">
import Typography from "$lib/components/Typography.svelte";
import { PREVIEW_BLOCKERS, PREVIEW_DIGEST, type PreviewWorkspace } from "$lib/preview/catalog";
import { formatWorkspaceDate, formatWorkspaceTimestamp } from "$lib/time/standup-window";

let { data }: { data: { workspace: PreviewWorkspace | undefined } } = $props();
const workspace = $derived(data.workspace);
const openCount = PREVIEW_BLOCKERS.filter((blocker) => blocker.status !== "RESOLVED").length;
const velocity = PREVIEW_DIGEST.velocityScore.toFixed(2);
</script>

<svelte:head>
  <title>Lead summary · {workspace?.name ?? "Workspace"} · Pulseboard</title>
</svelte:head>

<main id="main" class="stack">
  {#if workspace}
    <Typography variant="kicker" as="p">Weekly digest</Typography>
    <Typography variant="display" as="h1">Lead</Typography>
    <Typography variant="lede" as="p">
      Velocity and unresolved blockers for the week starting
      {formatWorkspaceDate(PREVIEW_DIGEST.weekStart, workspace.timezone)}. Compiled markdown is the
      artifact the scheduler would emit — this page does not call it.
    </Typography>

    <div class="split-metrics">
      <div class="stack-tight">
        <Typography variant="kicker" as="p">Velocity score</Typography>
        <p class="type type-metric">{velocity}</p>
      </div>
      <div class="stack-tight">
        <Typography variant="kicker" as="p">Unresolved blockers</Typography>
        <p class="type type-metric">{String(openCount).padStart(2, "0")}</p>
      </div>
    </div>

    <p class="type-timestamp">
      Generated {formatWorkspaceTimestamp(PREVIEW_DIGEST.generatedAt, workspace.timezone)}
    </p>

    <section class="stack-tight" aria-labelledby="digest-heading">
      <Typography variant="kicker" as="h2" id="digest-heading">Compiled note</Typography>
      <pre class="digest">{PREVIEW_DIGEST.compiledMd}</pre>
    </section>
  {/if}
</main>
