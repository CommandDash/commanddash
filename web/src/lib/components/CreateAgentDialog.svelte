<script lang="ts">
    import { base } from "$app/paths";
    import { goto } from "$app/navigation";
    import { toastStore } from "$lib/stores/ToastStores";
    import { ToastType } from "$lib/types/Toast";
    import appInsights from "$lib/utils/appInsights";
    import IconClose from "~icons/carbon/close";
    import CarbonGithub from "~icons/carbon/logo-github";

    export let showModal: boolean;
    export let onClose: () => void;

    let value: string = "";
    let selectedPlatform: string = "github";

    const platforms = [
        { id: 'github', icon: CarbonGithub, label: 'GitHub', placeholder: 'https://github.com/user/repo' },
        { id: 'npm', icon: 'npm.png', label: 'NPM', placeholder: 'https://www.npmjs.com/package/name' },
        { id: 'pypi', icon: 'python.png', label: 'PyPI', placeholder: 'https://pypi.org/project/name' },
        { id: 'pub', icon: 'icons8-dart-96.png', label: 'Pub', placeholder: 'https://pub.dev/packages/name' },
    ];

    const validateURL = (url: string): { isValid: boolean, packageName: string } => {
        // validate against these
        // https://pub.dev/packages/webview_flutter 
        // https://pub.dev/packages/webview_flutter/install
        //  requests for:
        //  https://pypi.org/project/requests/ 
        // https://pypi.org/project/requests/#history 
        // mock for: 
        // https://www.npmjs.com/package/mock
        //  https://www.npmjs.com/package/mock?activeTab=dependencies 
        // @octokit/graphql for:
        //  https://www.npmjs.com/package/@octokit/graphql
        const patterns = {
            github: /^(https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?)$/,
            npm: /^(https:\/\/www\.npmjs\.com\/package\/(@?[A-Za-z0-9_.-]+\/?[A-Za-z0-9_.-]+))\/?.*$/,
            pypi: /^(https:\/\/pypi\.org\/project\/([A-Za-z0-9_.-]+))\/?.*$/,
            pub: /^(https:\/\/pub\.dev\/packages\/([A-Za-z0-9_.-]+))\/?.*$/,
        };

        const match = url.match(patterns[selectedPlatform]);
        if (match) {
            return { isValid: true, packageName: match[2] };
        } else {
            return { isValid: false, packageName: "" };
        }
    };

    const onCreateAgent = () => {
        value = value.trim()
        const { isValid, packageName } = validateURL(value);
        if (isValid) {
            appInsights.trackEvent({
                name: "CreateAgentSubmitted",
                properties: { platform: selectedPlatform, url: value },
            });
            const queryParam = selectedPlatform === 'github' ? value : packageName;
            console.log(queryParam)
            goto(`${base}/agent?${selectedPlatform}=${queryParam}`);
        } else {
            toastStore.set({
                message: `Please enter a valid ${selectedPlatform} URL`,
                type: ToastType.ERROR,
            });
        }
    };

    $: if (showModal) {
        appInsights.trackEvent({ name: "CreateAgentDialogOpened" });
    }
</script>

{#if showModal}
    <div class="fixed inset-0 z-20 flex items-center justify-center bg-black bg-opacity-50">
        <div class="bg-gray-900 rounded-lg p-6 w-full max-w-md border border-gray-700">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-bold text-gray-100">Create Agent with URL</h2>
                <button on:click={onClose} class="text-gray-400 hover:text-gray-200">
                    <IconClose />
                </button>
            </div>

            <div class="flex flex-wrap justify-center gap-4 mb-6">
                {#each platforms as platform}
                    <button
                        on:click={() => selectedPlatform = platform.id}
                        class="flex flex-col items-center focus:outline-none transition-all duration-200 ease-in-out"
                        class:selected={selectedPlatform === platform.id}
                    >
                        <div class="relative">
                            {#if platform.id === 'github'}
                                <svelte:component this={platform.icon} class="w-10 h-10 mb-1 text-black-600" />
                            {:else}
                                <img src={platform.icon} alt={platform.label} class="w-10 h-10 mb-1" />
                            {/if}

                        </div>
                        <span class="text-xs text-gray-300">{platform.label}</span>
                    </button>
                {/each}
            </div>

            <div class="relative mb-4">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {#if selectedPlatform === 'github'}
                        <CarbonGithub class="w-5 h-5 text-gray-400" />
                    {:else}
                        <img 
                            src={platforms.find(p => p.id === selectedPlatform).icon} 
                            alt={selectedPlatform} 
                            class="w-5 h-5"
                        />
                    {/if}
                </div>
                <!-- TODO: Auto change the selected platform if the url validates againt another platform. like if github is selected but the url is an npm package. -->
                <input
                    type="url"
                    bind:value
                    placeholder={platforms.find(p => p.id === selectedPlatform).placeholder}
                    class="w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-100 placeholder-gray-500"
                />
            </div>

            <button
                on:click={onCreateAgent}
                class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors duration-200"
            >
                Submit
            </button>
        </div>
    </div>
{/if}

<style>
    .selected {
        transform: scale(1.1);
    }
    .selected span {
        color: #60a5fa; /* blue-400 */
        font-weight: bold;
    }
</style>