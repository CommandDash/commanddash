<script lang="ts">
    import { page } from "$app/stores";

    import CarbonAdd from "~icons/carbon/add";
    import CarbonHelpFilled from "~icons/carbon/help-filled";
    import CarbonClose from "~icons/carbon/close";
    import CarbonArrowUpRight from "~icons/carbon/arrow-up-right";
    import CarbonEarthAmerica from "~icons/carbon/earth-americas-filled";
    import CarbonUserMultiple from "~icons/carbon/user-multiple";
    import CarbonSearch from "~icons/carbon/search";
    import { SortKey } from "$lib/types/MarketPlace";
</script>

<svelte:head>
    <title>CommandDash - Explore Agents</title>
    <meta property="og:title" content="CommandDash - Explore Agents" />
    <meta property="og:type" content="link" />
    <meta
        property="og:description"
        content="Browse CommandDash Explore Agents made by the community."
    />
    <meta property="og:url" content={$page.url.href} />
</svelte:head>
<div
    class="scrollbar-custom mr-1 h-screen overflow-y-auto py-12 max-sm:pt-8 md:py-24"
>
    <div class="pt-42 mx-auto flex flex-col px-5 xl:w-[60rem] 2xl:w-[64rem]">
        <div class="flex items-center">
            <h1 class="text-2xl font-bold">Marketplace</h1>
        </div>
        <h3 class="text-gray-500">Explore the agents in the marketplace made by dev community</h3>
        <div class="mt-6 flex flex-wrap gap-2 items-center">
			<div
                class="relative flex h-[30px] w-40 items-center rounded-full border px-2 has-[:focus]:border-gray-400 sm:w-64 dark:border-gray-600"
            >
                <CarbonSearch
                    class="pointer-events-none absolute left-2 text-xs text-gray-400"
                />
                <input
                    class="h-[30px] w-full bg-transparent pl-5 focus:outline-none"
                    placeholder="Filter by name"
                    maxlength="150"
                    type="search"
                />
            </div>
            <select
                class="rounded-lg border border-gray-300 bg-gray-50 px-2 py-1 text-sm text-gray-900 focus:border-blue-700 focus:ring-blue-700 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            >
                <option value={SortKey.TRENDING}>{SortKey.TRENDING}</option>
                <option value={SortKey.POPULAR}>{SortKey.POPULAR}</option>
                <option value={SortKey.NEW}>{SortKey.NEW}</option>
            </select>

			<a
				href="#"
				class="flex ml-auto items-center gap-1 whitespace-nowrap rounded-lg border bg-white py-1 pl-1.5 pr-2.5 shadow-sm hover:bg-gray-50 hover:shadow-none dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-700"
			>
				<CarbonAdd />Create quick agent
			</a>
		</div>
        <div class="mt-7 flex flex-wrap items-center gap-x-2 gap-y-3 text-sm">
            
        </div>
        <div
            class="mt-8 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4"
        >
        <button
        class="relative flex flex-col items-center justify-center overflow-hidden text-balance rounded-xl border bg-gray-50/50 px-4 py-6 text-center shadow hover:bg-gray-50 hover:shadow-inner max-sm:px-4 sm:h-64 sm:pb-4 xl:pt-8 dark:border-gray-800/70 dark:bg-gray-950/20 dark:hover:bg-gray-950/40"
        
    ></button>
        </div>
    </div>
</div>
