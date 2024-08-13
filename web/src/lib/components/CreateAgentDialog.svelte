<script lang="ts">
    import { base } from "$app/paths";
    import { clickOutside } from "$lib/actions/clickOutside";
    import { goto } from "$app/navigation";
    import { toastStore } from "$lib/stores/ToastStores";
    import { ToastType } from "$lib/types/Toast";
    import appInsights from "$lib/utils/appInsights"; // Import the appInsights instance
    import IconClose from "~icons/carbon/close";
    import CarbonSearch from "~icons/carbon/search";
    import CarbonGithub from "~icons/carbon/logo-github";

    export let showModal: boolean;
    export let onClose: () => void;

    let dialog: HTMLDialogElement;
    let value: string = "";

    const validateGithubURL = (url: string): boolean => {
        const githubUrlPattern =
            /^(https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?)$/;
        return githubUrlPattern.test(url);
    };

    const addGithubURL = (url: string) => {
        value = url;
    };

    const onCreateAgent = () => {
        if (validateGithubURL(value)) {
            // Track custom event for form submission
            appInsights.trackEvent({
                name: "CreateAgentSubmitted",
                properties: {
                    githubUrl: value,
                },
            });

            goto(`${base}/agent?github=${value}`);
        } else {
            toastStore.set({
                message: "Please enter valid Github URL",
                type: ToastType.ERROR,
            });
        }
    };

    $: if (showModal) {
        // Track custom event for dialog opened
        appInsights.trackEvent({
            name: "CreateAgentDialogOpened",
        });
    }
</script>

{#if showModal}
    <div
        class="fixed inset-0 z-20 flex items-center justify-center bg-transparent backdrop-blur-sm"
    >
        <dialog
            bind:this={dialog}
            class="flex flex-col content-center items-center gap-x-10 gap-y-3 overflow-hidden rounded-xl border bg-gray-50/50 px-4 py-6 text-center shadow hover:bg-gray-50 hover:shadow-inner sm:h-64 sm:pb-4 xl:pt-8 dark:border-gray-800/70 dark:bg-gray-950 dark:hover:bg-gray-950 max-sm:w-[85dvw] max-sm:px-6 md:w-96 md:grid-cols-3 md:grid-rows-[auto,1fr] md:p-8"
            on:close={() => dialog.close()}
            open={showModal}
        >
            <div class="absolute right-0 top-0 mr-2 mt-2">
                <button
                    class="flex items-center px-2.5 py-1 text-sm text-white"
                    on:click={onClose}
                >
                    <IconClose class="mr-1.5 text-xl" />
                </button>
            </div>
            <h1 class="text-xl font-bold text-white">Create Agent with Github</h1>
            <div
                class="relative flex h-[50px] min-w-full items-center rounded-md border px-2 has-[:focus]:border-gray-400 sm:w-64 dark:border-gray-600"
            >
                <CarbonGithub
                    height="1.5em"
                    width="1.5em"
                    class="pointer-events-none absolute left-2 text-xs text-gray-400"
                />
                <input
                    class="h-[50px] w-full bg-transparent pl-7 focus:outline-none text-white"
                    placeholder="Github Repo URL"
                    type="url"
                    {value}
                    on:input={(e) => addGithubURL(e.currentTarget.value)}
                />
            </div>
            <button
                on:click={onCreateAgent}
                class="mt-4 w-full rounded bg-gray-300 px-4 py-3 font-semibold text-black"
            >
                Submit
            </button>
        </dialog>
    </div>
{/if}