<script lang="ts">
    import { onMount } from "svelte";
    import { error } from "@sveltejs/kit";
    import { page } from "$app/stores";

    import ChatWindow from "$lib/components/chat/ChatWindow.svelte";
    import { type Agent } from "$lib/types/Agent";
    import LoadingPage from "$lib/components/LoadingPage.svelte";

    let currentAgentDetails: Agent;
    $: loading = false;

    onMount(async () => {
        loading = true;
        const id: string = $page.params?.id;
        try {
            const response = await fetch(
                "https://api.commanddash.dev/agent/get-latest-agent",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ name: id }),
                },
            );

            if (!response.ok) {
                loading = false;
                throw error(404, "Agent not found");
            }

            currentAgentDetails = (await response.json()) as Agent;
        } catch (error) {
            console.log("error", error);
        } finally {
            loading = false;
        }
    });
</script>

{#if currentAgentDetails}
    <ChatWindow
        {loading}
        agentName={currentAgentDetails?.name}
        agentPrivate={currentAgentDetails?.testing}
        agentVersion={currentAgentDetails?.version}
        agentDisplayName={currentAgentDetails?.metadata?.display_name}
        agentDescription={currentAgentDetails?.metadata?.description}
        agentLogo={currentAgentDetails?.metadata?.avatar_id}
    />
{/if}

{#if loading}
    <LoadingPage />
{:else}
    <div
        class="h-screen w-screen inline-flex justify-center items-center flex-col"
    >
        <h1 class="text-2xl">404</h1>
        <h1 class="text-xl">No agent found</h1>
    </div>
{/if}
