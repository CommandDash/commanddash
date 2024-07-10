<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";

    import ChatWindow from "$lib/components/chat/ChatWindow.svelte";

    onMount(() => {
        goto('agent/dash');
    });
</script>

<svelte:head>
    <title>Commanddash</title>
</svelte:head>

<ChatWindow />
