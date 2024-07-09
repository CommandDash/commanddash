<script lang="ts">
    import "../styles/main.css";
    import {onMount} from "svelte";
    import { browser } from "$app/environment";

    onMount(() => {
        if (browser) {
            window.document.documentElement.classList.add('dark')
        }
    })
</script>

<div class="grid h-full w-screen grid-cols-1 grid-rows-[1fr] overflow-hidden text-smd dark:text-gray-300">
    <!--TODO: Uncomment the nav menu -->
    <!-- <nav
        class="grid max-h-screen grid-cols-1 grid-rows-[auto,1fr,auto] overflow-hidden *:w-[280px] max-md:hidden"
    >
        <NavMenu />
    </nav> -->
    <slot />
</div>
