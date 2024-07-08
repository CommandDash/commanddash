<script lang="ts">
    import { onMount } from "svelte";
    import { page } from "$app/stores";
	import { base } from "$app/paths";
    import {env as envPublic} from "$env/dynamic/public";

    import ChatWindow from "$lib/components/chat/ChatWindow.svelte";
</script>

<svelte:head>
    <title>Commanddash</title>
</svelte:head>

<ChatWindow />
