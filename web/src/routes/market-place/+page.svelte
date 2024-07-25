<script lang="ts">
    import { onMount } from "svelte";
    import { page } from "$app/stores";

    import CarbonSearch from "~icons/carbon/search";
    import type { Agent } from "$lib/types/Agent";
    import { goto } from "$app/navigation";
    import { debounce } from "$lib/utils/debounce";

    const SEARCH_DEBOUNCE_DELAY = 400;
    let agents: Agent[] = [];
    let filteredAgents: Agent[] = [];
    let searchValue: string = "";

    onMount(async () => {
        const response = await fetch(
            "https://api.commanddash.dev/agent/web/get-agent-list",
            {
                headers: {
                    "Content-Type": "application/json",
                },
                method: "POST",
                body: JSON.stringify({ cli_version: "0.0.1" }),
            },
        );

        const _response = await response.json();
        if (!response.ok) {
        }
        agents = _response;
        filteredAgents = _response;
    });

    const navigateAgents = (agent: Agent) => {
        goto(`/agent/${agent.name}`);
    };

    const search = debounce(async (value: string) => {
        searchValue = value.toLowerCase();
        filteredAgents = agents.filter((agent) => {
            return (
                agent.metadata.display_name
                    .toLowerCase()
                    .includes(searchValue) ||
                agent.author.name.toLowerCase().includes(searchValue)
            );
        });
    }, SEARCH_DEBOUNCE_DELAY);
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
        <h3 class="text-gray-500">
            Explore the agents in the marketplace made by dev community
        </h3>
        <div class="mt-6 flex flex-wrap gap-2 items-center">
            <div
                class="relative flex h-[50px] min-w-full items-center rounded-full border px-2 has-[:focus]:border-gray-400 sm:w-64 dark:border-gray-600"
            >
                <CarbonSearch
                    height="1.5em"
                    width="1.5em"
                    class="pointer-events-none absolute left-2 text-xs text-gray-400"
                />
                <input
                    class="h-[50px] w-full bg-transparent pl-7 focus:outline-none"
                    placeholder="Search agents in the marketplace"
                    maxlength="150"
                    type="search"
                    value={searchValue}
                    on:input={(e) => search(e.currentTarget.value)}
                />
            </div>
            <!-- <select
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
			</a> -->
        </div>
        <div
            class="mt-7 flex flex-wrap items-center gap-x-2 gap-y-3 text-sm"
        ></div>
        <div
            class="mt-8 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4"
        >
            {#each filteredAgents as agent}
                <button
                    class="relative flex flex-col items-center justify-center overflow-hidden text-balance rounded-xl border bg-gray-50/50 px-4 py-6 text-center shadow hover:bg-gray-50 hover:shadow-inner max-sm:px-4 sm:h-64 sm:pb-4 xl:pt-8 dark:border-gray-800/70 dark:bg-gray-950/20 dark:hover:bg-gray-950/40"
                    on:click={() => navigateAgents(agent)}
                >
                    <img
                        src={agent.metadata.avatar_id}
                        alt="Avatar"
                        class="mb-2 aspect-square size-12 flex-none rounded-full object-cover sm:mb-6 sm:size-20"
                    />
                    <h3
                        class="mb-2 line-clamp-2 max-w-full break-words text-center text-[.8rem] font-semibold leading-snug sm:text-sm"
                    >
                        {agent.metadata.display_name}
                    </h3>
                    <p
                        class="line-clamp-4 text-xs text-gray-700 sm:line-clamp-2 dark:text-gray-400"
                    >
                        {agent.metadata.description}
                    </p>
                    <p
                        class="mt-auto pt-2 text-xs text-gray-400 dark:text-gray-500"
                    >
                        Created by <a
                            class="hover:underline"
                            href="https://github.com/{agent.author.github_id}"
                        >
                            {agent.author.name}
                        </a>
                    </p>
                </button>
            {/each}
        </div>
    </div>
</div>
