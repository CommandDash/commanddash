<script lang="ts">
    import { onMount } from "svelte";
    import { error as pageError } from "@sveltejs/kit";
    import { page } from "$app/stores";
    import appInsights from "$lib/utils/appInsights";
    import { validateURL } from "$lib/utils/validateURL";

    import ChatWindow from "$lib/components/chat/ChatWindow.svelte";
    import { type Agent } from "$lib/types/Agent";
    import LoadingPage from "$lib/components/LoadingPage.svelte";
    import { apiRequest } from "$lib/utils/authenticate";

    let currentAgentDetails: Agent;
    let errorMessage: string = "Something went wrong";
    let agentDataSources: Array<any> = [];
    let accessToken: string | null = "";

    const limit: number = 10;

    $: loading = true;

    onMount(async () => {
        loading = true;
        accessToken = localStorage.getItem("accessToken");

        const githubRef: string = $page.url.searchParams.get("github") || "";
        const npmRef: string = $page.url.searchParams.get("npm") || "";
        const pypiRef: string = $page.url.searchParams.get("pypi") || "";
        const pubRef: string = $page.url.searchParams.get("pub") || "";
        const passcode: string = $page.url.searchParams.get("passcode") || "";

        let referrer = "";
        let referrer_kind = "";

        if (githubRef) {
            referrer = githubRef;
            referrer_kind = "github";
        } else if (npmRef) {
            const { isValid, packageName } = validateURL(npmRef, "npm");
            if (!isValid) {
                loading = false;
                errorMessage = "Invalid NPM URL";
                appInsights.trackException({ error: new Error(errorMessage) }); // Track exception
                throw pageError(400, errorMessage);
            }
            referrer = packageName;
            referrer_kind = "npm";
        } else if (pypiRef) {
            const { isValid, packageName } = validateURL(pypiRef, "pypi");
            if (!isValid) {
                loading = false;
                errorMessage = "Invalid PyPI URL";
                appInsights.trackException({ error: new Error(errorMessage) }); // Track exception
                throw pageError(400, errorMessage);
            }
            referrer = packageName;
            referrer_kind = "pypi";
        } else if (pubRef) {
            const { isValid, packageName } = validateURL(pubRef, "pub");
            if (!isValid) {
                loading = false;
                errorMessage = "Invalid Pub URL";
                appInsights.trackException({ error: new Error(errorMessage) }); // Track exception
                throw pageError(400, errorMessage);
            }
            referrer = packageName;
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

        const headers = {
            "Content-Type": "application/json",
        };
        if (!!accessToken && accessToken.length > 0) {
            headers.Authorization = "Bearer " + accessToken;
        }

        const response = await apiRequest(
            "https://api.commanddash.dev/agent/get-latest-agent",
            {
                method: "POST",
                headers: headers,
                body: JSON.stringify({
                    referrer: referrer,
                    referrer_kind: referrer_kind,
                    passcode: passcode
                }),
            },
        );

        const _response = await response.json();
        
        if (!response.ok) {
            loading = false;
            errorMessage = _response.message;
            appInsights.trackException({ error: new Error(_response.message) }); // Track exception
            throw pageError(response.status, _response.message);
        }

        if (_response.passcode) {
    const currentUrl = new URL(window.location.href);
    const passcodeParam = `passcode=${_response.passcode}`;

    // Check if the passcode parameter already exists
    if (!currentUrl.searchParams.has('passcode')) {
        // Check if there are already query parameters
        if (currentUrl.search) {
            currentUrl.search += `&${passcodeParam}`;
        } else {
            currentUrl.search = `?${passcodeParam}`;
        }

        window.history.replaceState({}, "", currentUrl);
    }
}

        currentAgentDetails = _response as Agent;
        agentDataSources = extractUris(currentAgentDetails?.data_sources);
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
        {agentDataSources}
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
