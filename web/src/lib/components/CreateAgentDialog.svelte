<script lang="ts">
    import { base } from "$app/paths";
    import { clickOutside } from "$lib/actions/clickOutside";
    import { goto } from "$app/navigation";
    import { toastStore } from "$lib/stores/ToastStores";
    import { ToastType } from "$lib/types/Toast";
	import IconClose from "~icons/carbon/close";

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
            class="flex flex-col content-center items-center gap-x-10 gap-y-3 overflow-hidden rounded-2xl bg-gradient-to-r from-[#19202d] to-[#111827] p-4 pt-6 text-center shadow-2xl outline-none max-sm:w-[85dvw] max-sm:px-6 md:w-96 md:grid-cols-3 md:grid-rows-[auto,1fr] md:p-8"
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
            <h1 class="text-xl font-bold text-white">Create An Agent</h1>
            <input
                class="border-gray-300 text-white rounded-md top-0 m-0 h-12 w-full resize-none scroll-p-3 overflow-x-hidden overflow-y-scroll border-2 bg-transparent p-3 "
                placeholder="Github url"
                type="url"
                {value}
                on:input={(e) => addGithubURL(e.currentTarget.value)}
            />
            <button
                on:click={onCreateAgent}
                class="mt-4 w-full rounded-full bg-black px-4 py-3 font-semibold text-white"
            >
                Create Agent
            </button>
        </dialog>
    </div>
{/if}
