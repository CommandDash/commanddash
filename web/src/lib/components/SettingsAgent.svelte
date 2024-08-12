<script lang="ts">
    import { onMount } from "svelte";
    import type { Agent } from "$lib/types/Agent";
    import { fade, fly } from "svelte/transition";
    import CarbonClose from "~icons/carbon/close";
    import CarbonGithub from "~icons/carbon/logo-github";
    import CarbonCode from "~icons/carbon/code";
    import CarbonWorld from "~icons/carbon/wikis";
    import { copyToClipboard } from "$lib/utils/copyToClipboard";
    export let showModalSettings: boolean;
    export let onClose: () => void;
    export let agentDisplayName: string = "";
    export let agentDescription: string = "";
    export let agentLogo: string = "";
    export let agentId: string = "";
    export let agentDataSources: Array<any> = [];

    $: selectedOption = "info";

    const badgeMarkdown = `<a href="https://app.commanddash.io/agent/${agentId}"><img src="https://img.shields.io/badge/AI-Code%20Agent-EB9FDA"></a>`;
    const badgeUrl = `https://app.commanddash.io/agent/${agentId}`;

    function copyBadgeCode() {
        copyToClipboard(badgeMarkdown);
        alert("Badge code copied.");
    }
</script>

{#if showModalSettings}
    <div
        class="fixed inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-sm dark:bg-black/50"
        in:fade
    >
        <dialog
            in:fly={{ y: 100 }}
            open
            class="h-[95dvh] w-[90dvw] overflow-hidden rounded-2xl border-gray-800/70 bg-gray-950 shadow-2xl outline-none sm:h-[85dvh] xl:w-[1200px] 2xl:h-[75dvh]"
        >
            <div
                class="grid h-full w-full grid-cols-1 grid-rows-[auto,1fr] content-start gap-x-4 overflow-hidden p-4 md:grid-cols-3 md:grid-rows-[auto,1fr] md:p-8"
            >
                <div
                    class="col-span-1 mb-4 flex items-center justify-between md:col-span-3"
                >
                    <h2 class="text-xl font-bold text-white">Settings</h2>
                    <button
                        class="btn rounded-lg"
                        on:click={() => {
                            onClose();
                        }}
                    >
                        <CarbonClose
                            class="text-xl text-white hover:text-gray-500"
                        />
                    </button>
                </div>
                <div
                    class="col-span-1 flex flex-col overflow-y-auto whitespace-nowrap max-md:-mx-4 max-md:h-[245px] max-md:border max-md:border-b-2 md:pr-6"
                >
                    <button
                        class={`group flex h-10 flex-none items-center gap-2 pl-3 pr-2 text-sm hover:bg-gray-100 hover:text-gray-800 md:rounded-xl ${selectedOption === "info" ? "!bg-gray-100 !text-gray-800" : "text-white"}`}
                        on:click={() => {
                            selectedOption = "info";
                        }}
                    >
                        Info
                    </button>
                </div>
                <div
                    class="col-span-1 w-full overflow-y-auto overflow-x-clip px-1 max-md:pt-4 md:col-span-2 md:row-span-2"
                >
                    <div class="flex h-full flex-col gap-4">
                        {#if selectedOption === "info"}
                            <div class="flex gap-6">
                                <img
                                    alt="Avatar"
                                    class="size-16 flex-none rounded-full object-cover sm:size-24"
                                    src={agentLogo}
                                />
                                <div class="flex-1">
                                    <div class="mb-1.5">
                                        <h1
                                            class="mr-1 inline text-xl font-semibold text-white"
                                        >
                                            {agentDisplayName}
                                        </h1>
                                    </div>
                                    <p
                                        class="mb-2 line-clamp-2 text-sm text-gray-500"
                                    >
                                        {agentDescription}
                                    </p>
                                </div>
                            </div>
                            <div class="flex flex-col gap-4">
                                <div>
                                    <h2 class="text-lg font-semibold text-white">Link Badge in README or Documentation</h2>
                                    <div class="flex items-center gap-4">
                                        <a href={badgeUrl}>
                                            <img src="https://img.shields.io/badge/AI-Code%20Agent-EB9FDA?style=for-the-badge" alt="AI Code Agent Badge">
                                        </a>
                                        <button class="btn text-gray-500" on:click={copyBadgeCode}>Copy Badge Code</button>
                                    </div>
                                </div>
                            </div>
                            <div class="mt-6">
                                <h2 class="text-lg font-semibold text-white">
                                    Data Sources
                                </h2>
                                {#each agentDataSources as sourceData}
                                    <a
                                        class="group flex h-10 flex-none items-center gap-2 pl-2 pr-2 text-sm hover:bg-gray-100 md:rounded-xl !bg-gray-100 !text-gray-800 mt-1"
                                        href="#"
                                    >
                                        <div class="truncate">
                                            {sourceData.uri}
                                        </div>
                                        <div
                                            class="ml-auto rounded-lg bg-black px-2 py-1.5 text-xs font-semibold leading-none text-white"
                                        >
                                            {#if sourceData.type === "github"}
                                                <CarbonGithub />
                                            {:else if sourceData.type === "web_page"}
                                                <CarbonWorld />
                                            {:else}
                                                <CarbonCode />
                                            {/if}
                                        </div>
                                    </a>
                                {/each}
                            </div>
                        {:else if selectedOption === "share"}
                            <span class="text-white">share</span>
                        {/if}
                    </div>
                </div>
            </div>
        </dialog>
    </div>
{/if}
