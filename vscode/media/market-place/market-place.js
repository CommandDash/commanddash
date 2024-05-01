const userIcon =
    `<svg width="15" height="14" viewBox="0 0 15 14" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M7.48514 7.55446C8.98514 7.55446 10.1881 6.41783 10.1881 5.03169C10.1881 3.64555 8.98514 2.49506 7.48514 2.49506C5.98514 2.49506 4.78217 3.63169 4.78217 5.01783C4.78217 6.40397 5.98514 7.55446 7.48514 7.55446ZM7.48514 3.1604C8.58415 3.1604 9.47524 3.99209 9.47524 5.01783C9.47524 6.04357 8.58415 6.87525 7.48514 6.87525C6.38613 6.87525 5.49504 6.05743 5.49504 5.03169C5.49504 4.00595 6.38613 3.1604 7.48514 3.1604ZM2.79207 11.505H12.2079C12.401 11.505 12.5644 11.3525 12.5644 11.1723C12.5644 9.42575 11.0346 7.99803 9.16336 7.99803H5.83663C3.96534 7.99803 2.43564 9.42575 2.43564 11.1723C2.43564 11.3525 2.599 11.505 2.79207 11.505ZM5.83663 8.66337H9.16336C10.5297 8.66337 11.6436 9.60595 11.8218 10.8396H3.17821C3.35643 9.60595 4.47029 8.66337 5.83663 8.66337Z" fill="white"/>
</svg>`;

const downloadIcon =
    `<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M5.10151 8.53455C4.97826 8.65536 4.97627 8.85319 5.09705 8.97644L7.27905 11.1584C7.33757 11.2172 7.41711 11.2501 7.5 11.25C7.58289 11.2501 7.66239 11.2172 7.72095 11.1584L9.90295 8.97644C10.022 8.85494 10.022 8.66055 9.90295 8.53905C9.78214 8.41579 9.58431 8.41377 9.46106 8.53455L7.8125 10.1831V1.5625C7.8125 1.38992 7.67258 1.25 7.5 1.25C7.32742 1.25 7.1875 1.38992 7.1875 1.5625V10.1831L5.5389 8.53455C5.41744 8.41549 5.22301 8.41549 5.10151 8.53455ZM11.25 5.625H10.3125C10.1399 5.625 10 5.76492 10 5.9375C10 6.11008 10.1399 6.25 10.3125 6.25H11.25C11.94 6.25088 12.4991 6.81 12.5 7.5V11.875C12.4991 12.565 11.94 13.1241 11.25 13.125H3.75C3.06 13.1241 2.50088 12.565 2.5 11.875V7.5C2.50088 6.81 3.06 6.25088 3.75 6.25H5.3125C5.48508 6.25 5.625 6.11008 5.625 5.9375C5.625 5.76492 5.48508 5.625 5.3125 5.625H3.75C2.71492 5.62614 1.87614 6.46492 1.875 7.5V11.875C1.87614 12.9101 2.71492 13.7489 3.75 13.75H11.25C12.2851 13.7489 13.1239 12.9101 13.125 11.875V7.5C13.1239 6.46492 12.2851 5.62614 11.25 5.625Z" fill="white"/>
</svg>`;

let vscode = null;

const marketPlaceListContainer = document.getElementById("market-place-list-container");
const loadingContainer = document.getElementById("loading-container");
const bodyContainer = document.getElementById("body-container");
const backButton = document.getElementById("back-button");

// Storing agents list
let agents = [];

let storedAgents = null;

(function () {
    vscode = acquireVsCodeApi();

    setLoading(true);

    registerMessage();

    vscode.postMessage({type: "fetchAgents"});
})();

function setLoading(isLoading) {
    if (isLoading) {
        bodyContainer.classList.add("hidden");
        loadingContainer.classList.remove("hidden");
        loadingContainer.classList.add("flex");
    } else {
        bodyContainer.classList.remove("hidden");
        loadingContainer.classList.add("hidden");
        loadingContainer.classList.remove("flex");
    }
}

function handleInstall(agent) {
    const isInstalled = isAgentInstalled(agent.name);
    if (isInstalled) {
        if (agent) {
            vscode.postMessage({type: "uninstallAgents", value: JSON.stringify(agent)});
        }
    } else {
        vscode.postMessage({type: "installAgents", value: JSON.stringify(agent)});
    }
}

function isAgentInstalled(agentName) {
    const storedAgents = getStoredAgents();
    return storedAgents.agentsList.includes(`@${agentName}`);
}

