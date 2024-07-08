<script lang="ts">
    import { onMount } from "svelte";
    import { page } from "$app/stores";

    import ChatWindow from "$lib/components/chat/ChatWindow.svelte";
    import { type Agent } from "$lib/types/Agent";

    let currentAgentDetails: Agent;
    $: loading = false;

    onMount(async () => {
        loading = true;
        const id: string = $page.params?.id;
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
            throw new Error(
                `Failed to load the agent: ${await response.json()}`,
            );
        }

        currentAgentDetails = await response.json() as Agent;
        loading = false;
    });
</script>

<ChatWindow 
{loading} 
agentName={currentAgentDetails?.name} 
agentPrivate={currentAgentDetails?.testing} 
agentVersion={currentAgentDetails?.version} 
agentDisplayName={currentAgentDetails?.metadata?.display_name}
agentDescription={currentAgentDetails?.metadata?.description}
agentLogo={currentAgentDetails?.metadata?.avatar_id} />
