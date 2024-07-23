<script lang="ts">
    import NavConversationItem from "./NavConversationItem.svelte";
</script>

<div class="sticky top-0 flex flex-none items-center justify-between px-3 py-3.5 max-sm:pt-0">
	<a
		class="flex items-center rounded-xl text-lg font-semibold"
		href="#"
	>
		CommandDash
	</a>
    <a
		href="#"
		class="flex rounded-lg border bg-white px-2 py-0.5 text-center shadow-sm hover:shadow-none sm:text-smd dark:border-gray-600 dark:bg-gray-700"
	>
		Create Agent
	</a>
</div>

<div
    class="scrollbar-custom flex flex-col gap-1 overflow-y-auto rounded-r-xl from-gray-50 px-3 pb-3 pt-2 max-sm:bg-gradient-to-t md:bg-gradient-to-l dark:from-gray-800/30"
>
    <!-- <h4
        class="mb-1.5 mt-4 pl-0.5 text-sm text-gray-400 first:mt-0 dark:text-gray-500"
    >
        Today
    </h4>
    <NavConversationItem /> -->
</div>
<div
    class="mt-0.5 flex flex-col gap-1 rounded-r-xl p-3 text-sm md:bg-gradient-to-l md:from-gray-50 md:dark:from-gray-800/30"
>
    <!-- <button
        type="button"
        class="flex h-9 flex-none items-center gap-1.5 rounded-lg pl-2.5 pr-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
    >
        Theme
    </button>
    <a
        href="#"
        class="flex h-9 flex-none items-center gap-1.5 rounded-lg pl-2.5 pr-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
    >
        Assistants
        <span
            class="ml-auto rounded-full border border-gray-300 px-2 py-0.5 text-xs text-gray-500 dark:border-gray-500 dark:text-gray-400"
            >New</span
        >
    </a> -->
    <a
        href="#"
        class="flex h-9 flex-none items-center gap-1.5 rounded-lg pl-2.5 pr-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
    >
        Settings
    </a>
    <a
        href="#"
        class="flex h-9 flex-none items-center gap-1.5 rounded-lg pl-2.5 pr-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
    >
        About & Privacy
    </a>
</div>
