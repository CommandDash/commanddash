<script lang="ts">
    import "../styles/main.css";
    import { onDestroy, onMount } from "svelte";
    import { browser } from "$app/environment";
    import NavMenu from "$lib/components/NavMenu.svelte";
    import MobileNav from "$lib/components/MobileNav.svelte";
    import ExpandNavigation from "$lib/components/ExpandNavigation.svelte";
    import Toast from "$lib/components/Toast.svelte";
    import { ToastType } from "$lib/types/Toast";
    import { toastStore } from "$lib/stores/ToastStores";

    let isNavCollapsed = true;
    let isNavOpen = false;
    let toastMessage: string | null = null;
    let toastType: ToastType | null = null;
    let toastTimeout: ReturnType<typeof setTimeout>;

    const unsubscribe = toastStore.subscribe((value) => {
        if (value) {
            toastMessage = value.message;
            toastType = value.type;

            if (toastTimeout) {
                clearTimeout(toastTimeout);
            }

            toastTimeout = setTimeout(() => {
                toastMessage = null;
                toastType = null;
            }, 3000);
        } else {
            toastMessage = null;
            toastType = null;
        }
    });

    onMount(() => {
        if (browser) {
            window.document.documentElement.classList.add("dark");
        }
    });

    onDestroy(() => {
        unsubscribe();
    });
</script>

<!--TODO: Uncomment the nav menu -->
<!-- <ExpandNavigation
    isCollapsed={isNavCollapsed}
    on:click={() => (isNavCollapsed = !isNavCollapsed)}
    classNames="absolute z-10 my-auto {!isNavCollapsed
        ? 'left-[280px]'
        : 'left-0'} *:transition-transform"
/> -->

<!-- <div
    class="grid h-full w-screen grid-cols-1 grid-rows-[auto,1fr] overflow-hidden text-smd {!isNavCollapsed
        ? 'md:grid-cols-[280px,1fr]'
        : 'md:grid-cols-[0px,1fr]'} transition-[300ms] [transition-property:grid-template-columns] md:grid-rows-[1fr] dark:text-gray-300"
> -->
    <!-- <MobileNav
        title="CommandDash"
        isOpen={isNavOpen}
        on:toggle={(ev) => (isNavOpen = ev.detail)}
    >
        <NavMenu />
    </MobileNav> -->

    <!-- <nav
        class=" grid max-h-screen grid-cols-1 grid-rows-[auto,1fr,auto] overflow-hidden *:w-[280px] max-md:hidden"
    >
        <NavMenu />
    </nav> -->
    {#if toastMessage}
        <Toast message={toastMessage} {toastType} />
    {/if}
    <div class="grid h-full w-screen grid-cols-1 grid-rows-[1fr] overflow-hidden text-smd dark:text-gray-300">
        <slot />
    </div>
<!-- </div> -->
