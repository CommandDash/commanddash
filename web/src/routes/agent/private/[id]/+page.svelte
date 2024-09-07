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
  $: isAgentValid = false;

  onMount(async () => {
    loading = true;
    const id: string = $page.params?.id;

    const agentResponse = await fetch(
      "https://stage.commanddash.dev/agent/get-latest-agent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: id, referrer: "" }),
      }
    );
    const _agentResponse = await agentResponse.json();
    if (!agentResponse.ok) {
      loading = false;
      errorMessage = _agentResponse.message;
      errorStatus = agentResponse.status;
    }
    currentAgentDetails = _agentResponse as Agent;

    const response = await fetch(
      "https://stage.commanddash.dev/agent/validate-access",
      {
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({
          agent_id: id,
          access_key: "fa7c921e-9fd2-47e1-ad00-d42c7e1e70f4",
        }),
      }
    );
    const _response = await response.json();
    if (!response.ok) {
      loading = false;
      errorMessage = _response.message;
      errorStatus = response.status;
    }
    loading = false;
    isAgentValid = _response.result;
    
  });
</script>

{#if isAgentValid}
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
    agentEnterprise={false}
  />
  {:else}

{/if}
{#if loading}
  <LoadingPage />
{:else if !loading && (!currentAgentDetails || !isAgentValid)}
  <div class="h-screen inline-flex justify-center items-center flex-col">
    <h1 class="text-2xl">{errorStatus}</h1>
    <h1 class="text-xl">{errorMessage}</h1>
  </div>
{/if}
