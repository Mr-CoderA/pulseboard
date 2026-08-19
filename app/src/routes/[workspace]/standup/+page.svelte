<script lang="ts">
import { env } from "$env/dynamic/public";
import { createApiClient } from "$lib/api/client";
import StandupForm from "$lib/components/StandupForm.svelte";
import Typography from "$lib/components/Typography.svelte";
import { PREVIEW_NOW, type PreviewWorkspace } from "$lib/preview/catalog";

let { data }: { data: { workspace: PreviewWorkspace | undefined } } = $props();
const workspace = $derived(data.workspace);
const client = createApiClient(env.PUBLIC_API_ORIGIN);
</script>

<svelte:head>
  <title>File standup · {workspace?.name ?? "Workspace"} · Pulseboard</title>
</svelte:head>

<main id="main" class="stack">
  {#if workspace}
    <Typography variant="kicker" as="p">Daily entry</Typography>
    <Typography variant="display" as="h1">Desk for {workspace.name}</Typography>
    <Typography variant="lede" as="p">
      Progressive disclosure on blockers: write the day first, name what is stuck only when it is
      real. Submissions validate against the shared Zod contract before they leave the browser.
    </Typography>
    <hr class="rule" />
    <StandupForm
      workspaceId={workspace.id}
      timezone={workspace.timezone}
      now={PREVIEW_NOW}
      fileStandup={(payload) => client.createStandup(payload).then(() => undefined)}
    />
  {/if}
</main>
