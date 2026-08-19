<script lang="ts">
import type { WeeklyDigestResponse } from "@pulseboard/types";
import { onMount } from "svelte";
import { env } from "$env/dynamic/public";
import { ApiProblemError, createApiClient } from "$lib/api/client";
import Typography from "$lib/components/Typography.svelte";
import { PREVIEW_BLOCKERS, PREVIEW_DIGEST, type PreviewWorkspace } from "$lib/preview/catalog";
import {
  formatWorkspaceDate,
  formatWorkspaceTimestamp,
  utcMondayWeekStart,
} from "$lib/time/standup-window";
import { type MemberSession, resolveMemberWorkspace } from "$lib/workspace/member-session";

let { data }: { data: { workspace: PreviewWorkspace | undefined } } = $props();
const workspace = $derived(data.workspace);

let session = $state<MemberSession>({ kind: "anonymous" });
let liveDigest = $state<WeeklyDigestResponse | undefined>(undefined);
let liveWeekStart = $state<string | undefined>(undefined);
let digestMissing = $state(false);
let digestError = $state<string | undefined>(undefined);
let digestReady = $state(false);

const live = $derived(session.kind === "member");
const timezone = $derived(
  session.kind === "member" ? session.workspace.timezone : workspace?.timezone,
);
const weekStart = $derived(liveWeekStart ?? PREVIEW_DIGEST.weekStart);
const velocity = $derived(
  live ? (liveDigest?.velocityScore.toFixed(2) ?? "—") : PREVIEW_DIGEST.velocityScore.toFixed(2),
);
const openCount = $derived(
  live
    ? liveDigest === undefined
      ? "—"
      : String(liveDigest.unresolvedBlockerCount).padStart(2, "0")
    : String(PREVIEW_BLOCKERS.filter((blocker) => blocker.status !== "RESOLVED").length).padStart(
        2,
        "0",
      ),
);

onMount(() => {
  const client = createApiClient(env.PUBLIC_API_ORIGIN);
  void resolveMemberWorkspace(client).then(async (result) => {
    session = result;
    if (result.kind !== "member") {
      return;
    }
    const monday = utcMondayWeekStart(new Date());
    liveWeekStart = monday;
    try {
      liveDigest = await client.weeklyDigest(result.workspace.id, monday);
      digestMissing = false;
    } catch (cause) {
      if (cause instanceof ApiProblemError && cause.problem.status === 404) {
        digestMissing = true;
        liveDigest = undefined;
        return;
      }
      digestError = cause instanceof Error ? cause.message : "Digest could not be loaded.";
    } finally {
      digestReady = true;
    }
  });
});
</script>

<svelte:head>
  <title>Lead summary · {workspace?.name ?? "Workspace"} · Pulseboard</title>
</svelte:head>

<main id="main" class="stack">
  {#if workspace && timezone}
    <Typography variant="kicker" as="p">Weekly digest</Typography>
    <Typography variant="display" as="h1">Lead</Typography>
    <Typography variant="lede" as="p">
      Velocity and unresolved blockers for the week starting
      {formatWorkspaceDate(weekStart, timezone)}. Compiled markdown is the stored artifact the
      scheduler emits — this page does not compile it.
    </Typography>

    {#if digestError}
      <p class="alert" role="alert">{digestError}</p>
    {/if}

    {#if live && !digestReady}
      <p class="field-hint" role="status">Reading the stored digest…</p>
    {:else if live && (digestMissing || liveDigest === undefined) && digestError === undefined}
      <p class="digest-empty" role="status">
        No compiled digest for the week of {formatWorkspaceDate(weekStart, timezone)}. The store is
        empty until the scheduler writes a row.
      </p>
    {:else if !live || liveDigest}
      {@const digest = liveDigest ?? PREVIEW_DIGEST}
      <div class="split-metrics">
        <div class="stack-tight">
          <Typography variant="kicker" as="p">Velocity score</Typography>
          <p class="type type-metric">{velocity}</p>
        </div>
        <div class="stack-tight">
          <Typography variant="kicker" as="p">Unresolved blockers</Typography>
          <p class="type type-metric">{openCount}</p>
        </div>
      </div>

      <p class="type-timestamp">
        {#if live}
          Week of {formatWorkspaceDate(weekStart, timezone)}
        {:else}
          Generated {formatWorkspaceTimestamp(PREVIEW_DIGEST.generatedAt, timezone)}
        {/if}
      </p>

      <section class="stack-tight" aria-labelledby="digest-heading">
        <Typography variant="kicker" as="h2" id="digest-heading">Compiled note</Typography>
        <pre class="digest">{digest.compiledMd}</pre>
      </section>
    {/if}
  {/if}
</main>
