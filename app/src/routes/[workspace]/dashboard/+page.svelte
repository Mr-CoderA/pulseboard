<script lang="ts">
import type { Blocker, BlockerStatus, StandupListEntry } from "@pulseboard/types";
import { BLOCKER_STATUSES } from "@pulseboard/types";
import { onMount } from "svelte";
import { env } from "$env/dynamic/public";
import { createApiClient } from "$lib/api/client";
import Typography from "$lib/components/Typography.svelte";
import { PREVIEW_BLOCKERS, PREVIEW_STANDUPS, type PreviewWorkspace } from "$lib/preview/catalog";
import { dashboardStandupRange, formatWorkspaceDate } from "$lib/time/standup-window";
import { type MemberSession, resolveMemberWorkspace } from "$lib/workspace/member-session";

let { data }: { data: { workspace: PreviewWorkspace | undefined } } = $props();
const workspace = $derived(data.workspace);

let session = $state<MemberSession>({ kind: "anonymous" });
let liveStandups = $state<StandupListEntry[] | undefined>(undefined);
let liveBlockers = $state<Blocker[] | undefined>(undefined);
let patchError = $state<string | undefined>(undefined);
let boardError = $state<string | undefined>(undefined);
let pendingId = $state<string | undefined>(undefined);

const standups = $derived(liveStandups ?? [...PREVIEW_STANDUPS]);
const blockers = $derived(liveBlockers ?? [...PREVIEW_BLOCKERS]);
const live = $derived(session.kind === "member");

function statusClass(status: BlockerStatus): string {
  return `status status-${status.toLowerCase()}`;
}

async function patchStatus(id: string, status: BlockerStatus): Promise<void> {
  if (!live) {
    return;
  }
  patchError = undefined;
  pendingId = id;
  const client = createApiClient(env.PUBLIC_API_ORIGIN);
  try {
    const result = await client.updateBlockerStatus(id, status);
    liveBlockers = (liveBlockers ?? []).map((blocker) =>
      blocker.id === id ? { ...blocker, status: result.status } : blocker,
    );
  } catch (cause) {
    patchError = cause instanceof Error ? cause.message : "Blocker status was not updated.";
  } finally {
    pendingId = undefined;
  }
}

onMount(() => {
  const client = createApiClient(env.PUBLIC_API_ORIGIN);
  void resolveMemberWorkspace(client).then(async (result) => {
    session = result;
    if (result.kind !== "member" || workspace === undefined) {
      return;
    }
    const range = dashboardStandupRange(result.workspace.timezone, new Date());
    try {
      const listed = await client.listStandups(result.workspace.id, range);
      liveStandups = listed;
      liveBlockers = listed.flatMap((entry) => entry.blockers);
    } catch (cause) {
      boardError = cause instanceof Error ? cause.message : "Dashboard could not be loaded.";
    }
  });
});
</script>

<svelte:head>
  <title>{workspace?.name ?? "Workspace"} dashboard · Pulseboard</title>
</svelte:head>

<main id="main" class="stack">
  {#if workspace}
    <Typography variant="kicker" as="p">Status overview</Typography>
    <Typography variant="display" as="h1">{workspace.name} today</Typography>
    <Typography variant="lede" as="p">
      {#if live}
        Live standups and blockers for this member’s workspace. Times are {session.kind === "member"
          ? session.workspace.timezone
          : workspace.timezone}, never the build machine’s clock.
      {:else}
        Active standups and the blockers they named. Times are {workspace.timezone}, never the build
        machine’s clock.
      {/if}
    </Typography>

    {#if boardError}
      <p class="alert" role="alert">{boardError}</p>
    {/if}

    <section class="stack-tight" aria-labelledby="standups-heading">
      <Typography variant="kicker" as="h2" id="standups-heading">Filed this stretch</Typography>
      {#if standups.length === 0}
        <p class="alert" role="status">No standups in the current window.</p>
      {:else}
        {#each standups as standup (standup.id)}
          <article class="entry">
            <time class="type-timestamp" datetime={standup.date}>
              {formatWorkspaceDate(
                standup.date,
                session.kind === "member" ? session.workspace.timezone : workspace.timezone,
              )}
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
      {/if}
    </section>

    <section class="stack-tight" aria-labelledby="blockers-heading">
      <Typography variant="kicker" as="h2" id="blockers-heading">Blocker ledger</Typography>
      {#if patchError}
        <p class="alert" role="alert">{patchError}</p>
      {/if}
      {#if blockers.length === 0}
        <p class="alert" role="status">No blockers on the ledger.</p>
      {:else}
        {#each blockers as blocker (blocker.id)}
          <article class="entry">
            {#if live}
              <div class="status-switch" role="group" aria-label="Blocker status">
                {#each BLOCKER_STATUSES as status (status)}
                  <button
                    type="button"
                    data-status={status}
                    aria-pressed={blocker.status === status}
                    disabled={pendingId === blocker.id}
                    onclick={() => void patchStatus(blocker.id, status)}
                  >
                    {status}
                  </button>
                {/each}
              </div>
            {:else}
              <p class={statusClass(blocker.status)}>{blocker.status}</p>
            {/if}
            <p class="type type-body">{blocker.description}</p>
          </article>
        {/each}
      {/if}
    </section>
  {/if}
</main>
