<script lang="ts">
	import CarbonClose from "~icons/carbon/close";
	import CarbonTextAlignJustify from "~icons/carbon/text-align-justify";

	export let isCollapsed: boolean;
	export let classNames: string;
</script>

<button
	on:click
	class="{classNames} group flex h-16 w-6 flex-col items-center justify-center -space-y-1 outline-none max-md:hidden ml-2"
>
    {#if isCollapsed}
    <CarbonTextAlignJustify color="white" height="2em" width="2em" />
    {:else}
    <CarbonClose color="white" height="2em" width="2em" />
    {/if}
</button>
