<script lang="ts">
  import { onMount } from "svelte";
  import { fade, fly } from "svelte/transition";

  import { toastStore } from "$lib/stores/ToastStores";

  import CarbonGithub from "~icons/carbon/logo-github";
  import CarbonCode from "~icons/carbon/code";
  import CarbonWorld from "~icons/carbon/wikis";

  import IconInternet from "./icons/IconInternet.svelte";
  import { ToastType } from "$lib/types/Toast";
  import { apiRequest } from "$lib/utils/authenticate";
  import { goto } from "$app/navigation";

  type ActionData = {
    error: boolean;
    errors: {
      field: string | number;
      message: string;
    }[];
  } | null;

  export let showPrivateModal: boolean = false;
  export let onClose: () => void;

  let form: ActionData;
  let files: FileList | null = null;
  let urlType: string = "github";
  let url: string = "";
  let deleteExistingAvatar = true;
  let agentName: string = "";
  let agentAvatar: string = "";
  let agentDataSources: Array<{ uri: string; type: string, is_private: boolean }> = [];
  let agentIsPrivate: boolean = false;
  let isRepoAccessible: boolean = true;
  let accessToken: string | null = "Hi";
  let refreshToken: string | null = "Hi";
  let agentPurpose: string = "";
  let isLoading: boolean = false; // Add a reactive variable for loading state

  function resetErrors() {
    if (form) {
      form.errors = [];
      form.error = false;
    }
  }

  async function onSigninGithub() {
    try {
      const response = await fetch(
        "https://api.commanddash.dev/account/github/url/web?override_uri=https://app.commanddash.io"
      );
      const _response = await response.json();

      if (response.ok) {
        const oauthWindow = window.open(_response.github_oauth_url, "_blank");

        const interval = setInterval(() => {
          try {
            if (oauthWindow?.location.origin === "https://app.commanddash.io") {
              const urlParams = new URLSearchParams(
                oauthWindow.location.search
              );
              accessToken = urlParams.get("access_token");
              refreshToken = urlParams.get("refresh_token");
              if (accessToken && refreshToken) {
                localStorage.setItem("accessToken", accessToken);
                localStorage.setItem("refreshToken", refreshToken);
                // Close the OAuth window
                oauthWindow.close();
                // Clear the interval once the token is captured
                clearInterval(interval);
              }
            }
          } catch (error) {
            console.log("Waiting for OAuth completion...", error);
          }
        }, 1000);
      }
    } catch (error) {
      console.log("error", error);
    }
  }

  async function handleSubmitDataSources() {
    if (urlType === "github") {
      await validatingRepositoryAccess(url);
    } else {
      agentDataSources = [...agentDataSources, { uri: url, type: urlType, is_private: false }];
      url = "";
    }
  }

  async function validatingRepositoryAccess(_url: string) {
    const headers = {
      "Content-Type": "application/json",
    };
    if (accessToken) {
      headers.Authorization = "Bearer " + accessToken;
    }
    try {
      const response = await apiRequest(
        `https://api.commanddash.dev/github/repo/verify-access?repo=${_url}`,
        {
          method: "GET",
          headers: headers
        }
      );
      const _response = await response.json();

      if (response.ok) {
        agentDataSources = [...agentDataSources, { uri: _url, type: urlType, is_private: _response.private }];
        url = ""
      }

      if (response.status === 422 || response.status === 404) {
        isRepoAccessible = false;
      }
    } catch (error) {
      console.log("validatingRepositoryAccess: error", error);
    }
  }

  function openPopup(url: string) {
    const popup = window.open(
      url,
      "myWindow",
      "width=800,height=600,scrollbars=yes,resizable=yes"
    );

    if (!popup || popup.closed || typeof popup.closed === "undefined") {
      alert("Popup blocked! Please allow popups for this site.");
    }
  }

  function adjustGithubPermissions() {
    openPopup(
      "https://github.com/apps/commanddash/installations/select_target"
    );
  }

  async function handleSubmitAgentCreation() {
    const body = {
      name: agentName,
      metadata: {
        display_name: agentName,
        tags: [],
        description: agentPurpose
      },
      chat_mode: {
        system_prompt: agentPurpose,
      },
      is_private: agentDataSources.some(({is_private}) => is_private === true),
      data_sources: agentDataSources,
    };
    
    try {
      const response = await apiRequest(
        "https://api.commanddash.dev/agent/deploy-agent/web",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + accessToken,
          },
          body: JSON.stringify(body),
        }
      );
      const _response = await response.json();
      
      if (!response.ok) {
        toastStore.set({
          message: _response.message,
          type: ToastType.ERROR,
        });
        return;
      }
      onClose();
      isLoading = true; // Set loading state to true
      await new Promise(resolve => setTimeout(resolve, 2000)); // Add a 5-second delay
      isLoading = false; // Set loading state to false
      goto(`/agent/${_response.agent_id}`);
    } catch (error) {
      console.log("error", error);
    }
  }

  function onFilesChange(e: Event) {
    const inputEl = e.target as HTMLInputElement;
    if (inputEl.files?.length && inputEl.files[0].size > 0) {
      const file = inputEl.files[0];
      if (!inputEl.files[0].type.includes("image")) {
        inputEl.files = null;
        files = null;

        form = {
          error: true,
          errors: [{ field: "avatar", message: "Only images are allowed" }],
        };
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        agentAvatar = base64String;
      };
      reader.readAsDataURL(file);

      files = inputEl.files;
      resetErrors();
      deleteExistingAvatar = false;
    }
  }

  function getError(field: string, returnForm: ActionData) {
    return (
      returnForm?.errors.find((error) => error.field === field)?.message ?? ""
    );
  }

  function getStorageData() {
    accessToken = localStorage.getItem("accessToken");
    refreshToken = localStorage.getItem("refreshToken");
  }

  $: if (showPrivateModal) {
    getStorageData();
  }

  onMount(async () => {
    getStorageData();
  });
