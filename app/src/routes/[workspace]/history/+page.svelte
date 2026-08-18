<script lang="ts">
import Typography from "$lib/components/Typography.svelte";
import { PREVIEW_STANDUPS, type PreviewWorkspace, standupsInRange } from "$lib/preview/catalog";
import { formatWorkspaceDate, formatWorkspaceTimestamp } from "$lib/time/standup-window";

let { data }: { data: { workspace: PreviewWorkspace | undefined } } = $props();
const workspace = $derived(data.workspace);

let from = $state("2026-08-12");
let to = $state("2026-08-18");

const filtered = $derived(standupsInRange(from, to, PREVIEW_STANDUPS));
</script>

<svelte:head>
  <title>History · {workspace?.name ?? "Workspace"} · Pulseboard</title>
</svelte:head>

<main id="main" class="stack">
  {#if workspace}
    <Typography variant="kicker" as="p">Chronological archive</Typography>
    <Typography variant="display" as="h1">History</Typography>
    <Typography variant="lede" as="p">
      Filter by workspace-local calendar dates. Status is inferred from whether blockers were named
      that day.
    </Typography>

    <form class="filter-bar" onsubmit={(event) => event.preventDefault()}>
      <div class="field">
        <label for="from">From</label>
        <input id="from" name="from" type="date" bind:value={from} />
      </div>
      <div class="field">
        <label for="to">To</label>
        <input id="to" name="to" type="date" bind:value={to} />
      </div>
      <p class="field-hint">{filtered.length} entries</p>
    </form>

    {#if filtered.length === 0}
      <p class="alert" role="status">No standups in that range.</p>
    {:else}
      {#each filtered as standup (standup.id)}
        <article class="entry">
          <div class="stack-tight">
            <time class="type-timestamp" datetime={standup.date}>
              {formatWorkspaceDate(standup.date, workspace.timezone)}
            </time>
            <span class="status {standup.rawBlockers.length > 0 ? 'status-open' : 'status-resolved'}">
              {standup.rawBlockers.length > 0 ? "BLOCKED" : "CLEAR"}
            </span>
          </div>
          <div class="stack-tight">
            <p class="type type-body">{standup.today}</p>
            <p class="field-hint">
              Submitted {formatWorkspaceTimestamp(standup.submittedAt, workspace.timezone)}
            </p>
          </div>
        </article>
      {/each}
    {/if}
  {/if}
</main>
