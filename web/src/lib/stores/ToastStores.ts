import type { ToastType } from "$lib/types/Toast";
import { writable } from "svelte/store";

interface Toast {
    message: string;
    type: ToastType
}

export const toastStore = writable<Toast | null>(null);