function updateInstallButton(agentOrList, buttonText) {
    const installButtons = document.querySelectorAll(".install-button");
    const agentNames = Array.isArray(agentOrList) ? agentOrList.map(agent => agent) : [agentOrList.name];
    
    installButtons.forEach(button => {
        if (agentNames.includes(button.dataset.name)) {
            button.textContent = buttonText;
        } else {
            button.textContent = "Install";
        }
    });
}

function getStoredAgents() {
    const _storedAgents = storedAgents ? storedAgents : {agents: {}, agentsList: []};
    return _storedAgents;
}

function parseAgents(agents) {
    if (agents) {
        const _agents = JSON.parse(agents);
        return _agents;
    }

    return {agents: {}, agentsList: []};
}

function renderAgentsList(_agents) {
    _agents.forEach(agent => {
        // Create li element
        const li = document.createElement("li");
        li.className = "py-3 sm:py-4 market-place-list-background mt-2 px-2";

        // Create div element
        const div = document.createElement("div");
        div.className = "flex items-center space-x-4 rtl:space-x-reverse";

        // Create inner elements
        const innerDiv = document.createElement("div");
        innerDiv.className = "flex-1 min-w-0";

        const p = document.createElement("p");
        p.className = "text-sm font-semi-bold truncate text-[#497BEF]";
        p.innerHTML = `@${agent.name} ${agent.testing ? `<span class="text-xs text-white mx-2 border border-white px-2 py-[1px] rounded-md">test</span>` : ""}`;

        const installSpan = document.createElement("span");
        installSpan.textContent = agent.installs;

        const installContainer = document.createElement("div");
        installContainer.className = "inline-flex items-center";
        installContainer.innerHTML = downloadIcon;
        installContainer.appendChild(installSpan);

        const topDiv = document.createElement("div");
        topDiv.className = "inline-flex flex-row justify-between w-full";
        topDiv.appendChild(p);
        topDiv.appendChild(installContainer);

        const pDescription = document.createElement("p");
        pDescription.className = "text-sm truncate text-gray-500 my-1";
        pDescription.textContent = agent.description;

        const ul = document.createElement("ul");
        ul.className = "max-w-md divide-y divide-gray-200";

        agent.commands.forEach(command => {
            const liCommand = document.createElement("li");
            liCommand.className = "text-pink-500";
            liCommand.textContent = `/${command}`;
            ul.appendChild(liCommand);
        });

        const divRow = document.createElement("div");
        divRow.className = "inline-flex flex-row items-center w-full justify-between";

        const divRowInner = document.createElement("div");
        divRowInner.className = "inline-flex flex-row";

        const spanAuthor = document.createElement("span");
        spanAuthor.className = "text-xs text-gray-500 px-1";
        spanAuthor.textContent = agent.author.name;

        const divAuthor = document.createElement("div");
        divAuthor.className = "inline-flex flex-row items-center w-full justify-between";
        divAuthor.innerHTML = userIcon;
        divAuthor.appendChild(spanAuthor);

        divRowInner.appendChild(divAuthor);
        divRow.appendChild(divRowInner);

        innerDiv.appendChild(topDiv);
        innerDiv.appendChild(pDescription);
        innerDiv.appendChild(ul);
        innerDiv.appendChild(divRow);

        // Create install button element
        const installButton = document.createElement("button");
        installButton.className = "inline-flex items-center text-xs font-semibold text-white bg-[#497BEF] px-2 py-[1.5px] rounded-sm install-button";
        installButton.textContent = isAgentInstalled(agent.name) ? "Uninstall" : "Install";
        installButton.dataset.name = `@${agent.name}`;
        installButton.addEventListener("click", () => handleInstall(agent));

        // Append elements to div
        div.appendChild(innerDiv);
        div.appendChild(installButton);

        // Append div to li
        li.appendChild(div);

        // Append li to container
        marketPlaceListContainer.appendChild(li);
    });

    vscode.postMessage({type: "getInstallAgents"});
    setLoading(false);
}

function registerMessage() {
    window.addEventListener("message", (event) => {
        const message = event.data;
        switch (message.type) {
            case "getStoredAgents":
                const _agents = parseAgents(message.value.agents);
                storedAgents = {..._agents};
                updateInstallButton(_agents?.agentsList, message.value.buttonMessage);
                break;
            case "fetchedAgents":
                const _fetchedAgents = parseAgents(message.value);
                agents = _fetchedAgents;
                renderAgentsList(agents);
                break;
        }
    });
}
