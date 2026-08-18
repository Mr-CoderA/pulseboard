<script lang="ts">
import type { Snippet } from "svelte";
import { page } from "$app/state";
import { AUTH_PATHS, PREVIEW_WORKSPACES } from "$lib/routes/manifest";

let { children }: { children: Snippet } = $props();

const previewSlug = PREVIEW_WORKSPACES[0];
</script>

<a class="skip-link" href="#main">Skip to content</a>

<div class="shell">
  <header class="masthead">
    <a class="wordmark" href="/">Pulseboard</a>
    <p class="mast-meta">Member · zone-aware standups</p>
    <nav class="mast-nav" aria-label="Primary">
      <a href="/auth/login" aria-current={page.url.pathname === AUTH_PATHS[0] ? "page" : undefined}>
        Sign in
      </a>
      <a href="/auth/register" aria-current={page.url.pathname === AUTH_PATHS[1] ? "page" : undefined}>
        Register
      </a>
      <a
        href="/{previewSlug}/dashboard"
        aria-current={page.url.pathname.startsWith(`/${previewSlug}`) ? "page" : undefined}
      >
        {previewSlug} floor
      </a>
    </nav>
  </header>

  {@render children()}

  <footer class="colophon">
    <span>Pulseboard</span>
    <span>Static edge · Cloudflare Pages</span>
  </footer>
</div>
