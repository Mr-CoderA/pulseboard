<script lang="ts">
import type { Snippet } from "svelte";

type Variant = "kicker" | "display" | "lede" | "body" | "metric" | "timestamp";
type Element = "p" | "h1" | "h2" | "h3" | "span" | "div" | "time";

let {
  variant,
  as = "p",
  datetime,
  id,
  children,
}: {
  variant: Variant;
  as?: Element;
  datetime?: string;
  id?: string;
  children: Snippet;
} = $props();
</script>

<svelte:element
  this={as}
  class="type type-{variant}"
  {id}
  datetime={as === "time" ? datetime : undefined}
>
  {@render children()}
</svelte:element>
