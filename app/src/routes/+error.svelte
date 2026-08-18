<script lang="ts">
import Typography from "$lib/components/Typography.svelte";

let { error }: { error: { message: string; status?: number } } = $props();
</script>

<svelte:head>
  <title>Unavailable · Pulseboard</title>
</svelte:head>

<main id="main" class="page">
  <aside class="rail">
    <p class="rail-index">{error.status ?? "—"}</p>
  </aside>
  <article class="canvas stack">
    <Typography variant="kicker" as="p">Not filed</Typography>
    <Typography variant="display" as="h1">{error.message}</Typography>
    <p class="type type-body"><a href="/">Return to the index</a></p>
  </article>
</main>
