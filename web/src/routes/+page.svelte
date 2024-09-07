<script lang="ts">
    import { onMount } from "svelte";
    import { page } from "$app/stores";
    import appInsights from "$lib/utils/appInsights";
    import CarbonSearch from "~icons/carbon/search";
    import CarbonAdd from "~icons/carbon/add";
    import CarbonGithub from "~icons/carbon/logo-github";
    import CarbonSettings from "~icons/carbon/settings";
    import type { Agent } from "$lib/types/Agent";
    import { goto } from "$app/navigation";
    import { debounce } from "$lib/utils/debounce";
    import { base } from "$app/paths";
    import CreateAgentDialog from "$lib/components/CreateAgentDialog.svelte";

    const SEARCH_DEBOUNCE_DELAY = 400;
    let agents: Agent[] = [];
    let filteredAgents: Agent[] = [];
    let searchValue: string = "";
    let showModal: boolean = false;
    let currentAgent: Agent;
    let sections: { [key: string]: Agent[] } = {};

    const promotedAgent: Agent = {
        name: "promoted-agent",
        metadata: {
            display_name: "Mellowtel",
            description: "Transparent monetization engine for Flutter Apps",
            avatar_id: "mellowtel.png"
        },
        author: {
            name: "Mellowtel",
            source_url: "https://mellowtel.dev/flutter?utm_source=web&utm_medium=promotedcard&utm_campaign=commanddash"
        }
    };

    $: loading = true;

    onMount(async () => {
        loading = true;
        try {
            const [existingResponse] = await Promise.all([
                fetch("https://stage.commanddash.dev/agent/web/get-agent-list", {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    method: "POST",
                    body: JSON.stringify({ cli_version: "0.0.1" }),
                }),
                // fetch("https://stage.commanddash.dev/agent/web/get-highlighted-agent-list", {
                //     headers: {
                //         "Content-Type": "application/json",
                //     },
                //     method: "POST",
                //     body: JSON.stringify({ cli_version: "0.0.1" }),
                // })
            ]);

            const existingAgents = await existingResponse.json();
            // const newAgents = await newResponse.json();

            if (!existingResponse.ok) {
                throw new Error("Failed to fetch agents");
            }

            agents = existingAgents;
            filteredAgents = existingAgents;

            // Combine agents from new API into sections
            // sections = newAgents;

            // Add existing agents under "All Agents" section
            sections["All Agents"] = existingAgents;

            appInsights.trackEvent({ name: "AgentsLoaded" }); // Track custom event

            // Check if the 'create' query parameter is set to 'true'
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('create') === 'true') {
                showModal = true;
            }

            // Perform initial search if there is a value in the search input
            if (searchValue) {
                search(searchValue);
            }
        } catch (error) {
            appInsights.trackException({ error });
        } finally {
            loading = false;
        }
    });

    const navigateAgents = (agent: Agent) => {
        goto(`/agent/${agent.name}`);
        appInsights.trackEvent({
            name: "NavigateAgent",
            properties: { agentName: agent.name },
        }); // Track custom event
    };

    const search = debounce(async (value: string) => {
        searchValue = value.toLowerCase();
        filteredAgents = sections["All Agents"].filter((agent) => {
            return (
                agent.metadata.display_name
                    .toLowerCase()
                    .includes(searchValue) ||
                agent.author?.name.toLowerCase().includes(searchValue) ||
                agent.author?.source_url?.toLowerCase().includes(searchValue)
            );
        });
        appInsights.trackEvent({ name: "Search", properties: { searchValue } }); // Track custom event
    }, SEARCH_DEBOUNCE_DELAY);

    const formatGithubUrl = (url: string) => {
        const urlObj = new URL(url);
        const paths = urlObj.pathname.split("/").filter(Boolean);
        const [author, repo] = paths.slice(-2);
        return { author, repo };
    };

    const formatText = (url: string, maxLength: number) => {
        const { author, repo } = formatGithubUrl(url);
        const formattedText = `${author}/${repo}`;
        return formattedText.length > maxLength
            ? formattedText.slice(0, maxLength) + "..."
            : formattedText;
    };
</script>

