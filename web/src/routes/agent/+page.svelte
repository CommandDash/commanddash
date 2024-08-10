<script lang="ts">
    import { onMount } from "svelte";
    import { error as pageError } from "@sveltejs/kit";
    import { page } from "$app/stores";

    import ChatWindow from "$lib/components/chat/ChatWindow.svelte";
    import { type Agent } from "$lib/types/Agent";
    import LoadingPage from "$lib/components/LoadingPage.svelte";

    let currentAgentDetails: Agent;
    let errorMessage: string = "Something went wrong";
    $: loading = true;

    onMount(async () => {
        loading = true;
        const ref: string = $page.url.searchParams.get("github") || "";

        const response = await fetch(
            "https://api.commanddash.dev/agent/get-latest-agent",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ referrer: ref }),
            },
        );

        const _response = await response.json();
        if (!response.ok) {
            loading = false;
            errorMessage = _response.message;
            throw pageError(response.status, _response.message);
        }

        currentAgentDetails = _response as Agent;
        loading = false;
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
        agentIsDataSourceIndexed={currentAgentDetails.data_sources_indexed}
        agentId={currentAgentDetails?.name}
    />
{/if}

{#if loading}
    <LoadingPage />
{:else if !loading && !currentAgentDetails}
    <div
        class="h-screen inline-flex justify-center items-center flex-col"
    >
        <h1 class="text-2xl">Error:</h1>
        <h1 class="text-xl">{errorMessage}</h1>
    </div>
{/if}
