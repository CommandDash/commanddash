<script lang="ts">
    import { base } from "$app/paths";
    import { clickOutside } from "$lib/actions/clickOutside";
    import { afterNavigate, goto } from "$app/navigation";

    let previousPage: string = base;
    let value: string = '';

    afterNavigate(({ from }) => {
        if (!from?.url.pathname.includes("settings")) {
            previousPage = from?.url.toString() || previousPage;
        }
    });

    const addGithubURL = (_value: string) => {
        value = _value;
    }

</script>

<div
    class="fixed inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-sm dark:bg-black/50"
>
    <dialog
        open
        use:clickOutside={() => {
            goto(previousPage);
        }}
        class="flex flex-col content-center items-center gap-x-10 gap-y-3 overflow-hidden rounded-2xl bg-white p-4 pt-6 text-center shadow-2xl outline-none max-sm:w-[85dvw] max-sm:px-6 md:w-96 md:grid-cols-3 md:grid-rows-[auto,1fr] md:p-8"
    >
        <input
            class="border-gray-300 text-black rounded-md top-0 m-0 h-full w-full resize-none scroll-p-3 overflow-x-hidden overflow-y-scroll border-2 bg-transparent p-3"
            placeholder="github url"
            type="url"
            value={value}
            on:input={(e) => addGithubURL(e.currentTarget.value)}
        />
        <button
            class="mt-4 w-full rounded-full bg-gray-200 px-4 py-2 font-semibold text-gray-700"
            on:click={() => {
                goto(previousPage);
            }}
        >
            Cancel
        </button>
        <button
            on:click={() => {
                goto(`${base}/agent?github=${value}`);
            }}
            class=" w-full rounded-full bg-black px-4 py-3 font-semibold text-white"
        >
            Create Agent
        </button>
    </dialog>
</div>
