import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import Icons from "unplugin-icons/vite";
import dotenv from 'dotenv';

// Load environment variables from .env file only in development
// Github actions work without dotenv
if (process.env.NODE_ENV !== 'production') {
	dotenv.config();
  }

export default defineConfig({
	define: {
		'import.meta.env.VITE_INSTRUMENTATION_KEY': JSON.stringify(process.env.VITE_INSTRUMENTATION_KEY)
	},
	plugins: [sveltekit(), Icons({ compiler: "svelte" })]
});
