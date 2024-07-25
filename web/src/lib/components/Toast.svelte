<script lang="ts">
	import { fade } from "svelte/transition";
	import { ToastType } from "$lib/types/Toast";

	import IconDazzled from "$lib/components/icons/IconDazzled.svelte";

	import CarbonError from "~icons/carbon/error";
	import CarbonInformation from "~icons/carbon/information-filled";
	import CarbonCheck from "~icons/carbon/checkmark-filled";

	export let message: string | null = "";
	export let toastType: ToastType | null = ToastType.INFO;

</script>

<div
	transition:fade|global={{ duration: 300 }}
	class="pointer-events-none fixed right-0 top-12 z-20 bg-gradient-to-bl from-red-500/20 via-red-500/0 to-red-500/0 pb-36 pl-36 pr-2 pt-2 md:top-0 md:pr-8 md:pt-5"
>
	<div
		class="pointer-events-auto flex items-center rounded-full bg-white/90 px-3 py-1 shadow-sm dark:bg-gray-900/80"
	>
		{#if ToastType.SUCCESS === toastType}
		<CarbonCheck color="green" height="1.5em" width="1.5em" class="mx-2" />
		{:else if ToastType.INFO === toastType}
		<CarbonInformation color="#f5b70c" height="1.5em" width="1.5em" class="mx-2" />
		{:else if ToastType.ERROR === toastType}
		<CarbonError color="red" height="1.5em" width="1.5em" class="mx-2" />
		{/if}
		<h2 class="font-semibold mx-2">{message}</h2>
	</div>
</div>
