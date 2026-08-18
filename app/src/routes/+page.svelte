<script lang="ts">
import Typography from "$lib/components/Typography.svelte";
import { ATLAS_WORKSPACE } from "$lib/preview/catalog";
import { leadSummaryPath, workspacePath } from "$lib/routes/manifest";
</script>

<svelte:head>
  <title>Pulseboard — the 09:00 that actually happens</title>
  <meta
    name="description"
    content="Zone-aware standup tracking. Workspace-local calendars, a static edge UI, and a strict HTTPS contract."
  />
</svelte:head>

<main id="main" class="page">
  <aside class="rail">
    <p class="rail-index">Index / 00</p>
    <Typography variant="kicker">Issue 01 · phase 1</Typography>
  </aside>

  <article class="canvas stack">
    <Typography variant="kicker" as="p">Standups, on the workspace clock</Typography>
    <Typography variant="display" as="h1">The 09:00 that actually happens.</Typography>
    <Typography variant="lede" as="p">
      Pulseboard files yesterday, today, and the thing that is stuck against a workspace-local
      calendar — not against UTC. The UI is a static SvelteKit build. The API is a lean Node 20
      binary. They share Zod contracts and nothing else.
    </Typography>

    <hr class="rule" />

    <ol class="home-index">
      <li>
        <span class="home-index-num">01</span>
        <div class="stack-tight">
          <Typography variant="kicker" as="h2">Credentials</Typography>
          <p class="type type-body">
            <a href="/auth/register">Register</a>
            or
            <a href="/auth/login">sign in</a>.
            Every authenticated caller is a member. No OAuth, no roles.
          </p>
        </div>
      </li>
      <li>
        <span class="home-index-num">02</span>
        <div class="stack-tight">
          <Typography variant="kicker" as="h2">{ATLAS_WORKSPACE.name} floor</Typography>
          <p class="type type-body">
            Walk the prerendered
            <a href={workspacePath(ATLAS_WORKSPACE.slug, "dashboard")}>dashboard</a>,
            <a href={workspacePath(ATLAS_WORKSPACE.slug, "standup")}>standup desk</a>,
            <a href={workspacePath(ATLAS_WORKSPACE.slug, "history")}>history</a>,
            and
            <a href={leadSummaryPath(ATLAS_WORKSPACE.slug)}>lead summary</a>
            — Atlas is America/New_York.
          </p>
        </div>
      </li>
      <li>
        <span class="home-index-num">03</span>
        <div class="stack-tight">
          <Typography variant="kicker" as="h2">Contract</Typography>
          <p class="type type-body">
            HTTPS only, prefix <code class="type-timestamp">/api/v1</code>. Payloads fail at the
            boundary. The edge does not invent a local API origin.
          </p>
        </div>
      </li>
    </ol>
  </article>
</main>
