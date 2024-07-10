<script lang="ts">
    import showdown from "showdown";
    import type { Message } from "$lib/types/Message";

    export let messages: Message[] = [];

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
    }

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
                class="relative min-h-[calc(2rem+theme(spacing[3.5])*2)] min-w-[60px] break-words rounded border border-gray-100 bg-[#497BEF]/[.2] px-5 py-3.5 prose-pre:my-2"
            >
                <div
                    class="prose max-w-none max-sm:prose-sm dark:prose-invert prose-headings:font-semibold prose-h1:text-lg prose-h2:text-base prose-h3:text-base"
                >
                    <p class="text-white">
                        {@html markdownToPlain(message.text?.trim())}
                    </p>
                </div>
            </div>
        </div>
    {/if}
{/each}
