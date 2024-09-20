<script lang="ts">
  import { onMount } from "svelte";
  import { base } from "$app/paths";
  import { goto } from "$app/navigation";
  import { toastStore } from "$lib/stores/ToastStores";
  import { ToastType } from "$lib/types/Toast";
  import appInsights from "$lib/utils/appInsights";
  import CarbonGithub from "~icons/carbon/logo-github";
  import { validateURL } from "$lib/utils/validateURL";
  import IconInternet from "$lib/components/icons/IconInternet.svelte";
  import IconClose from "~icons/carbon/close";

  export let showModal: boolean;
  export let onClose: () => void;
  export let onPrivateAgent: () => void;

  let value: string = "";
  let selectedPlatform: string = "github";
  let accessToken: string = "";
  let refreshToken: string = "";
  let isRepoAccessible: boolean = true;

  const platforms = [
    {
      id: "github",
      icon: CarbonGithub,
      label: "GitHub",
      placeholder: "https://github.com/user/repo",
    },
    {
      id: "npm",
      icon: "npm.png",
      label: "NPM",
      placeholder: "https://www.npmjs.com/package/name",
    },
    {
      id: "pypi",
      icon: "python.png",
      label: "PyPI",
      placeholder: "https://pypi.org/project/name",
    },
    {
      id: "pub",
      icon: "icons8-dart-96.png",
      label: "Pub",
      placeholder: "https://pub.dev/packages/name",
    },
    { id: "custom", label: "Custom" },
  ];

  let soundEffect: HTMLAudioElement | null = null;

  if (typeof window !== "undefined") {
    // Preload the sound effect
    soundEffect = new Audio("whoosh.mp3");
    soundEffect.preload = "auto";
    soundEffect.volume = 0.5;

    // Preload the images
    platforms.forEach((platform) => {
      if (platform.id !== "github") {
        const img = new Image();
        img.src = platform.icon;
      }
    });
  }

  const onCreateAgent = async () => {
    value = value.trim();
    const { isValid } = validateURL(value, selectedPlatform);
    if (isValid) {
      // Play the sound effect
      soundEffect?.play();

      appInsights.trackEvent({
        name: "CreateAgentSubmitted",
        properties: { platform: selectedPlatform, url: value },
      });
      if (selectedPlatform === "github") {
        await validatingRepositoryAccess(value);
      } else {
        goto(`${base}/agent?${selectedPlatform}=${value}`);
      }
    } else {
      toastStore.set({
        message: `Please enter a valid ${selectedPlatform} URL`,
        type: ToastType.ERROR,
      });
    }
  };

  async function validatingRepositoryAccess(url: string) {
    try {
      const response = await getVerifyAccess(url);
      
      if (response.ok) {
        goto(`${base}/agent?${selectedPlatform}=${url}`);
      }

      if (response.status === 422 || response.status === 404) {
        isRepoAccessible = false;
      }
    } catch (error) {
      console.log("validatingRepositoryAccess: error", error);
    }
  }

  async function getVerifyAccess(_url: string) {
    if (accessToken?.length === 0 || accessToken === null || accessToken === undefined) {
      return await apiRequest(
        `https://stage.commanddash.dev/github/repo/verify-access?repo=${_url}`,
        {
          method: "GET",
        }
      );
    } else {
      return await apiRequest(
        `https://stage.commanddash.dev/github/repo/verify-access-auth?repo=${_url}`,
        {
          method: "GET",
          headers: {
            Authorization: "Bearer " + accessToken,
          },
        }
      )
    }
  }

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

  function adjustGithubPermissions() {
    openPopup(
      "https://github.com/apps/staging-commanddash/installations/select_target"
    );
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

  async function onSigninGithub() {
    try {
      const response = await fetch(
        "https://stage.commanddash.dev/account/github/url/web?override_uri=http://localhost:5173"
      );
      const _response = await response.json();

      if (response.ok) {
        const oauthWindow = window.open(_response.github_oauth_url, "_blank");

        const interval = setInterval(() => {
          try {
            if (oauthWindow?.location.origin === "http://localhost:5173") {
              const urlParams = new URLSearchParams(
                oauthWindow.location.search
              );
              accessToken = urlParams.get("access_token") ?? "";
              refreshToken = urlParams.get("refresh_token") ?? "";
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

  function getStorageData() {
    accessToken = localStorage.getItem("accessToken") ?? "";
    refreshToken = localStorage.getItem("refreshToken") ?? "";
  }

  $: if (showModal) {
    appInsights.trackEvent({ name: "CreateAgentDialogOpened" });
    getStorageData();
  }

  onMount(() => {
    // Fetch tokens from localStorage when the component mounts
    getStorageData();
  });

</script>

{#if showModal}
  <div
    class="fixed inset-0 z-20 flex items-center justify-center bg-black bg-opacity-50"
  >
    <div
      class="bg-gray-900 rounded-lg p-6 w-full max-w-md border border-gray-700"
    >
      <div class="flex justify-between items-center mb-4 relative">
        <h2 class="text-xl font-bold text-gray-100">Create Agent with URL</h2>
        <div class="absolute right-0 top-0">
          <button
            class="flex items-center px-2.5 py-1 text-sm text-white"
            on:click={onClose}
          >
            <IconClose class="mr-1.5 text-xl" />
          </button>
        </div>
      </div>

      <div class="flex flex-wrap justify-center gap-4 mb-6">
        {#each platforms as platform}
          <button
            on:click={() => (selectedPlatform = platform.id)}
            class="flex flex-col items-center focus:outline-none transition-all duration-200 ease-in-out"
            class:selected={selectedPlatform === platform.id}
          >
            <div class="relative">
              {#if platform.id === "github"}
                <svelte:component
                  this={platform.icon}
                  class="w-10 h-10 mb-1 text-black-600"
                />
              {:else if platform.id === "custom"}
                <button on:click={onPrivateAgent}>
                  <IconInternet classNames="w-11 h-11" />
                </button>
              {:else}
                <img
                  src={platform.icon}
                  alt={platform.label}
                  class="w-10 h-10 mb-1"
                />
              {/if}
            </div>
            <span class="text-xs text-gray-300">{platform.label}</span>
          </button>
        {/each}
      </div>

      <div class="relative mb-4">
        <div
          class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
        >
          {#if selectedPlatform === "github"}
            <CarbonGithub class="w-5 h-5 text-gray-400" />
          {:else}
            <img
              src={platforms.find((p) => p.id === selectedPlatform).icon}
              alt={selectedPlatform}
              class="w-5 h-5"
            />
          {/if}
        </div>
        <input
          type="url"
          bind:value
          placeholder={platforms.find((p) => p.id === selectedPlatform)
            .placeholder}
          class="w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-100 placeholder-gray-500"
        />
      </div>
      {#if !isRepoAccessible}
        <button
          class="inline-flex flex-row my-1 text-xs"
          on:click={adjustGithubPermissions}
        >
          <span class="text-white">Missing Git repository?</span><span
            class="text-blue-500 mx-1">Adjust Github App Permissions ➜</span
          >
        </button>
      {/if}
      {#if !isRepoAccessible && !accessToken}
        <button
          class="bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded inline-flex items-center justify-center w-full"
          on:click={onSigninGithub}
        >
          <CarbonGithub class="w-5 h-5 text-gray-400 mr-1.5" />
          Sign in with GitHub
        </button>
      {:else}
      <button
          on:click={onCreateAgent}
          class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors duration-200"
        >
          Submit
        </button>
      {/if}
    </div>
  </div>
{/if}

<style>
  .selected {
    transform: scale(1.1);
  }
  .selected span {
    color: #60a5fa; /* blue-400 */
    font-weight: bold;
  }
</style>
