<script lang="ts">
    import { base } from "$app/paths";
    import { clickOutside } from "$lib/actions/clickOutside";
    import { goto } from "$app/navigation";
    import { toastStore } from "$lib/stores/ToastStores";
    import { ToastType } from "$lib/types/Toast";

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
            goto(`${base}/agent?github=${value}`);
        } else {
            toastStore.set({
                message: "Please enter valid Github URL",
                type: ToastType.ERROR,
            });
        }
    };
</script>

{#if showModal}
    <div
        class="fixed inset-0 z-20 flex items-center justify-center bg-transparent backdrop-blur-sm"
    >
        <dialog
            bind:this={dialog}
            class="flex flex-col content-center items-center gap-x-10 gap-y-3 overflow-hidden rounded-2xl bg-white p-4 pt-6 text-center shadow-2xl outline-none max-sm:w-[85dvw] max-sm:px-6 md:w-96 md:grid-cols-3 md:grid-rows-[auto,1fr] md:p-8"
            on:close={() => dialog.close()}
            open={showModal}
        >
            <h1 class="text-xl font-bold">Create Agent</h1>
            <input
                class="border-gray-300 text-black rounded-md top-0 m-0 h-full w-full resize-none scroll-p-3 overflow-x-hidden overflow-y-scroll border-2 bg-transparent p-3"
                placeholder="Github url"
                type="url"
                {value}
                on:input={(e) => addGithubURL(e.currentTarget.value)}
            />
            <button
                class="mt-4 w-full rounded-full bg-gray-200 px-4 py-2 font-semibold text-gray-700"
                on:click={onClose}
            >
                Cancel
            </button>
            <button
                on:click={onCreateAgent}
                class=" w-full rounded-full bg-black px-4 py-3 font-semibold text-white"
            >
                Create Agent
            </button>
        </dialog>
    </div>
{/if}
