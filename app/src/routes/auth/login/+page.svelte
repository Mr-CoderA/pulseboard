<script lang="ts">
import { ENV_NAMES } from "@pulseboard/types";
import { env } from "$env/dynamic/public";
import { createApiClient } from "$lib/api/client";
import FocusTrap from "$lib/components/FocusTrap.svelte";
import Typography from "$lib/components/Typography.svelte";

const client = createApiClient(env[ENV_NAMES.PUBLIC_API_ORIGIN]);

let email = $state("");
let password = $state("");
let error = $state<string | undefined>(undefined);
let notice = $state<string | undefined>(undefined);
let pending = $state(false);

async function onsubmit(event: Event): Promise<void> {
  event.preventDefault();
  error = undefined;
  notice = undefined;
  pending = true;
  try {
    await client.login({ email: email.trim(), password });
    notice = "Session accepted. Continue to a workspace floor.";
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "Sign-in was rejected.";
  } finally {
    pending = false;
  }
}
</script>

<svelte:head>
  <title>Sign in · Pulseboard</title>
</svelte:head>

<main id="main" class="page">
  <aside class="rail">
    <p class="rail-index">Auth / 01</p>
    <Typography variant="kicker">Member credentials</Typography>
  </aside>

  <div class="canvas auth-frame">
    <FocusTrap>
      <form class="stack" onsubmit={onsubmit}>
        <Typography variant="display" as="h1">Sign in</Typography>
        <Typography variant="lede" as="p">
          Short-lived session. HTTP-only cookie, SameSite=Lax. Tab cycles the fields; Enter files
          the request.
        </Typography>

        <div class="field">
          <label for="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autocomplete="username"
            required
            maxlength="320"
            bind:value={email}
          />
        </div>

        <div class="field">
          <label for="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autocomplete="current-password"
            required
            minlength="8"
            maxlength="128"
            bind:value={password}
          />
        </div>

        {#if error}
          <p class="alert" role="alert">{error}</p>
        {/if}
        {#if notice}
          <p class="alert" data-kind="ok" role="status">{notice}</p>
        {/if}

        <div class="actions">
          <button class="btn" type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
          <a href="/auth/register">Need an account</a>
        </div>
      </form>
    </FocusTrap>
  </div>
</main>
