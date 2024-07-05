<script lang="ts">
    import {env as envPublic} from "$env/dynamic/public"

    const questionnaires: Array<{id: string, message: string, icon: {svg: string}}> = [
        {
            id: "explore-marketplace",
            message: "Explore marketplace",
            icon: {
                svg: `<svg width="20px" height="20px" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" version="1.1" fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="m10.25 8c0 3.25 4 3.25 4 0 0-3.45178-2.7982-6.25-6.25-6.25-3.45178 0-6.25 2.79822-6.25 6.25s2.79822 6.25 6.25 6.25c2.25 0 3.25-1 3.25-1"/><circle cx="8" cy="8" r="2.25"/></svg>`,
            }
        },
        {
            id: "commanddash-questionaire",
            message: "What can CommandDash do?",
            icon: {
                svg: `<svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 14C12 14 12 13.3223 12 12.5C12 11.6777 15.5 11.5 15.5 9C15.5 7.5 14 6.5 12 6.5C10.5 6.5 9 7.5 9 9" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M13.2271 16.9535C13.2271 17.6313 12.6777 18.1807 11.9999 18.1807C11.3221 18.1807 10.7726 17.6313 10.7726 16.9535C10.7726 16.2757 11.3221 15.7262 11.9999 15.7262C12.6777 15.7262 13.2271 16.2757 13.2271 16.9535Z" fill="#000000"/></svg>`,
            }
        },
        {
            id: "attach-code",
            message: "How to attach code snippets",
            icon: {
                svg: `<svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17 17L22 12L17 7M7 7L2 12L7 17M14 3L10 21" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
            }
        },
        {
            id: "create-agents",
            message: "Can I create my own agents?",
            icon: {
                svg: "",
            }
        }
    ];
</script>

<div class="my-auto grid gap-8 lg:grid-cols-3">
    <div class="lg:col-span-1">
        <div>
            <div class="mb-3 flex items-center text-2xl font-semibold">
				{envPublic.PUBLIC_APP_NAME}
			</div>
            <p class="text-base text-gray-600 dark:text-gray-400">
                AI-First (docs) in your users IDE
            </p>
        </div>
    </div>
    <div class="lg:col-span-3 lg:mt-6">
        <p class="mb-3 text-gray-600 dark:text-gray-300">Use case</p>
        <div class="grid gap-3 lg:grid-cols-2 lg:gap-5">
            {#each questionnaires as questionnaire}
                <button class={`relative rounded-xl border ${questionnaire.id === "explore-marketplace" ? 'bg-[#497BEF] text-gray-300 border-[#497BEF] hover:bg-[#287CEB] hover:border-[#287CEB]' : 'bg-gray-50 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 text-gray-600 hover:bg-gray-100'} p-3 max-xl:text-sm xl:p-3.5`}>
                    {questionnaire.message}
                    <div class="absolute mx-2 my-1 bottom-0 right-0 bg-white p-1 rounded-full">
                        {@html questionnaire.icon.svg}
                    </div>
                </button>
            {/each}
        </div>
    </div>

</div>