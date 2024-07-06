<script lang="ts">
    import { LottiePlayer } from "@lottiefiles/svelte-lottie-player";

    import type { Message } from "$lib/types/Message";
    import ChatInput from "./ChatInput.svelte";
    import ChatIntroduction from "./ChatIntroduction.svelte";

    import ChatMessage from "./ChatMessage.svelte";

    import CarbonSendAltFilled from "~icons/carbon/send-alt-filled";

    export let messages: Message[] = [];
    export let loading = false;
    export let agentName: string = "dash";
    export let agentDisplayName: string = "Dash";
    export let agentDescription: string = "";
    export let agentLogo: string = "";
    export let agentVersion: string = "1.0.3";
    export let agentPrivate: boolean = false;

    let messageLoading: boolean = false;

    let message: string = "";

    const handleSubmit = async () => {
        if (messageLoading || loading) {
            return;
        }
        messageLoading = true;

        messages = [...messages, { role: "user", text: message }];

        message = "";

        const agentData = {
            agent_name: agentName,
            agent_version: agentVersion,
            chat_history: messages,
            current_message: message,
            included_references: [],
            private: agentPrivate,
        };

        try {
            const response = await fetch(
                "https://api.commanddash.dev/v2/ai/agent/answer",
                {
                    method: "POST",
                    body: JSON.stringify(agentData),
                    headers: {
                        "Content-Type": "application/json",
                    },
                },
            );
            const modelResponse = await response.json();
            messages = [
                ...messages,
                { role: "model", text: modelResponse.response },
            ];
        } catch (error) {
            console.log("error", error);
        }

        messageLoading = false;
    };
</script>

<div class="relative min-h-0 min-w-0 h-screen">
    <div class="scrollbar-custom mr-1 h-full overflow-y-auto">
        <div
            class="mx-auto flex h-full max-w-3xl flex-col gap-6 px-5 pt-6 sm:gap-8 xl:max-w-4xl xl:pt-10"
        >
            <div class="flex h-max flex-col gap-6 pb-40 2xl:gap-7">
                {#if messages.length > 0}
                    {#if !loading}
                        <ChatMessage {messages} />
                        {#if messageLoading}
                            <LottiePlayer
                                src="/lottie/loading-animation.json"
                                autoplay={true}
                                loop={true}
                                height={100}
                                width={100}
                            />
                        {/if}
                    {:else if loading}
                        <LottiePlayer
                            src="/lottie/loading-animation.json"
                            autoplay={true}
                            loop={true}
                            height={100}
                            width={100}
                        />
                    {/if}
                {:else}
                    <ChatIntroduction {agentDescription} {agentDisplayName} {agentLogo} />
                {/if}
            </div>
        </div>
    </div>
    <div
        class="dark:via-gray-80 pointer-events-none absolute inset-x-0 bottom-0 z-0 mx-auto flex w-full max-w-3xl flex-col items-center justify-center bg-gradient-to-t from-white via-white/80 to-white/0 px-3.5 py-4 max-md:border-t max-md:bg-white sm:px-5 md:py-8 xl:max-w-4xl dark:border-gray-800 dark:from-gray-900 dark:to-gray-900/0 max-md:dark:bg-gray-900 [&>*]:pointer-events-auto"
    >
        <div class="w-full">
            <form
                tabindex="-1"
                class="relative flex w-full max-w-4xl flex-1 items-center rounded-xl border bg-gray-100 focus-within:border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:focus-within:border-gray-500"
            >
                <div class="flex w-full flex-1 border-none bg-transparent">
                    <ChatInput
                        placeholder="Ask anything"
                        maxRows={6}
                        on:submit={handleSubmit}
                        bind:value={message}
                    />
                    <button
                        class="btn mx-1 my-1 h-[2.4rem] self-end rounded-lg bg-transparent p-1 px-[0.7rem] text-gray-400 disabled:opacity-60 enabled:hover:text-gray-700 dark:disabled:opacity-40 enabled:dark:hover:text-gray-100"
                        type="submit"
                    >
                        <CarbonSendAltFilled />
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>

<style>
    li::marker {
        color: white;
    }
</style>