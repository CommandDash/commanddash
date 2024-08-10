import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import Icons from "unplugin-icons/vite";

export default defineConfig({
	define: {
		'import.meta.env.VITE_INSTRUMENTATION_KEY': JSON.stringify(process.env.VITE_INSTRUMENTATION_KEY)
	},
	plugins: [sveltekit(), Icons({ compiler: "svelte" })]
});
