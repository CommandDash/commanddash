<script lang="ts">
    import { base } from "$app/paths";
    import { goto } from "$app/navigation";
    import { toastStore } from "$lib/stores/ToastStores";
    import { ToastType } from "$lib/types/Toast";
    import appInsights from "$lib/utils/appInsights";
    import IconClose from "~icons/carbon/close";
    import CarbonSearch from "~icons/carbon/search";
    import CarbonGithub from "~icons/carbon/logo-github";
    import CarbonNpm from "~icons/carbon/logo-npm";
    import CarbonPypi from "~icons/carbon/logo-python";
    import CarbonPub from "~icons/carbon/logo-delicious";

    export let showModal: boolean;
    export let onClose: () => void;

    let value: string = "";
    let selectedPlatform: string = "github";

    const platforms = [
        { id: 'github', icon: CarbonGithub, label: 'GitHub' },
        { id: 'npm', icon: CarbonNpm, label: 'NPM' },
        { id: 'pypi', icon: CarbonPypi, label: 'PyPI' },
        { id: 'pub', icon: CarbonPub, label: 'Pub' }
    ];

    const validateURL = (url: string): boolean => {
        const patterns = {
            github: /^(https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?)$/,
            npm: /^(https:\/\/www\.npmjs\.com\/package\/[A-Za-z0-9_.-]+\/?)$/,
            pypi: /^(https:\/\/pypi\.org\/project\/[A-Za-z0-9_.-]+\/?)$/,
            pub: /^(https:\/\/pub\.dev\/packages\/[A-Za-z0-9_.-]+\/?)$/
        };
        return patterns[selectedPlatform].test(url);
    };

    const onCreateAgent = () => {
        if (validateURL(value)) {
            appInsights.trackEvent({
                name: "CreateAgentSubmitted",
                properties: { platform: selectedPlatform, url: value },
            });
            goto(`${base}/agent?platform=${selectedPlatform}&url=${value}`);
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
        <div class="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-bold text-gray-900 dark:text-white">Create Agent with URL</h2>
                <button on:click={onClose} class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                    <IconClose />
                </button>
            </div>

            <div class="flex justify-center space-x-4 mb-4">
                {#each platforms as platform}
                    <button
                        on:click={() => selectedPlatform = platform.id}
                        class="flex flex-col items-center focus:outline-none"
                        class:selected={selectedPlatform === platform.id}
                    >
                        <svelte:component this={platform.icon} class="text-2xl" />
                        <span class="text-xs mt-1">{platform.label}</span>
                    </button>
                {/each}
            </div>

            <div class="relative mb-4">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svelte:component this={platforms.find(p => p.id === selectedPlatform).icon} class="text-gray-400" />
                </div>
                <input
                    type="url"
                    bind:value
                    placeholder="{selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)} Repo URL"
                    class="w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
            </div>

            <button
                on:click={onCreateAgent}
                class="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
                Submit
            </button>
        </div>
    </div>
{/if}

<style>
    .selected {
        color: #3b82f6; /* blue-500 */
    }
    .selected span {
        font-weight: bold;
    }
</style>