import type { Questionnaire } from "$lib/types/Questionnaires";
import { writable } from "svelte/store";

export const questionnaireStore = writable<Questionnaire>();