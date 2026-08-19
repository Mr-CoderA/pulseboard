<script lang="ts">
import { onMount } from "svelte";
import { env } from "$env/dynamic/public";
import { createApiClient } from "$lib/api/client";
import StandupForm from "$lib/components/StandupForm.svelte";
import Typography from "$lib/components/Typography.svelte";
import { PREVIEW_NOW, type PreviewWorkspace } from "$lib/preview/catalog";
import { type MemberSession, resolveMemberWorkspace } from "$lib/workspace/member-session";

let { data }: { data: { workspace: PreviewWorkspace | undefined } } = $props();
const workspace = $derived(data.workspace);
const client = createApiClient(env.PUBLIC_API_ORIGIN);

let session = $state<MemberSession>({ kind: "anonymous" });
let filingNow = $state(PREVIEW_NOW);

const workspaceId = $derived(session.kind === "member" ? session.workspace.id : workspace?.id);
const timezone = $derived(
  session.kind === "member" ? session.workspace.timezone : workspace?.timezone,
);

onMount(() => {
  void resolveMemberWorkspace(client).then((result) => {
    session = result;
    if (result.kind === "member") {
      filingNow = new Date();
    }
  });
});
</script>

<svelte:head>
  <title>File standup · {workspace?.name ?? "Workspace"} · Pulseboard</title>
</svelte:head>

<main id="main" class="stack">
  {#if workspace && workspaceId && timezone}
    <Typography variant="kicker" as="p">Daily entry</Typography>
    <Typography variant="display" as="h1">Desk for {workspace.name}</Typography>
    <Typography variant="lede" as="p">
      Progressive disclosure on blockers: write the day first, name what is stuck only when it is
      real. Submissions validate against the shared Zod contract before they leave the browser.
    </Typography>
    <hr class="rule" />
    <StandupForm
      workspaceId={workspaceId}
      timezone={timezone}
      now={filingNow}
      fileStandup={(payload) => client.createStandup(payload).then(() => undefined)}
    />
  {/if}
</main>
