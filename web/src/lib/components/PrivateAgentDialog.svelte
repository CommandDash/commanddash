<script lang="ts">
  import { fade, fly } from "svelte/transition";

  export let showPrivateModal: boolean = false;
</script>

{#if showPrivateModal}
  <div
    class="fixed inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-sm dark:bg-black/50"
    in:fade
  >
    <dialog
      in:fly={{ y: 100 }}
      open
      class="h-[95dvh] w-[90dvw] overflow-hidden rounded-2xl border-gray-800/70 bg-gray-900 shadow-2xl outline-none sm:h-[85dvh] xl:w-[1200px] 2xl:h-[75dvh]"
    >

    </dialog>
  </div>
{/if}