<svelte:head>
    <title>CommandDash - Marketplace</title>
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
        <div class="flex flex-row">
            <div>
                <div class="flex items-center">
                    <h1 class="text-2xl font-bold">AI Agents for Libraries</h1>
                </div>
                <h3 class="text-gray-500">
                    Personalized answers from expert agents at your command
                </h3>
            </div>
            <button
                class="flex ml-auto h-9 items-center gap-1 whitespace-nowrap rounded-lg border border-gray-300 bg-gradient-to-r from-gray-700 via-gray-900 to-black text-white py-1 px-3 shadow-lg hover:bg-gradient-to-r hover:from-gray-600 hover:via-gray-800 hover:to-black hover:shadow-md dark:border-gray-700 dark:bg-gradient-to-r dark:from-gray-800 dark:via-gray-900 dark:to-black dark:hover:from-gray-700 dark:hover:via-gray-800 dark:hover:to-black transition duration-200 ease-in-out transform hover:-translate-y-1"
                on:click={() => {
                    showModal = true;
                }}
            >
                <CarbonAdd />Create Agent
            </button>
        </div>
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
                    placeholder="Search any library or SDK"
                    maxlength="150"
                    type="search"
                    bind:value={searchValue}
                    on:input={(e) => search(e.currentTarget.value)}
                />
            </div>
        </div>
        {#if loading}
            <div class="flex-col w-full h-48 px-2 py-3">
                <div class="inline-flex flex-row items-end px-2">
                    <span id="workspace-loader-text">Loading results</span>
                    <div class="typing-loader mx-2"></div>
                </div>
            </div>
        {:else}
            {#if searchValue}
                <div class="mt-7">
                    <h2 class="text-xl font-semibold">Search Results</h2>
                    <div
                        class="mt-4 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4"
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
                                {#if agent.author?.source_url}
                                    <a
                                        href={agent.author.source_url}
                                        class="mt-auto pt-2 text-xs text-gray-400 dark:text-gray-500 line-clamp-1 hover:underline inline-flex flex-row items-center"
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <CarbonGithub class="mx-1" />
                                        {formatText(agent.author.source_url, 20)}
                                    </a>
                                {/if}
                            </button>
                        {/each}
                    </div>
                </div>
            {:else}
                {#each Object.keys(sections) as section}
                    <div class="mt-7">
                        <h2 class="text-xl font-semibold">{section}</h2>
                        <div
                            class="mt-4 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4"
                        >
                            {#each sections[section] as agent, index}
                                <!-- {#if index === 2 && section === "All Agents"}
                                    <button
                                        class="relative flex flex-col items-center justify-center overflow-hidden text-balance rounded-xl border bg-gray-50/50 px-4 py-6 text-center shadow hover:bg-gray-50 hover:shadow-inner max-sm:px-4 sm:h-64 sm:pb-4 xl:pt-8 dark:border-gray-800/70 dark:bg-gray-950/20 dark:hover:bg-gray-950/40 promoted-card"
                                        on:click={() => window.open(promotedAgent.author.source_url, "_blank")}
                                    >
                                        <img
                                            src={promotedAgent.metadata.avatar_id}
                                            alt="Avatar"
                                            class="mb-2 aspect-square size-12 flex-none rounded-full object-cover sm:mb-6 sm:size-20"
                                        />
                                        <h3
                                            class="mb-2 line-clamp-2 max-w-full break-words text-center text-[.8rem] font-semibold leading-snug sm:text-sm promoted-text"
                                        >
                                            {promotedAgent.metadata.display_name}
                                        </h3>
                                        <p
                                            class="line-clamp-4 text-xs text-gray-700 sm:line-clamp-2 dark:text-gray-400 promoted-text"
                                        >
                                            {promotedAgent.metadata.description}
                                        </p>
                                        <span class="promoted-indicator">Promoted</span>
                                    </button>
                                {/if} -->
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
                                    {#if agent.author?.source_url}
                                        <a
                                            href={agent.author.source_url}
                                            class="mt-auto pt-2 text-xs text-gray-400 dark:text-gray-500 line-clamp-1 hover:underline inline-flex flex-row items-center"
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            <CarbonGithub class="mx-1" />
                                            {formatText(agent.author.source_url, 20)}
                                        </a>
                                    {/if}
                                </button>
                            {/each}
                        </div>
                    </div>
                {/each}
            {/if}
        {/if}
    </div>
</div>
<CreateAgentDialog
    bind:showModal
    onClose={() => {
        showModal = false;
    }}
/>

<style>
    .typing-loader {
        width: 4px;
        height: 4px;
        border-radius: 50%;
        animation: loading 1s linear infinite alternate;
        margin-bottom: 4px;
    }

    @keyframes loading {
        0% {
            background-color: #0e70c0;
            box-shadow:
                8px 0px 0px 0px #d4d4d4,
                16px 0px 0px 0px #d4d4d4;
        }

        25% {
            background-color: #d4d4d4;
            box-shadow:
                8px 0px 0px 0px #0e70c0,
                16px 0px 0px 0px #d4d4d4;
        }

        75% {
            background-color: #d4d4d4;
            box-shadow:
                8px 0px 0px 0px #d4d4d4,
                16px 0px 0px 0px #0e70c0;
        }
    }

    .promoted-card {
        border: 2px solid #1e90ff; /* Blue border */
        background-color: #e6f7ff; /* Light blue background */
    }

    .promoted-indicator {
        position: absolute;
        top: 0;
        right: 0;
        background-color: #1e90ff; /* Blue background */
        color: #fff; /* White text */
        padding: 0.2em 0.5em;
        font-size: 0.75em;
        font-weight: bold;
        border-bottom-left-radius: 0.5em;
    }

    .promoted-text {
        color: #003366; /* Dark blue text */
        text-shadow: 0.5px 0.5px 1px rgba(0, 0, 0, 0.1); /* Subtle text shadow */
    }
</style>