<script lang="ts">
    import { onMount } from "svelte";
    import type { Agent } from "$lib/types/Agent";
    import { fade, fly } from "svelte/transition";
    import { toastStore } from "$lib/stores/ToastStores";
    import CarbonClose from "~icons/carbon/close";
    import CarbonGithub from "~icons/carbon/logo-github";
    import CarbonCode from "~icons/carbon/code";
    import CarbonWorld from "~icons/carbon/wikis";
    import { ToastType } from "$lib/types/Toast";

    export let showModalSettings: boolean;
    export let onClose: () => void;
    export let agentDisplayName: string = "";
    export let agentDescription: string = "";
    export let agentLogo: string = "";
    export let agentId: string = "";
    export let agentDataSources: Array<any> = [];

    let urlType: string = "github";
    let url: string = "";

    $: selectedOption = "info";

    const handleSubmitContribution = async (e: any) => {
        const ACTION_URL = e.target.action;
        const formData = new FormData(e.target);
        const additionalSources = [];
        const urlPattern = /^(https?:\/\/)?([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(\/[^\s]*)?$/;

        if (!urlPattern.test(url)) {
            toastStore.set({
                message: 'Please enter a valid URL.',
                type: ToastType.ERROR,
            })
            return;
        }

        for (let field of formData) {
            const [key, value] = field;

            if (key === "url") {
                additionalSources.push({
                    type: urlType,
                    uri: value,
                });
            }
        }

        const requestBody = {
            name: agentId, // Replace with the dynamic agent name if needed
            additional_sources: additionalSources,
        };

        try {
            const response = await fetch(ACTION_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody),
            });

            const _response = await response.json();
            if (!response.ok) {
                toastStore.set({
                    message: _response.message,
                    type: ToastType.ERROR,
                });
                return;
            }

            toastStore.set({
                    message: 'Successfully added the data source',
                    type: ToastType.SUCCESS,
                });

        } catch (error) {
            console.log("error", error);
            toastStore.set({
                message: "Something went wrong",
                type: ToastType.ERROR,
            });
        } finally {
            onClose();
        }
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
            class="h-[95dvh] w-[90dvw] overflow-hidden rounded-2xl border-gray-800/70 bg-gray-950 hover:bg-gray-950 shadow-2xl outline-none sm:h-[85dvh] xl:w-[1200px] 2xl:h-[75dvh]"
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
                    <!-- <h3
                        class="pb-3 pl-3 pt-2 text-[.8rem] text-gray-800 sm:pl-1"
                    >
                        Options
                    </h3> -->
                    <button
                        class={`group flex h-10 flex-none items-center gap-2 pl-3 pr-2 text-sm hover:bg-gray-100 hover:text-gray-800 md:rounded-xl ${selectedOption === "info" ? "!bg-gray-100 !text-gray-800" : "text-white"}`}
                        on:click={() => {
                            selectedOption = "info";
                        }}
                    >
                        Info
                    </button>
                    <button
                        class={`group flex h-10 flex-none items-center gap-2 pl-3 pr-2 text-sm hover:bg-gray-100 hover:text-gray-800 md:rounded-xl ${selectedOption === "contribute" ? "!bg-gray-100 !text-gray-800" : "text-white"}`}
                        on:click={() => {
                            selectedOption = "contribute";
                        }}
                    >
                        Contribute
                    </button>
                    <button
                        class={`group flex h-10 flex-none items-center gap-2 pl-3 pr-2 text-sm hover:bg-gray-100 hover:text-gray-800 md:rounded-xl ${selectedOption === "share" ? "!bg-gray-100 !text-gray-800" : "text-white"}`}
                        on:click={() => {
                            selectedOption = "share";
                        }}
                    >
                        Share
                    </button>
                </div>
                <div
                    class="col-span-1 w-full overflow-y-auto overflow-x-clip px-1 max-md:pt-4 md:col-span-2 md:row-span-2"
                >
                    <div class="flex h-full flex-col gap-2">
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
                                        <!-- <span
                                        class="ml-1 rounded-full border px-2 py-0.5 text-sm leading-none text-gray-500">{currentAgent.version}</span> -->
                                    </div>
                                    <p
                                        class="mb-2 line-clamp-2 text-sm text-gray-500"
                                    >
                                        {agentDescription}
                                    </p>
                                    <!-- <p class="text-sm text-gray-500">
                                    Created by <a
                                        class="underline"
                                        target="_blank"
                                        href={currentAgent.author.source_url}
                                        >{currentAgent.author.name}</a
                                    >
                                </p> -->
                                </div>
                            </div>
                            <div>
                                <h2 class="text-lg font-semibold text-white">
                                    Data sources
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
                        {:else if selectedOption === "contribute"}
                            <h1
                                class="mr-1 inline text-xl font-semibold text-white"
                            >
                                Contribute
                            </h1>
                            <form
                                method="POST"
                                on:submit|preventDefault={handleSubmitContribution}
                                class="w-full"
                                action="https://api.commanddash.dev/agent/contribute-source"
                            >
                                <div class="flex flex-row">
                                    <select
                                        name="urlType"
                                        class="border-2 border-gray-200 bg-gray-100 p-2 rounded mr-2 w-[50%] md:w-[20%]"
                                        bind:value={urlType}
                                    >
                                        <option value="github">Github</option>
                                        <option value="sitemap">Sitemap</option>
                                        <option value="deep_crawl_page"
                                            >Website</option
                                        >
                                        <option value="web_page">Webpage</option
                                        >
                                    </select>
                                    <input
                                        autocorrect="off"
                                        autocapitalize="none"
                                        class="w-[50%] md:w-[80%] border text-gray-900 text-sm rounded focus:ring-blue-500 focus:border-blue-500 block p-2.5 bg-gray-100 border-gray-200 dark:placeholder-gray-400 dark:focus:ring-blue-500 dark:focus:border-blue-500"
                                        name="url"
                                        placeholder="URL"
                                        type="url"
                                        bind:value={url}
                                    />
                                </div>
                                <button
                                    class="flex items-center justify-center w-full h-12 px-8 font-medium text-white transition-colors duration-150 ease-in-out bg-blue-800 rounded-md hover:bg-blue-700 space-x-2 shadow-lg mt-2"
                                    type="submit">Submit</button
                                >
                            </form>
                        {/if}
                    </div>
                </div>
            </div>
        </dialog>
    </div>
{/if}
