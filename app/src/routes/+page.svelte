<script lang="ts">
import { API_PREFIX, staticAppContract } from "$lib/contract";

const contract = staticAppContract();
</script>

<main>
  <h1>Pulseboard</h1>
  <p>Workspace scaffold. Shared API prefix: {API_PREFIX}</p>
  <p>Required env names: {contract.env.join(", ")}</p>
</main>
