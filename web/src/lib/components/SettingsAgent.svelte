<script lang="ts">
    import { onMount } from "svelte";
    import type { Agent } from "$lib/types/Agent";
    import { fade, fly } from "svelte/transition";
    import CarbonClose from "~icons/carbon/close";
    import CarbonGithub from "~icons/carbon/logo-github";
    import CarbonCode from "~icons/carbon/code";
    import CarbonWorld from "~icons/carbon/wikis";

    export let showModalSettings: boolean;
    export let onClose: () => void;
    export let currentAgent: Agent;

    let errorMessage: string = "Something went wrong";
    let errorStatus: number = 0;
    let limit: number = 10;

    $: sourceDatas = [];

    $: if (showModalSettings) {
        fetchAgentDetails();
    }

    const fetchAgentDetails = async () => {
        const id = currentAgent?.name;
        const response = await fetch(
            "https://api.commanddash.dev/agent/get-latest-agent",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ name: id }),
            },
        );

        const _response = await response.json();
        if (!response.ok) {
            errorMessage = _response.message;
            errorStatus = response.status;
        }
        const agentData = _response as Agent;
        sourceDatas = extractUris(agentData.data_sources);
    };

    const extractUris = (
        data: { id: string; uri: { type: string; uri: string }[] }[],
    ): { type: string; uri: string }[] => {
        const result: { type: string; uri: string }[] = [];
        data.forEach((item) => {
            item.uri.forEach((uriItem) => {
                if (result.length < limit) {
                    result.push({
                        type: uriItem.type,
                        uri: uriItem.uri,
                    });
                } else {
                    return result;
                }
            });
        });
        return result;
    };
</script>

{#if showModalSettings}
    <div
        class="fixed inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-sm dark:bg-black/50"
        in:fade
    >
        <dialog
            in:fly={{ y: 100 }}
            open
            class="h-[95dvh] w-[90dvw] overflow-hidden rounded-2xl bg-white shadow-2xl outline-none sm:h-[85dvh] xl:w-[1200px] 2xl:h-[75dvh]"
        >
            <div
                class="grid h-full w-full grid-cols-1 grid-rows-[auto,1fr] content-start gap-x-4 overflow-hidden p-4 md:grid-cols-3 md:grid-rows-[auto,1fr] md:p-8"
            >
                <div
                    class="col-span-1 mb-4 flex items-center justify-between md:col-span-3"
                >
                    <h2 class="text-xl font-bold">Settings</h2>
                    <button
                        class="btn rounded-lg"
                        on:click={() => {
                            onClose();
                        }}
                    >
                        <CarbonClose
                            class="text-xl text-gray-900 hover:text-black"
                        />
                    </button>
                </div>
                <div
                    class="col-span-1 flex flex-col overflow-y-auto whitespace-nowrap max-md:-mx-4 max-md:h-[245px] max-md:border max-md:border-b-2 md:pr-6"
                >
                    <h3
                        class="pb-3 pl-3 pt-2 text-[.8rem] text-gray-800 sm:pl-1"
                    >
                        Options
                    </h3>
                </div>
                <div
                    class="col-span-1 w-full overflow-y-auto overflow-x-clip px-1 max-md:pt-4 md:col-span-2 md:row-span-2"
                >
                    <div class="flex h-full flex-col gap-2">
                        <div class="flex gap-6">
                            <img
                                alt="Avatar"
                                class="size-16 flex-none rounded-full object-cover sm:size-24"
                                src={currentAgent.metadata.avatar_id}
                            />
                            <div class="flex-1">
                                <div class="mb-1.5">
                                    <h1
                                        class="mr-1 inline text-xl font-semibold"
                                    >
                                        {currentAgent.metadata.display_name}
                                    </h1>
                                    <!-- <span
                                        class="ml-1 rounded-full border px-2 py-0.5 text-sm leading-none text-gray-500">{currentAgent.version}</span> -->
                                </div>
                                <p
                                    class="mb-2 line-clamp-2 text-sm text-gray-500"
                                >
                                    {currentAgent.description}
                                </p>
                                <p class="text-sm text-gray-500">
                                    Created by <a
                                        class="underline"
                                        target="_blank"
                                        href={currentAgent.author.source_url}
                                        >{currentAgent.author.name}</a
                                    >
                                </p>
                            </div>
                        </div>
                        <div>
                            <h2 class="text-lg font-semibold">Data sources</h2>
                            {#each sourceDatas as sourceData}
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
                    </div>
                </div>
            </div>
        </dialog>
    </div>
{/if}