</script>

{#if showPrivateModal}
  <div
    class="fixed inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-sm dark:bg-black/50"
    in:fade
  >
    <dialog
      in:fly={{ y: 100 }}
      open
      class="h-[95dvh] w-[90dvw] overflow-hidden rounded-2xl border-gray-800/70 bg-gray-900 shadow-2xl outline-none sm:h-[85dvh] xl:w-[600px] 2xl:h-[75dvh]"
    >
      <div class="relative flex h-full flex-col overflow-y-auto p-4 md:p-8">
        <h2 class="text-xl font-semibold text-white">Create New Agent</h2>
        <p class="mb-6 text-sm text-gray-400">
          Create and share your own AI Code Agents.
        </p>
        {#if isLoading}
          <div class="flex items-center justify-center h-full">
            <p class="text-white text-lg">Creating agent...</p>
          </div>
        {:else}
          <div
            class="grid h-full w-full flex-1 grid-cols-1 gap-6 text-sm max-sm:grid-cols-1"
          >
            <div class="col-span-1 flex flex-col gap-4">
              <label>
                <div class="mb-1 font-semibold text-white">Name</div>
                <input
                  name="name"
                  class="w-full rounded-lg border-2 border-gray-200 bg-gray-100 p-2"
                  placeholder="Svelte Projects AI"
                  bind:value={agentName}
                />
                <p class="text-xs text-red-500">{getError("name", form)}</p>
              </label>

              <!-- New field for agent purpose -->
              <label>
                <div class="mb-1 font-semibold text-white">What will the agent do?</div>
                <input
                  name="purpose"
                  class="w-full rounded-lg border-2 border-gray-200 bg-gray-100 p-2"
                  placeholder="Answer questions or generate code for my svelte projects"
                  bind:value={agentPurpose}
                />
                <p class="text-xs text-red-500">{getError("purpose", form)}</p>
              </label>
              <div>
                <div class="mb-1 flex justify-between text-sm">
                  <span class="block font-semibold text-white">
                    Add Data Sources
                  </span>
                </div>
                <div class="flex flex-row">
                  <select
                    name="urlType"
                    class="border-2 border-gray-200 bg-gray-100 p-2 rounded mr-2 w-[50%] md:w-[20%]"
                    on:change={({ target }) => {
                      urlType = target?.value;
                    }}
                  >
                    <option value="github">Github</option>
                    <option value="deep_crawl_page">Website</option>
                    <option value="web_page">Webpage</option>
                    <option value="sitemap">Sitemap</option>
                  </select>
                  <input
                    autocorrect="off"
                    autocapitalize="none"
                    class="w-[50%] md:w-[80%] border text-gray-900 text-sm rounded focus:ring-blue-500 focus:border-blue-500 block p-2.5 bg-gray-100 border-gray-200 dark:placeholder-gray-400 dark:focus:ring-blue-500 dark:focus:border-blue-500"
                    name="url"
                    placeholder="URL"
                    type="url"
                    bind:value={url}
                  />
                </div>
                {#if !isRepoAccessible}
                  <button
                    class="inline-flex flex-row mt-1 text-xs"
                    on:click={adjustGithubPermissions}
                  >
                    <span class="text-white">Missing access to the repository.</span><span
                      class="text-blue-500 mx-1"
                      >Provide Github Permissions ➜</span
                    >
                  </button>
                {/if}
                <button
                  class="flex items-center justify-center w-full h-12 px-8 font-medium text-white transition-colors duration-150 ease-in-out bg-blue-800 rounded-md hover:bg-blue-700 space-x-2 shadow-lg mt-2"
                  on:click={handleSubmitDataSources}>Add Data Source</button
                >
              </div>
              <div class="mt-0">
                <span class="block font-semibold text-white"> Data Sources </span>
                {#each agentDataSources as sourceData}
                  <a
                    class="group flex h-10 flex-none items-center gap-2 pl-2 pr-2 text-sm hover:bg-gray-100 md:rounded-lg !bg-gray-100 !text-gray-800 mt-1"
                    target="_blank"
                    rel="noreferrer"
                    href={sourceData.uri}
                  >
                    <div class="truncate">
                      {sourceData.uri}
                    </div>
                    <div
                      class="ml-auto rounded-lg bg-black px-2 py-1.5 text-xs font-semibold leading-none text-white"
                    >
                      {#if sourceData.type === "github"}
                        <CarbonGithub />
                      {:else if sourceData.type === "web_page"}
                        <CarbonWorld />
                      {:else}
                        <CarbonCode />
                      {/if}
                    </div>
                  </a>
                {/each}
              </div>
              <div
                class="absolute bottom-6 flex w-full justify-end gap-2 md:right-0 md:w-fit mr-7"
              >
                {#if !!accessToken && !!refreshToken}
                  <button
                    class="flex items-center justify-center rounded-full bg-gray-200 px-5 py-2 font-semibold text-gray-600"
                    on:click={onClose}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    class="flex items-center justify-center rounded-full bg-blue-800 hover:bg-blue-700 px-8 py-2 font-semibold text-white"
                    on:click={handleSubmitAgentCreation}
                  >
                    Create
                  </button>
                {:else}
                  <button
                    class="bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded inline-flex items-center"
                    on:click={onSigninGithub}
                  >
                    <CarbonGithub class="w-5 h-5 text-gray-400 mr-1.5" />
                    Sign in with GitHub
                  </button>
                {/if}
              </div>
            </div>
          </div>
        {/if}
      </div>
    </dialog>
  </div>
{/if}