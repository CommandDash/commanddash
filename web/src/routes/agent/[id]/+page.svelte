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
  let agentDataSources: Array<any> = [];
  let accessToken: string | null = "";

  const limit: number = 10;

  $: loading = true;

  onMount(async () => {
    loading = true;
    const id: string = $page.params?.id;
    const ref: string = $page.url.searchParams.get("github") || "";
    const private: string = $page.url.searchParams.get("private") || "";

    const response = await fetch(
      "https://stage.commanddash.dev/agent/get-latest-agent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: id, referrer: ref }),
      }
    );
    const _response = await response.json();
    if (!response.ok) {
      loading = false;
      errorMessage = _response.message;
      errorStatus = response.status;
      throw error(response.status, _response.message);
    }

    currentAgentDetails = _response as Agent;
    agentDataSources = extractUris(currentAgentDetails?.data_sources);
    loading = false;
    accessToken = localStorage.getItem("accessToken");
  });

  const getLatestAgent = (_private: boolean) => {
    if (_private) {
        
    }
  };

  async function apiRequest(url: string, options: RequestInit) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: "Bearer " + accessToken,
        },
      });

      if (response.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          // Retry the request with the refreshed token
          options.headers = {
            ...options.headers,
            Authorization: `Bearer ${accessToken}`, // use updated token
          };
          return await fetch(url, options);
        }
      }

      return response;
    } catch (error) {
      throw error;
    }
  }

  async function refreshAccessToken() {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      debugger;
      const response = await fetch(
        "https://stage.commanddash.dev/account/github/refresh",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${refreshToken}`,
          },
        }
      );
      const _response = await response.json();
      if (response.ok) {
        accessToken = _response.access_token;
        if (!!accessToken) {
          localStorage.setItem("accessToken", accessToken);
        }
        return true;
      } else {
        console.error("Failed to refresh token");
        return false;
      }
    } catch (error) {
      console.error("refreshAccessToken: error", error);
      return false;
    }
  }

  const extractUris = (
    data: { id: string; uri: { type: string; uri: string }[] }[]
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
    agentEnterprise={currentAgentDetails.enterprise}
  />
{/if}

{#if loading}
  <LoadingPage />
{:else if !loading && !currentAgentDetails}
  <div class="h-screen inline-flex justify-center items-center flex-col">
    <h1 class="text-2xl">{errorStatus}</h1>
    <h1 class="text-xl">{errorMessage}</h1>
  </div>
{/if}
