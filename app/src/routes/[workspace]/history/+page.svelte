<script lang="ts">
import type { Standup } from "@pulseboard/types";
import { onMount } from "svelte";
import { env } from "$env/dynamic/public";
import { createApiClient } from "$lib/api/client";
import Typography from "$lib/components/Typography.svelte";
import { PREVIEW_STANDUPS, type PreviewWorkspace, standupsInRange } from "$lib/preview/catalog";
import {
  formatWorkspaceDate,
  formatWorkspaceTimestamp,
  shiftIsoDate,
  standupDateRange,
  workspaceLocalToday,
} from "$lib/time/standup-window";
import { type MemberSession, resolveMemberWorkspace } from "$lib/workspace/member-session";

let { data }: { data: { workspace: PreviewWorkspace | undefined } } = $props();
const workspace = $derived(data.workspace);

let from = $state("2026-08-12");
let to = $state("2026-08-18");
let session = $state<MemberSession>({ kind: "anonymous" });
let liveRows = $state<Standup[] | undefined>(undefined);
let historyError = $state<string | undefined>(undefined);
let mounted = $state(false);

const timezone = $derived(
  session.kind === "member" ? session.workspace.timezone : workspace?.timezone,
);
const filtered = $derived(
  liveRows !== undefined ? liveRows : standupsInRange(from, to, PREVIEW_STANDUPS),
);

async function loadLive(memberId: string): Promise<void> {
  if (from > to) {
    liveRows = [];
    return;
  }
  historyError = undefined;
  const client = createApiClient(env.PUBLIC_API_ORIGIN);
  try {
    liveRows = await client.listStandups(memberId, standupDateRange(from, to));
  } catch (cause) {
    historyError = cause instanceof Error ? cause.message : "History could not be loaded.";
    liveRows = [];
  }
}

onMount(() => {
  mounted = true;
  const client = createApiClient(env.PUBLIC_API_ORIGIN);
  void resolveMemberWorkspace(client).then((result) => {
    session = result;
    if (result.kind === "member") {
      const today = workspaceLocalToday(result.workspace.timezone, new Date());
      from = shiftIsoDate(today, -14);
      to = today;
    }
  });
});

$effect(() => {
  if (!mounted || session.kind !== "member") {
    return;
  }
  void loadLive(session.workspace.id);
});
</script>

<svelte:head>
  <title>History · {workspace?.name ?? "Workspace"} · Pulseboard</title>
</svelte:head>

<main id="main" class="stack">
  {#if workspace && timezone}
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

    {#if historyError}
      <p class="alert" role="alert">{historyError}</p>
    {/if}

    {#if filtered.length === 0}
      <p class="alert" role="status">No standups in that range.</p>
    {:else}
      {#each filtered as standup (standup.id)}
        <article class="entry">
          <div class="stack-tight">
            <time class="type-timestamp" datetime={standup.date}>
              {formatWorkspaceDate(standup.date, timezone)}
            </time>
            <span class="status {standup.rawBlockers.length > 0 ? 'status-open' : 'status-resolved'}">
              {standup.rawBlockers.length > 0 ? "BLOCKED" : "CLEAR"}
            </span>
          </div>
          <div class="stack-tight">
            <p class="type type-body">{standup.today}</p>
            <p class="field-hint">
              Submitted {formatWorkspaceTimestamp(standup.submittedAt, timezone)}
            </p>
          </div>
        </article>
      {/each}
    {/if}
  {/if}
</main>
