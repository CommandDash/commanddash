<script lang="ts">
    import { onMount } from "svelte";
    import { error as pageError } from "@sveltejs/kit";
    import { page } from "$app/stores";
    import appInsights from "$lib/utils/appInsights";

    import ChatWindow from "$lib/components/chat/ChatWindow.svelte";
    import { type Agent } from "$lib/types/Agent";
    import LoadingPage from "$lib/components/LoadingPage.svelte";

    let currentAgentDetails: Agent;
    let errorMessage: string = "Something went wrong";
    let agentDataSources: Array<any> = [];

    const limit: number = 10;

    $: loading = true;

    onMount(async () => {
        loading = true;
        const githubRef: string = $page.url.searchParams.get("github") || "";
        const npmRef: string = $page.url.searchParams.get("npm") || "";
        const pypiRef: string = $page.url.searchParams.get("pypi") || "";
        const pubRef: string = $page.url.searchParams.get("pub") || "";

        let referrer = "";
        let referrer_kind = "";

        if (githubRef) {
            referrer = githubRef;
            referrer_kind = "github";
        } else if (npmRef) {
            referrer = npmRef;
            referrer_kind = "npm";
        } else if (pypiRef) {
            referrer = pypiRef;
            referrer_kind = "pypi";
        } else if (pubRef) {
            referrer = pubRef;
            referrer_kind = "pub";
        } else {
            loading = false;
            errorMessage = "A source is required";
            appInsights.trackException({ error: new Error(errorMessage) }); // Track exception
            throw pageError(400, errorMessage);
        }

        appInsights.trackPageView({
            name: "AgentPage",
        });

        const response = await fetch(
            "http://127.0.0.1:5000/agent/get-latest-agent",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ referrer, referrer_kind }),
            },
        );

        const _response = await response.json();
        if (!response.ok) {
            loading = false;
            errorMessage = _response.message;
            appInsights.trackException({ error: new Error(_response.message) }); // Track exception
            throw pageError(response.status, _response.message);
        }

        currentAgentDetails = _response as Agent;
        agentDataSources = extractUris(currentAgentDetails?.data_sources)
        loading = false;
        // Track custom event for agent details loaded
        appInsights.trackEvent({
            name: "AgentDetailsLoaded",
            properties: {
                agentName: currentAgentDetails.name,
                agentVersion: currentAgentDetails.version,
                agentDisplayName: currentAgentDetails.metadata.display_name,
            },
        });
    });

    const extractUris = (
        data: { id: string; uri: { type: string; uri: string }[] }[],
    ): { type: string; uri: string }[] => {
        const result: { type: string; uri: string }[] = [];
        data.forEach((item) => {
            item.uri.forEach((uriItem) => {
                if (result.length < limit) {
                    result.push({
                        type: uriItem.type,
                        uri: uriItem.uri,
                    });
                } else {
                    return result;
                }
            });
        });
        return result;
    };

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
        agentDataSources={agentDataSources}
    />
{/if}

{#if loading}
    <LoadingPage />
{:else if !loading && !currentAgentDetails}
    <div class="h-screen inline-flex justify-center items-center flex-col">
        <h1 class="text-2xl">Error:</h1>
        <h1 class="text-xl">{errorMessage}</h1>
    </div>
{/if}