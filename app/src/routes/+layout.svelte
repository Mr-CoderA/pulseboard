<script lang="ts">
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import Layout from "$lib/components/Layout.svelte";
import "$lib/styles/global.css";

let { children } = $props();
</script>

<Layout>
  {@render children()}
</Layout>
