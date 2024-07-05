<script lang="ts">
    import { isDesktop } from "$lib/utils/isDesktop";
    import { onMount, createEventDispatcher } from "svelte";

    export let value: string = "";
    export let placeholder: string = "";
    export let minRows = 1;
    export let maxRows: null | number = null;
    export let disabled: boolean = false;

    let textareaElement: HTMLTextAreaElement;

    const dispatch = createEventDispatcher<{ submit: void }>();

    $: minHeight = `${1 + minRows * 1.5}em`;
    $: maxHeight = maxRows ? `${1 + maxRows * 1.5}em` : `auto`;

    function handleKeydown(event: KeyboardEvent) {
        //submit on enter
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();

            textareaElement.blur();

            if (isDesktop(window)) {
                textareaElement.focus();
            }

            dispatch("submit");
        }
    }

    onMount(() => {
        if (isDesktop(window)) {
            textareaElement.focus();
        }
    });
</script>

<div class="relative min-w-0 flex-1" on:paste>
    <pre
        class="scrollbar-custom invisible overflow-x-hidden overflow-y-scroll whitespace-pre-wrap break-words p-3"
        aria-hidden="true"
        style="min-height: {minHeight}; max-height: {maxHeight}"></pre>
    <textarea
        enterkeyhint="send"
        tabindex="0"
        rows="1"
        bind:value
        bind:this={textareaElement}
        class="scrollbar-custom absolute top-0 m-0 h-full w-full resize-none scroll-p-3 overflow-x-hidden overflow-y-scroll border-0 bg-transparent p-3 outline-none focus:ring-0 focus-visible:ring-0"
        {placeholder}
        {disabled}
        on:keydown={handleKeydown}
    />
</div>

<style>
    pre,
    textarea {
        font-family: inherit;
        box-sizing: border-box;
        line-height: 1.5;
    }
</style>
