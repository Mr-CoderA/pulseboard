<script lang="ts">
import type { CreateStandupRequest, RawBlocker } from "@pulseboard/types";
import { createStandupRequestSchema } from "@pulseboard/types";
import { windowCopy, workspaceClock } from "$lib/time/standup-window";

let {
  workspaceId,
  timezone,
  now,
  fileStandup,
}: {
  workspaceId: string;
  timezone: string;
  now: Date;
  fileStandup: (payload: CreateStandupRequest) => Promise<void>;
} = $props();

let yesterday = $state("");
let today = $state("");
let blockersOpen = $state(false);
let blockerDrafts = $state<string[]>([""]);
let error = $state<string | undefined>(undefined);
let notice = $state<string | undefined>(undefined);
let pending = $state(false);

const clock = $derived(workspaceClock(timezone, now));

function blockers(): RawBlocker[] {
  return blockerDrafts
    .map((description) => description.trim())
    .filter((description) => description.length > 0)
    .map((description) => ({ description }));
}

function addBlocker(): void {
  blockersOpen = true;
  blockerDrafts = [...blockerDrafts, ""];
}

function removeBlocker(index: number): void {
  blockerDrafts = blockerDrafts.filter((_, i) => i !== index);
  if (blockerDrafts.length === 0) {
    blockerDrafts = [""];
  }
}

async function handleSubmit(event: Event): Promise<void> {
  event.preventDefault();
  error = undefined;
  notice = undefined;
  const parsed = createStandupRequestSchema.safeParse({
    workspaceId,
    yesterday: yesterday.trim(),
    today: today.trim(),
    rawBlockers: blockers(),
  });
  if (!parsed.success) {
    error = parsed.error.issues[0]?.message ?? "Check the standup fields.";
    return;
  }
  pending = true;
  try {
    await fileStandup(parsed.data);
    notice = "Filed against the workspace-local calendar day.";
    yesterday = "";
    today = "";
    blockerDrafts = [""];
    blockersOpen = false;
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "Standup was not accepted.";
  } finally {
    pending = false;
  }
}
</script>

<form class="stack" onsubmit={handleSubmit} aria-describedby="standup-window">
  <p id="standup-window" class="window-flag" data-open={String(clock.windowOpen)}>
    {clock.isoDate} · {clock.clockLabel} · {windowCopy(clock)}
  </p>

  <div class="field">
    <label for="yesterday">Yesterday</label>
    <textarea
      id="yesterday"
      name="yesterday"
      rows="5"
      required
      maxlength="8000"
      bind:value={yesterday}
    ></textarea>
    <span class="field-hint">What moved. Keep it a log, not a novel.</span>
  </div>

  <div class="field">
    <label for="today">Today</label>
    <textarea id="today" name="today" rows="5" required maxlength="8000" bind:value={today}></textarea>
    <span class="field-hint">What you will finish before the window closes tomorrow.</span>
  </div>

  <div class="disclosure">
    <button
      class="disclosure-toggle"
      type="button"
      aria-expanded={blockersOpen}
      aria-controls="blocker-panel"
      onclick={() => {
        blockersOpen = !blockersOpen;
      }}
    >
      <span>{blockersOpen ? "–" : "+"}</span>
      Blockers
      <span class="field-hint">{blockers().length} named</span>
    </button>

    {#if blockersOpen}
      <div id="blocker-panel" class="stack-tight" style="margin-top: var(--pb-space-3)">
        <ul class="blocker-list">
          {#each blockerDrafts as draft, index (index)}
            <li class="blocker-row">
              <div class="field">
                <label for={`blocker-${String(index)}`}>Stuck item {String(index + 1).padStart(2, "0")}</label>
                <input
                  id={`blocker-${String(index)}`}
                  type="text"
                  maxlength="2000"
                  value={draft}
                  oninput={(event) => {
                    const next = [...blockerDrafts];
                    next[index] = event.currentTarget.value;
                    blockerDrafts = next;
                  }}
                />
              </div>
              <button class="remove-btn" type="button" onclick={() => removeBlocker(index)}>
                Remove
              </button>
            </li>
          {/each}
        </ul>
        <button class="btn btn-quiet" type="button" onclick={addBlocker}>Add another</button>
      </div>
    {/if}
  </div>

  {#if error}
    <p class="alert" role="alert">{error}</p>
  {/if}
  {#if notice}
    <p class="alert" data-kind="ok" role="status">{notice}</p>
  {/if}

  <div class="actions">
    <button class="btn" type="submit" disabled={pending}>
      {pending ? "Filing…" : "File standup"}
    </button>
  </div>
</form>
