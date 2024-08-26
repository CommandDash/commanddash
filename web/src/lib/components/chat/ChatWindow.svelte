<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import Icon from "@iconify/svelte";

  import type { Questionnaire } from "$lib/types/Questionnaires";
  import { goto } from "$app/navigation";
  import appInsights from "$lib/utils/appInsights";
  import { questionnaireStore } from "$lib/stores/QuestionnaireStores";
  import { toastStore } from "$lib/stores/ToastStores";
  import { ToastType } from "$lib/types/Toast";
  import type { Message } from "$lib/types/Message";

  import ChatInput from "./ChatInput.svelte";
  import ChatIntroduction from "./ChatIntroduction.svelte";
  import ChatMessage from "./ChatMessage.svelte";

  import CarbonSendAltFilled from "~icons/carbon/send-alt-filled";
  import CarbonHome from "~icons/carbon/home";

  export let messages: Message[] = [];
  export let loading = false;
  export let agentName: string = "dash";
  export let agentDisplayName: string = "Dash";
  export let agentId: string = "";
  export let agentDescription: string = "Default Agent Dash";
  export let agentLogo: string = "";
  export let agentVersion: string = "1.0.3";
  export let agentPrivate: boolean = false;
  export let agentIsDataSourceIndexed: boolean = true;
  export let agentDataSources: Array<any> = [];

  let agentReferences: Array<any> = [];
  let emailValue: string = "";
  let messageLoading: boolean = false;
  let message: string = "";
  let LottiePlayer: any;

  onMount(async () => {
    const module = await import("@lottiefiles/svelte-lottie-player");
    LottiePlayer = module.LottiePlayer;

    questionnaireStore.subscribe((questionnaire: Questionnaire) => {
      switch (questionnaire?.id) {
        case "generate-summary":
          message = `Please give me a complete summary about ${agentDisplayName}`;
          handleSubmit();
          break;
        case "ask-about":
          message =
            "Help me understand (x) feature in detail with helpful links to read more about it";
          break;
        case "search-code":
          message =
            "Where can I find the code that does (y). Please help me with links to it";
          break;
        case "get-help":
          message =
            "Help me resolve the (z) problem I'm facing. Here is some helpful code: (code)";
          break;
      }
    });
  });

  onDestroy(() => {
    message = "";
    questionnaireStore.set({ id: "", message: "" });
  });

  const onHome = () => {
    message = "";
    goto("/");
    appInsights.trackEvent({ name: "NavigateHome" });
  };

  const handleSubmit = async () => {
    if (messageLoading || loading) {
      return;
    }
    messageLoading = true;

    messages = [...messages, { role: "user", text: message }];

    const agentData = {
      agent_name: agentName,
      agent_version: agentVersion,
      chat_history: messages,
      included_references: agentReferences,
      private: agentPrivate,
    };

    message = "";

    try {
      const response = await fetch(
        "https://api.commanddash.dev/v2/ai/agent/answer",
        {
          method: "POST",
          body: JSON.stringify(agentData),
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const modelResponse = await response.json();
      console.log("model response", modelResponse);
      messages = [
        ...messages,
        {
          role: "model",
          text: modelResponse.response,
          references: modelResponse.references,
        },
      ];
      agentReferences = modelResponse?.references;
      appInsights.trackEvent({
        name: "MessageSent",
        properties: {
          agentName,
          agentVersion,
        },
      });
    } catch (error) {
      console.log("error", error);
    }

    messageLoading = false;
  };

  const notify = async () => {
    const data = {
      name: agentId,
      recipient_mail: emailValue,
      notify_for: "data_index",
    };
    try {
      const response = await fetch("https://api.commanddash.dev/agent/notify", {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const _response = await response.json();

      if (!response.ok) {
        toastStore.set({
          message: _response.message,
          type: ToastType.ERROR,
        });
        appInsights.trackException({
          error: new Error(_response.message),
        }); // Track exception
        return;
      }

      toastStore.set({
        message: "Notification sent successfully",
        type: ToastType.SUCCESS,
      });

      // Track custom event for notification sent
      appInsights.trackEvent({
        name: "NotificationSent",
        properties: {
          agentId,
          emailValue,
        },
      });
    } catch (error) {
      console.log("error", error);
      toastStore.set({
        message: "Ops! Something went wrong",
        type: ToastType.ERROR,
      });
      appInsights.trackException({ error: new Error(`${error}`) }); // Track exception
    }
  };
</script>

<div class="relative min-h-0 min-w-0 h-screen">
  <div class="mx-3 my-3.5">
    <button on:click={onHome}><CarbonHome class="text-lg" /></button>
  </div>
  <div class="scrollbar-custom mr-1 h-full overflow-y-auto">
    <div
      class="mx-auto flex h-full max-w-5xl flex-col gap-6 px-5 pt-4 sm:gap-8 xl:max-w-5xl xl:pt-7"
    >
      <div class="flex h-max flex-col gap-6 pb-40 2xl:gap-7">
        {#if messages.length > 0}
          {#if !loading}
            <ChatMessage {messages} {agentLogo} {agentDisplayName} />
            {#if messageLoading}
              {#if LottiePlayer}
                <div class="flex-col w-full h-48 px-2 py-3">
                  <div class="inline-flex flex-row items-end px-2">
                    <span id="workspace-loader-text">Preparing results</span>
                    <div class="typing-loader mx-2"></div>
                  </div>
                </div>
              {/if}
            {/if}
          {:else if loading}
            {#if LottiePlayer}
              <LottiePlayer
                src="/lottie/loading-animation.json"
                autoplay={true}
                loop={true}
                height={100}
                width={100}
              />
            {/if}
          {/if}
        {:else}
          <ChatIntroduction
            {agentDescription}
            {agentDisplayName}
            {agentLogo}
            {agentIsDataSourceIndexed}
            {agentId}
            {agentDataSources}
          />
        {/if}
      </div>
    </div>
  </div>
  <div
    class="dark:via-gray-80 pointer-events-none absolute inset-x-0 bottom-0 z-0 mx-auto flex w-full max-w-5xl flex-col items-center justify-center bg-gradient-to-t from-white via-white/80 to-white/0 px-3.5 py-4 max-md:border-t max-md:bg-white sm:px-5 md:py-8 xl:max-w-5xl dark:border-gray-800 dark:from-gray-900 dark:to-gray-900/0 max-md:dark:bg-gray-900 [&>*]:pointer-events-auto"
  >
    <div class="w-full">
      {#if agentIsDataSourceIndexed}
        <form
          tabindex="-1"
          class="relative flex w-full max-w-5xl flex-1 items-center rounded border bg-gray-100 focus-within:border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:focus-within:border-gray-500"
          on:submit|preventDefault={handleSubmit}
        >
          <div class="flex w-full flex-1 border-none bg-transparent">
            <ChatInput
              placeholder="Ask anything"
              maxRows={6}
              on:submit={handleSubmit}
              bind:value={message}
              disabled={!agentIsDataSourceIndexed}
            />
            <button
              class="btn mx-1 my-1 h-[2.4rem] self-end rounded bg-transparent p-1 px-[0.7rem] text-gray-400 disabled:cursor-not-allowed enabled:cursor-pointer disabled:opacity-60 enabled:hover:text-gray-700 dark:disabled:opacity-40 enabled:dark:hover:text-gray-100"
              type="submit"
              disabled={!agentIsDataSourceIndexed}
            >
              <CarbonSendAltFilled />
            </button>
          </div>
        </form>
      {:else}
        <div class="overflow-hidden rounded-xl border dark:border-gray-800">
          <div class="flex p-3">
            <div
              class="flex items-center gap-1.5 font-semibold max-sm:text-smd"
            >
              We're experiencing high usage due to Product Hunt Launch. We will notify you once agent is ready to use.
            </div>
            <p
              class="btn ml-auto flex self-start rounded-full bg-gray-100 p-1 text-xs hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-600"
            >
              <Icon icon="material-symbols:info" width="24px" height="24px" />
            </p>
          </div>
          <div class="flex w-full flex-1 px-3 pb-3">
            <input
              bind:value={emailValue}
              autocomplete="email"
              autocorrect="off"
              autocapitalize="none"
              class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              name="email"
              placeholder="Please leave your email address"
              type="text"
            />
            <button
              on:click={notify}
              class="flex items-center justify-center w-full md:w-auto h-12 px-8 mx-2 font-medium text-white transition-colors duration-150 ease-in-out bg-blue-800 rounded-md hover:bg-blue-700 space-x-2 shadow-lg"
              >Notify</button
            >
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  li::marker {
    color: white;
  }

  .typing-loader {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    animation: loading 1s linear infinite alternate;
    margin-bottom: 4px;
  }

  @keyframes loading {
    0% {
      background-color: #0e70c0;
      box-shadow:
        8px 0px 0px 0px #d4d4d4,
        16px 0px 0px 0px #d4d4d4;
    }

    25% {
      background-color: #d4d4d4;
      box-shadow:
        8px 0px 0px 0px #0e70c0,
        16px 0px 0px 0px #d4d4d4;
    }

    75% {
      background-color: #d4d4d4;
      box-shadow:
        8px 0px 0px 0px #d4d4d4,
        16px 0px 0px 0px #0e70c0;
    }
  }
</style>
