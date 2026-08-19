<script lang="ts">
import { PUBLIC_API_ORIGIN } from "$env/static/public";
import { createApiClient } from "$lib/api/client";
import FocusTrap from "$lib/components/FocusTrap.svelte";
import Typography from "$lib/components/Typography.svelte";

const client = createApiClient(PUBLIC_API_ORIGIN);

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
    await client.register({ email: email.trim(), password });
    notice = "Member created. Sign in when you are ready to file.";
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "Registration was rejected.";
  } finally {
    pending = false;
  }
}
</script>

<svelte:head>
  <title>Register · Pulseboard</title>
</svelte:head>

<main id="main" class="page">
  <aside class="rail">
    <p class="rail-index">Auth / 02</p>
    <Typography variant="kicker">Create a member</Typography>
  </aside>

  <div class="canvas auth-frame">
    <FocusTrap>
      <form class="stack" onsubmit={onsubmit}>
        <Typography variant="display" as="h1">Register</Typography>
        <Typography variant="lede" as="p">
          Email and a password of eight characters or more. The API issues a token; this page never
          invents one.
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
            autocomplete="new-password"
            required
            minlength="8"
            maxlength="128"
            bind:value={password}
          />
          <span class="field-hint">Eight to 128 characters. Stored as a hash, never echoed.</span>
        </div>

        {#if error}
          <p class="alert" role="alert">{error}</p>
        {/if}
        {#if notice}
          <p class="alert" data-kind="ok" role="status">{notice}</p>
        {/if}

        <div class="actions">
          <button class="btn" type="submit" disabled={pending}>
            {pending ? "Creating…" : "Create member"}
          </button>
          <a href="/auth/login">Already registered</a>
        </div>
      </form>
    </FocusTrap>
  </div>
</main>
