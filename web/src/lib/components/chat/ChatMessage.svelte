<script lang="ts">
    import showdown from "showdown";
    import IconVisualStudio from "../icons/IconVisualStudio.svelte";
    import type { Message } from "$lib/types/Message";

    export let messages: Message[] = [];
    export let agentLogo: string = "";
    export let agentDisplayName: string = "";
    export let agentReferences: Array<any> = [];

    let showAllLinks: boolean = false;

    $: validReferences = agentReferences.filter((link) => link.url);

    const toggleShowLinks = () => {
        showAllLinks = !showAllLinks;
    };

    const markdownToPlain = (message: string) => {
        const converter = new showdown.Converter({
            omitExtraWLInCodeBlocks: true,
            simplifiedAutoLink: true,
            excludeTrailingPunctuationFromURLs: true,
            literalMidWordUnderscores: true,
            simpleLineBreaks: true,
            openLinksInNewWindow: true,
            ghCodeBlocks: true,
            strikethrough: true,
            tasklists: true,
            extensions: [startAttributeExtension],
        });
        return converter.makeHtml(message);
    };

    const isInsideCodeBlock = (line: string, codeBlockRegex: RegExp) => {
        return codeBlockRegex.test(line);
    };

    const startAttributeExtension = () => {
        let startNumbers: any[] = [];

        return [
            {
                type: "lang",
                filter: function (text: string) {
                    const olMarkdownRegex = /^\s*(\d+)\. /gm;

                    const lines = text.split("\n");
                    let isCodeBlock = false;
                    const codeBlockRegex = /^```/;

                    lines.forEach((line) => {
                        if (isInsideCodeBlock(line, codeBlockRegex)) {
                            isCodeBlock = !isCodeBlock;
                        }

                        if (!isCodeBlock) {
                            const match = olMarkdownRegex.exec(line);
                            if (match) {
                                startNumbers.push(match[1]);
                            }
                        }
                    });

                    return text;
                },
            },
            {
                type: "output",
                filter: function (text: string) {
                    if (startNumbers.length > 0) {
                        const lines = text.split("\n");
                        let isCodeBlock = false;
                        const codeBlockRegex = /^```/;

                        lines.forEach((line, index) => {
                            if (isInsideCodeBlock(line, codeBlockRegex)) {
                                isCodeBlock = !isCodeBlock;
                            }

                            if (!isCodeBlock && line.includes("<ol>")) {
                                const startNumber = startNumbers.shift();
                                lines[index] = line.replace(
                                    "<ol>",
                                    `<ol start="${startNumber}">`,
                                );
                            }
                        });

                        text = lines.join("\n");
                    }

                    return text;
                },
            },
        ];
    };
</script>

{#each messages as message}
    {#if message?.role === "user"}
        <div
            class="group relative w-full items-start justify-start gap-4 max-sm:text-sm"
            role="presentation"
        >
            <div class="flex w-full flex-col gap-2">
                <div class="flex w-full flex-row flex-nowrap">
                    <p
                        class="disabled w-full appearance-none whitespace-break-spaces text-wrap break-words bg-inherit px-5 py-3.5 text-gray-500 dark:text-gray-400"
                    >
                        {@html markdownToPlain(message.text?.trim())}
                    </p>
                </div>
            </div>
        </div>
    {:else if message.role === "model"}
        <div
            class="group relative w-full items-start justify-start gap-4 max-sm:text-sm"
            role="presentation"
        >
            <div
                class="relative min-h-[calc(2rem+theme(spacing[3.5])*2)] min-w-[60px] break-words rounded border-[.1px] border-white bg-[#497BEF]/[.2] px-5 py-3.5 prose-pre:my-2"
            >
                <div class="inline-flex flex-row justify-center">
                    <img
                        class="mr-2 aspect-square size-8 rounded"
                        src={agentLogo}
                        alt=""
                    />
                    <p class="flex items-center font-semibold">
                        {agentDisplayName}
                    </p>
                </div>
                <div
                    class="prose max-w-none max-sm:prose-sm dark:prose-invert prose-headings:font-semibold prose-h1:text-lg prose-h2:text-base prose-h3:text-base"
                >
                    <p class="text-white">
                        {@html markdownToPlain(message.text?.trim())}
                    </p>
                </div>
                <div class="mx-auto grid gap-4 md:grid-cols-2">
                    <div class="md:col-span-1 inline-flex flex-col">
                        {#if validReferences.length > 0}
                            <span> Source </span>
                            {#each validReferences.slice(0, showAllLinks ? validReferences.length : 2) as link}
                                {#if link.url}
                                    <a
                                        href={link.url}
                                        target="_blank"
                                        class="cursor-pointer hover:text-violet-500 underline"
                                        >{link.url}</a
                                    >
                                {/if}
                            {/each}
                            {#if validReferences.length > 2}
                                <span
                                    on:click={toggleShowLinks}
                                    class="mt-2 text-blue-500 hover:text-blue-700 underline cursor-pointer"
                                >
                                    {showAllLinks ? "Read Less" : "Read More"}
                                </span>
                            {/if}
                        {/if}
                    </div>
                    <div class="md:col-span-2">
                        <div
                            class="overflow-hidden rounded border dark:border-gray-800 cursor-pointer"
                        >
                            <a
                                href="https://marketplace.visualstudio.com/items?itemName=WelltestedAI.fluttergpt"
                                target="_blank"
                                class="flex items-center justify-center w-full md:w-auto h-12 px-6 font-medium text-white transition-colors duration-150 ease-in-out bg-blue-800 rounded-md hover:bg-blue-700 space-x-2 shadow-lg"
                            >
                                <IconVisualStudio />
                                <div class="text-sm text-white">VSCode</div>
                            </a>
                        </div>
                    </div>
                    <div class="md:col-span-3 md:mt-6">
                        <div class="grid gap-3 md:grid-cols-2 md:gap-5"></div>
                    </div>
                </div>
            </div>
        </div>
    {/if}
{/each}
