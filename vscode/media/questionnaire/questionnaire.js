class Questionnaire {
    constructor(json, ref) {
        this.json = json;
        this.ref = ref;

        this.container = document.createElement("div");
    }

    buildQuestionnaire() {
        const grid = document.getElementById("questionnaire-grid");
        
        let container = null;
        this.json.forEach(({ id, message, onclick, icon, isGradient }) => {
            container = document.createElement("div");
            container.id = id;
            container.classList.add("h-32", "max-w-full", "p-1", "cursor-pointer");

            const cardContainer = document.createElement("div");
            cardContainer.classList.add("h-32", "w-full", "rounded-lg", isGradient ? "questionnaire-card-gradient" : "questionnaire-card", "py-2", "px-3", "relative");
            cardContainer.addEventListener("click", () => onclick(this.ref));

            const _message = document.createElement("span");
            _message.classList.add("font-bold", "text-white");
            _message.textContent = message;

            const iconContainer = document.createElement("div");
            iconContainer.classList.add("absolute", "bottom-1", "right-1", "border", "border-black", "rounded-full", "p-1", "bg-white");
            iconContainer.innerHTML = icon;

            cardContainer.appendChild(_message);
            cardContainer.appendChild(iconContainer);
            container.appendChild(cardContainer);
            grid.appendChild(container);
        });
    }
}