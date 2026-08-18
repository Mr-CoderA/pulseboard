<script lang="ts">
import type { Snippet } from "svelte";
import { onMount } from "svelte";

const SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

let { children }: { children: Snippet } = $props();
let root: HTMLDivElement | undefined = $state();
let previous: Element | null = null;

function nodes(): HTMLElement[] {
  if (root === undefined) {
    return [];
  }
  return [...root.querySelectorAll<HTMLElement>(SELECTOR)].filter(
    (el) => el.tabIndex !== -1 && el.getClientRects().length > 0,
  );
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key !== "Tab") {
    return;
  }
  const list = nodes();
  if (list.length === 0) {
    event.preventDefault();
    return;
  }
  const first = list[0];
  const last = list[list.length - 1];
  if (first === undefined || last === undefined) {
    return;
  }
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
    return;
  }
  if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

onMount(() => {
  previous = document.activeElement;
  const list = nodes();
  const first = list[0];
  if (first !== undefined) {
    first.focus();
  }
  const element = root;
  if (element !== undefined) {
    element.addEventListener("keydown", onKeydown);
  }
  return () => {
    element?.removeEventListener("keydown", onKeydown);
    if (previous instanceof HTMLElement) {
      previous.focus();
    }
  };
});
</script>

<div class="focus-trap" bind:this={root} role="group">
  {@render children()}
</div>
