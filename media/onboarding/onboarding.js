
//initialising elements
const googleApiKeyTextInput = document.getElementById("google-api-key-text-input");
const validationList = document.getElementById("validation-list");
const bodyContainer = document.getElementById("body-container");
const bottomContainer = document.getElementById("bottom-container");

let isApiKeyValid = false;
let areDependenciesInstalled = false;

(function () {
    //initialising vscode library
    const vscode = acquireVsCodeApi();

    //reading vscode triggered messages to webview
    readTriggeredMessage();

    googleApiKeyTextInput.addEventListener("input", (event) => {
        const apiKey = event.target.value;
        validateApiKey(apiKey);
    });

    function validateApiKey(apiKey) {
        if (isValidGeminiApiKey(apiKey)) {
            vscode.postMessage({
                type: "validate",
                value: apiKey,
            });
        } else {
            console.log('not valid api key');
        }
    }

    function isValidGeminiApiKey(apiKey) {
        // Regex pattern for a Google Gemini API key
        const apiKeyPattern = /^[a-zA-Z0-9-_]+$/;

        // Check if the API key matches the pattern
        return apiKeyPattern.test(apiKey);
    }
})();

function readTriggeredMessage() {
    window.addEventListener("message", (event) => {
        const message = event.data;
        switch (message.type) {
            case "apiKeyValidation":
            case "dependencyValidation":
                updateValidationList(message);
                break;
        }
    });
}

function updateValidationList(message) {
    const existingListItem = document.querySelector(`li[data-type="${message.type}"]`);

    if (existingListItem) {
        existingListItem.textContent = message.value;
    } else {
        const listItem = document.createElement('li');
        listItem.textContent = message.value;
        listItem.setAttribute('data-type', message.type);
        validationList.appendChild(listItem);
    }

    // Check for specific messages to update flags
    switch (message.type) {
        case "apiKeyValidation":
            isApiKeyValid = message.value === "Gemini API Key is valid";
            break;
        case "dependencyValidation":
            areDependenciesInstalled = message.value === "All dependencies are installed";
            break;
    }

    // Check if both conditions are met, add "All permissions look good"
    if (isApiKeyValid && areDependenciesInstalled) {
        const permissionsListItem = document.querySelector(`li[data-type="permissionsValidation"]`);

        if (!permissionsListItem) {
            const permissionsItem = document.createElement('li');
            permissionsItem.textContent = "All permissions looks good";
            permissionsItem.setAttribute('data-type', 'permissionsValidation');
            validationList.appendChild(permissionsItem);
            bodyContainer.classList.add("flex", "flex-col");
            bottomContainer.classList.remove("hidden");
            bottomContainer.classList.add("flex");
        }
    } else {
        // Remove "All permissions look good" item if conditions are not met
        const permissionsListItem = document.querySelector(`li[data-type="permissionsValidation"]`);
        if (permissionsListItem) {
            validationList.removeChild(permissionsListItem);
            bodyContainer.classList.remove("flex", "flex-col");
            bottomContainer.classList.add("hidden");
            bottomContainer.classList.remove("flex");

        }
    }
}


