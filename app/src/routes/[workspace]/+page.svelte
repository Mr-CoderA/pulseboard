<script lang="ts">
import Typography from "$lib/components/Typography.svelte";
import { ATLAS_WORKSPACE } from "$lib/preview/catalog";
import { leadSummaryPath, workspacePath } from "$lib/routes/manifest";

let { data }: { data: { workspace: typeof ATLAS_WORKSPACE | undefined } } = $props();
const workspace = $derived(data.workspace);
</script>

<svelte:head>
  <title>{workspace?.name ?? "Workspace"} · Pulseboard</title>
</svelte:head>

<main id="main" class="stack">
  {#if workspace}
    <Typography variant="kicker" as="p">Workspace cover</Typography>
    <Typography variant="display" as="h1">{workspace.name}</Typography>
    <Typography variant="lede" as="p">
      Four desks, one timezone. Atlas keeps the standup window on {workspace.timezone} so Tuesday
      morning in New York is never Monday night in UTC.
    </Typography>
    <hr class="rule" />
    <ol class="home-index">
      <li>
        <span class="home-index-num">01</span>
        <p class="type type-body">
          <a href={workspacePath(workspace.slug, "dashboard")}>Dashboard</a>
          — who filed, what is still open.
        </p>
      </li>
      <li>
        <span class="home-index-num">02</span>
        <p class="type type-body">
          <a href={workspacePath(workspace.slug, "standup")}>Standup</a>
          — yesterday, today, blockers on disclosure.
        </p>
      </li>
      <li>
        <span class="home-index-num">03</span>
        <p class="type type-body">
          <a href={workspacePath(workspace.slug, "history")}>History</a>
          — chronological archive, filtered by date range.
        </p>
      </li>
      <li>
        <span class="home-index-num">04</span>
        <p class="type type-body">
          <a href={leadSummaryPath(workspace.slug)}>Lead summary</a>
          — weekly velocity and unresolved blockers.
        </p>
      </li>
    </ol>
  {/if}
</main>
