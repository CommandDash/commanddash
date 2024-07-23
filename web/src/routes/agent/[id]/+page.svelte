<script lang="ts">
    import { onMount } from "svelte";
    import { error } from "@sveltejs/kit";
    import { page } from "$app/stores";

    import ChatWindow from "$lib/components/chat/ChatWindow.svelte";
    import { type Agent } from "$lib/types/Agent";
    import LoadingPage from "$lib/components/LoadingPage.svelte";

    let currentAgentDetails: Agent;
    let errorMessage: string = "Something went wrong";
    let errorStatus: number = 0;
    $: loading = true;

    onMount(async () => {
        loading = true;
        const id: string = $page.params?.id;
        const ref: string = $page.url.searchParams.get("github") || "";

        const response = await fetch(
            "https://api.commanddash.dev/agent/get-latest-agent",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ name: id, referrer: ref }),
            },
        );
        const _response = await response.json();
        if (!response.ok) {
            loading = false;
            errorMessage = _response.message;
            errorStatus = response.status;
            throw error(response.status, _response.message);
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
    />
{/if}

{#if loading}
    <LoadingPage />
{:else if !loading && !currentAgentDetails}
    <div
        class="h-screen inline-flex justify-center items-center flex-col"
    >
        <h1 class="text-2xl">{errorStatus}</h1>
        <h1 class="text-xl">{errorMessage}</h1>
    </div>
{/if}
