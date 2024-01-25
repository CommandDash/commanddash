//declaring svg icons
const copyIcon = `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
<path clip-rule="evenodd" d="M6 6L7.5 4.5H15.621L21 9.879V21L19.5 22.5H7.5L6 21V6ZM19.5 10.5L15 6H7.5V21H19.5V10.5Z" />
<path clip-rule="evenodd" d="M4.5 1.5L3 3V18L4.5 19.5V3H14.121L12.621 1.5H4.5Z" />
</svg>
`;

const mergeIcon = `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
<path clip-rule="evenodd" d="M21 1.5L22.5 3V9L21 10.5H9L7.5 9V3L9 1.5H21ZM21 3H9V9H21V3Z" />
<path clip-rule="evenodd" d="M21 13.5L22.5 15V21L21 22.5H9L7.5 21V15L9 13.5H21ZM21 15H9V21H21V15Z" />
<path d="M1.5 9.5889L3.92121 12.0101L1.5 14.4313L2.54028 15.471L6 12.0101L2.54028 8.5498L1.5 9.5889Z" />
</svg>
`;

//getting vscode theme
const activityBarBackground = getComputedStyle(document.documentElement).getPropertyValue("--vscode-activityBar-background");
const activityBarForeground = getComputedStyle(document.documentElement).getPropertyValue("--vscode-activityBar-foreground");

//initialising elements
const googleApiKeyTextInput = document.getElementById("google-api-key-text-input");
const googleApiKeyHeader = document.getElementById("google-api-key-header");
const validationList = document.getElementById("validation-list");
const bodyContainer = document.getElementById("body-container");
const bottomContainer = document.getElementById("bottom-container");
const sendButton = document.getElementById("send-chat");
const textInput = document.getElementById("text-input");
const responseContainer = document.getElementById("response");
const onboardingText = document.getElementById("onboarding-text");
const onboardingArrowIcon = document.getElementById("onboarding-arrow-icon");
const tryFlutterText = document.getElementById("try-flutter-text");
const textinputMenu = document.getElementById("menu");
const loadingIndicator = document.getElementById('loader');
const validationLoadingIndicator = document.getElementById('validation-loader');

//initialising variables
let isApiKeyValid = false;
let areDependenciesInstalled = false;
let conversationHistory = [];
let stepOneCompleted = false;
let onboardingCompleted = false;
let activeAgent;

//initialising visual studio code library
let vscode = null;

const properties = [
    'direction',
    'boxSizing',
    'width',
    'height',
    'overflowX',
    'overflowY',

    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'borderStyle',

    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',

    'fontStyle',
    'fontVariant',
    'fontWeight',
    'fontStretch',
    'fontSize',
    'fontSizeAdjust',
    'lineHeight',
    'fontFamily',

    'textAlign',
    'textTransform',
    'textIndent',
    'textDecoration',

    'letterSpacing',
    'wordSpacing',

    'tabSize',
    'MozTabSize',
];

let agents = ['workspace', 'fig2code', 'integrationtest', 'apiintegration'];
const commands = ['refactor'];
// Add your additional commands and agents
const agentCommandsMap = {
    'integrationtest': ['generate', 'ate'],
};

// Concatenate agent-specific commands to the agents array
agents = agents.concat(
    Object.entries(agentCommandsMap).map(([agent, cmds]) => cmds.map(cmd => `${agent} /${cmd}`)).flat()
);

function getCaretCoordinates(element, position) {
    const div = document.createElement('div');
    document.body.appendChild(div);

    const style = div.style;
    const computed = getComputedStyle(element);

    style.whiteSpace = 'pre-wrap';
    style.wordBreak = 'break-word';
    style.position = 'absolute';
    style.visibility = 'hidden';
    style.overflow = 'hidden';

    properties.forEach(prop => {
        style[prop] = computed[prop];
    });

    div.textContent = element.textContent.substring(0, position);

    const span = document.createElement('span');
    span.textContent = element.textContent.substring(position) || '.';
    div.appendChild(span);

    const coordinates = {
        top: span.offsetTop + parseInt(computed['borderTopWidth']),
        left: span.offsetLeft + parseInt(computed['borderLeftWidth']),
        // height: parseInt(computed['lineHeight'])
        height: span.offsetHeight
    };

    div.remove();

    return coordinates;
}

class CommandDeck {
    constructor(ref, menuRef, resolveFn, replaceFn, menuItemFn) {
        this.ref = ref;
        this.menuRef = menuRef;
        this.resolveFn = resolveFn;
        this.replaceFn = replaceFn;
        this.menuItemFn = menuItemFn;
        this.options = [];

        this.makeOptions = this.makeOptions.bind(this);
        this.closeMenu = this.closeMenu.bind(this);
        this.selectItem = this.selectItem.bind(this);
        this.onInput = this.onInput.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        this.renderMenu = this.renderMenu.bind(this);

        this.ref.addEventListener('input', this.onInput);
        this.ref.addEventListener('keydown', this.onKeyDown);
    }

    async makeOptions(query) {
        let options = [];
        if (query.startsWith('@')) {
            options = await this.resolveFn(query.slice(1), 'at');
        } else if (query.startsWith('/')) {
            options = await this.resolveFn(query.slice(1), 'slash');
        }
        if (options.length !== 0) {
            this.options = options;
            this.renderMenu();
        } else {
            this.closeMenu();
        }
    }

    closeMenu() {
        setTimeout(() => {
            this.options = [];
            this.left = undefined;
            this.top = undefined;
            this.triggerIdx = undefined;
            this.renderMenu();
        }, 0);
    }

    selectItem(active) {
        return () => {
            const option = this.options[active];

            // Assuming this.ref is a contenteditable element
            const selection = window.getSelection();
            const range = selection.getRangeAt(0);
            const preMention = this.ref.textContent.substring(0, this.triggerIdx);
            const postMention = this.ref.textContent.substring(range.endOffset);

            const trigger = this.ref.textContent[this.triggerIdx];
            // Replace the mention with the selected option along with '@'
            const mentionNode = document.createTextNode(`${trigger}${option}`);
            this.ref.textContent = ''; // Clear existing content
            this.ref.appendChild(document.createTextNode(preMention));
            this.ref.appendChild(mentionNode);
            this.ref.appendChild(document.createTextNode(postMention));

            // Move the cursor to the end of the mention
            range.setStart(mentionNode, option.length + 1); // +1 for '@'
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);

            this.closeMenu();
            this.ref.focus();
        };
    }

    onInput(ev) {
        const positionIndex = this.ref.selectionStart;
        const textBeforeCaret = this.ref.textContent.slice(0, positionIndex);
        const tokens = textBeforeCaret.split(/\s/);
        const lastToken = tokens[tokens.length - 1];
        const triggerIdx = textBeforeCaret.endsWith(lastToken)
            ? textBeforeCaret.length - lastToken.length
            : -1;
        const maybeTrigger = textBeforeCaret[triggerIdx];
        const keystrokeTriggered = maybeTrigger === '@' || maybeTrigger === '/';

        this.ref.style.height = "auto";
        this.ref.style.height = this.ref.scrollHeight + "px";

        const isTriggerAtStartOfWord = triggerIdx === 0;

        if (!keystrokeTriggered || !isTriggerAtStartOfWord) {
            this.closeMenu();
            return;
        }

        const query = textBeforeCaret.slice(triggerIdx);
        this.makeOptions(query);

        const coords = getCaretCoordinates(this.ref, positionIndex);
        const { top, left } = this.ref.getBoundingClientRect();

        setTimeout(() => {
            this.active = 0;
            this.left = window.scrollX + coords.left + left + this.ref.scrollLeft;
            this.top = window.scrollY + coords.top + top + coords.height - this.ref.scrollTop;
            this.triggerIdx = triggerIdx;
            this.renderMenu();

            // Apply highlight class to existing mentions
            // this.applyHighlightToExistingActions(positionIndex);
        }, 0);
    }

    applyHighlightToExistingActions(originalText, positionIndex) {
        const trigger = this.ref.textContent[this.triggerIdx];
        const allActions = [...agents, ...commands];
        const regex = new RegExp(`\\B(${allActions.join("|")})\\b`, 'gi');

        // Store original text for accurate highlighting
        const highlightedText = originalText.replace(regex, (match) => `<span class="text-blue bg-rose-900">${trigger}${match}</span>`);

        // Set HTML content
        this.ref.innerHTML = highlightedText;

        // Reset cursor position based on original text length
        this.ref.selectionStart = this.ref.selectionEnd = positionIndex + (this.ref.textContent.length - originalText.length);
    }

    onKeyDown(ev) {
        let keyCaught = false;
        if (this.triggerIdx !== undefined) {
            switch (ev.key) {
                case 'ArrowDown':
                    this.active = Math.min(this.active + 1, this.options.length - 1);
                    this.renderMenu();
                    keyCaught = true;
                    break;
                case 'ArrowUp':
                    this.active = Math.max(this.active - 1, 0);
                    this.renderMenu();
                    keyCaught = true;
                    break;
                case 'Enter':
                case 'Tab':
                    this.selectItem(this.active)();
                    keyCaught = true;
                    break;
            }
        }

        if (keyCaught) {
            ev.preventDefault();
        }
    }

    renderMenu() {
        if (this.top === undefined) {
            this.menuRef.hidden = true;
            return;
        }

        const caretHeight = this.ref.offsetHeight;
        this.menuRef.style.left = this.left + 'px';
        this.menuRef.style.top = (this.top - this.menuRef.offsetHeight - caretHeight) + 'px';
        this.menuRef.innerHTML = '';

        this.options.forEach((option, idx) => {
            const trigger = this.ref.textContent[this.triggerIdx];
            this.menuRef.appendChild(this.menuItemFn(
                option,
                this.selectItem(idx),
                this.active === idx,
                trigger));
        });

        this.menuRef.hidden = false;
    }
}

(function () {
    //initialising vscode library
    vscode = acquireVsCodeApi();

    //reading vscode triggered messages to webview
    readTriggeredMessage();

    if (!onboardingCompleted) {
        textInput.textContent = 'How to wait for forEach to complete with asynchronous callbacks?';
    }

    const resolveFn = async (query, type) => {
        // Array to store possible matches
        let matchingItems = [];

        // When triggered with @
        if (type === 'at') {
            if (query.length === 0) {
                matchingItems = agents;
            } else {
                matchingItems = agents.filter(item => item.toLowerCase().startsWith(query.toLowerCase()));
            }
        }

        // When triggered with /
        else if (type === 'slash') {
            // If no agent selected yet
            if (!activeAgent) {
                matchingItems = query.length === 0 ? commands : commands.filter(item => item.toLowerCase().startsWith(query.toLowerCase()));
            }
            // If there is an active agent
            else {
                matchingItems = query.length === 0
                    ? agentCommandsMap[activeAgent]
                    : agentCommandsMap[activeAgent].filter(item => item.toLowerCase().startsWith(query.toLowerCase()));
            }
        }

        return matchingItems;
    };


    const replaceFn = (action, trigger) => `${trigger}${action} `;

    const menuItemFn = (action, setItem, selected, trigger) => {
        const div = document.createElement('div');
        div.setAttribute('role', 'option');
        div.className = 'menu-item';
        if (selected) {
            div.classList.add('selected');
            div.setAttribute('aria-selected', '');
        }
        div.textContent = `${trigger}${action}`;
        div.onclick = setItem;
        return div;
    };

    new CommandDeck(
        textInput,
        textinputMenu,
        resolveFn,
        replaceFn,
        menuItemFn
    );

    googleApiKeyTextInput.addEventListener("input", (event) => {
        const apiKey = event.target.value;
        validateApiKey(apiKey);
    });

    sendButton.addEventListener("click", (event) => {
        vscode.postMessage({ type: "prompt", value: textInput.textContent.trim() });
        googleApiKeyHeader.classList.add("hidden");
        if (onboardingCompleted) {
            textInput.textContent = '';
        }
    });

    textInput.addEventListener("paste", (event) => {
        event.preventDefault();
        const pastedText = event.clipboardData.getData('text/plain');
        event.target.textContent = pastedText;
    });

})();

function readTriggeredMessage() {
    window.addEventListener("message", (event) => {
        const message = event.data;
        switch (message.type) {
            case "apiKeyValidation":
            case "dependencyValidation":
                updateValidationList(message);
                break;
            case "displayMessages":
                conversationHistory = message.value;
                displayMessages(conversationHistory);
                break;
            case "showLoadingIndicator":
                sendButton.disabled = true;
                sendButton.classList.remove("cursor-pointer");
                sendButton.classList.add("cursor-not-allowed");
                loadingIndicator.classList.add("block");
                loadingIndicator.classList.remove("hidden");
                break;
            case "hideLoadingIndicator":
                sendButton.disabled = false;
                sendButton.classList.add("cursor-pointer");
                sendButton.classList.remove("cursor-not-allowed");
                loadingIndicator.classList.add("hidden");
                loadingIndicator.classList.remove("block");
                break;
            case "showValidationLoader":
                validationLoadingIndicator.classList.add("block");
                validationLoadingIndicator.classList.remove("hidden");
                break;
            case "hideValidationLoader":
                validationLoadingIndicator.classList.add("hidden");
                validationLoadingIndicator.classList.remove("block");
        }
    });
}

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

function displayMessages() {
    responseContainer.innerHTML = "";

    let modelCount = 0;

    conversationHistory.forEach((message) => {
        const messageElement = document.createElement("div");
        const userElement = document.createElement("p");
        const contentElement = document.createElement("p");
        if (message.role === "model") {
            modelCount++;
            userElement.innerHTML = "<strong>FlutterGPT</strong>";
            userElement.classList.add("my-2");
            contentElement.classList.add("border", "border-gray-300", "text-gray-900", "text-sm", "rounded-lg", "block", "w-full", "p-2.5", "mb-2", "bg-[#D9D9D9]", "break-words", "leading-relaxed");
            contentElement.innerHTML = markdownToPlain(message.parts);

            if (modelCount === 1 && !stepOneCompleted) {
                stepOneCompleted = true;
                // Update UI or perform actions for Step One completion
                onboardingText.textContent = "That is insightful, isn't it? Now lets try something related to your workspace using @workspace annotation.";
                textInput.textContent = "@workspace help me find router code and it's location.";

            } else if (modelCount === 2 && !onboardingCompleted) {
                onboardingCompleted = true;
                // Update UI or perform actions for Onboarding completion
                onboardingText.textContent = "Awesome! You can watch more use cases here.";
                textInput.textContent = "";
                textInput.contentEditable = true;
                onboardingArrowIcon.classList.add("hidden");
                onboardingText.classList.add("hidden");
                tryFlutterText.classList.add("hidden");
            }
        } else {
            userElement.innerHTML = "<strong>You</strong>";
            userElement.classList.add("my-2");
            contentElement.classList.add("border", "border-gray-300", "text-gray-900", "text-sm", "rounded-lg", "block", "w-full", "p-2.5", "mb-2", "bg-[#D9D9D9]", "break-words");
            contentElement.innerHTML = message.parts;
        }
        messageElement.appendChild(userElement);
        messageElement.appendChild(contentElement);
        responseContainer.appendChild(messageElement);
    });
    setResponse();
}

function setResponse() {
    const preCodeBlocks = document.querySelectorAll("code");
    preCodeBlocks.forEach((_preCodeBlock) => {
        _preCodeBlock.classList.add(
            "p-1",
            "my-2",
            "language-dart"
        );
    });

    const preBlocks = document.querySelectorAll("pre");
    preBlocks.forEach((_preBlock) => {
        _preBlock.classList.add("language-dart", "relative", "my-5");
        Prism.highlightElement(_preBlock);

        const iconContainer = document.createElement("div");
        iconContainer.id = "icon-container";
        iconContainer.classList.add("absolute", "top-2", "right-2", "inline-flex", "flex-row", "bg-white", "h-8", "w-16", "z-10", "justify-center", "items-center", "rounded-md", "opacity-0");
        iconContainer.style.backgroundColor = activityBarBackground;

        const _copyIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        _copyIcon.innerHTML = copyIcon;
        _copyIcon.id = "copy-icon";
        _copyIcon.classList.add("h-7", "w-7", "inline-flex", "justify-center", "items-center", "cursor-pointer");
        _copyIcon.style.fill = activityBarForeground;
        _copyIcon.setAttribute("alt", "Copy");
        iconContainer.appendChild(_copyIcon);

        _copyIcon.addEventListener("click", () => {
            const textToCopy = _preBlock.textContent.trim();
            navigator.clipboard.writeText(textToCopy);
        });

        const _mergeIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        _mergeIcon.innerHTML = mergeIcon;
        _mergeIcon.id = "merge-icon";
        _mergeIcon.classList.add("h-7", "w-7", "inline-flex", "justify-center", "items-center", "cursor-pointer");
        _mergeIcon.style.fill = activityBarForeground;
        _mergeIcon.setAttribute("alt", "Merge");
        iconContainer.appendChild(_mergeIcon);

        _mergeIcon.addEventListener("click", () => {
            vscode.postMessage({
                type: "pasteCode",
                value: _preBlock.textContent.trim(),
            });
        });

        _preBlock.appendChild(iconContainer);

        _preBlock.addEventListener("mouseenter", () => {
            iconContainer.style.opacity = 1;
        });

        _preBlock.addEventListener("mouseleave", () => {
            iconContainer.style.opacity = 0;
        });
    });

    const codeBlocks = document.querySelectorAll("code");
    codeBlocks.forEach((_codeBlock) => {
        _codeBlock.classList.add("rounded-sm", "language-dart");
        _codeBlock.addEventListener("click", function (e) {
            e.preventDefault();
            vscode.postMessage({
                type: "codeSelected",
                value: this.innerText,
            });
        });
    });
}

//converting markdown to html
function markdownToPlain(input) {
    const converter = new showdown.Converter({
        omitExtraWLInCodeBlocks: true,
        simplifiedAutoLink: true,
        excludeTrailingPunctuationFromURLs: true,
        literalMidWordUnderscores: true,
        simpleLineBreaks: true,
        openLinksInNewWindow: true, // Add this option to open links in a new window
        ghCodeBlocks: true, // Enable GitHub-style code blocks (optional for better styling)
        strikethrough: true, // Enable strikethrough syntax (optional)
        tasklists: true // Enable task list syntax for checkboxes (optional)
    });
    html = converter.makeHtml(input);
    return html;
}

async function updateValidationList(message) {
    const existingListItem = document.querySelector(`li[data-type="${message.type}"]`);

    if (existingListItem) {
        existingListItem.textContent = message.value;
    } else {
        const listItem = document.createElement('li');
        listItem.textContent = message.value;
        listItem.setAttribute('data-type', message.type);
        if (message.value.includes("invalid") || message.value.includes("not")) {
            listItem.classList.add("invalid");
        } else {
            listItem.classList.add("valid");
        }
        validationList.appendChild(listItem);
    }

    // Check for specific messages to update flags
    switch (message.type) {
        case "apiKeyValidation":
            isApiKeyValid = message.value === "Gemini API Key is valid";
            if (!isApiKeyValid) {
                existingListItem.classList.add("invalid");
                existingListItem.classList.remove("valid");
            } else {
                existingListItem?.classList.add("valid");
                existingListItem?.classList.remove("invalid");
            }
            break;
        case "dependencyValidation":
            areDependenciesInstalled = message.value === "All dependencies are installed";
            if (!areDependenciesInstalled) {
                existingListItem.classList.add("invalid");
                existingListItem.classList.remove("valid");
            } else {
                existingListItem?.classList.add("valid");
                existingListItem?.classList.remove("invalid");
            }
            break;
    }

    // Check if both conditions are met, add "All permissions look good"
    if (isApiKeyValid && areDependenciesInstalled) {
        const permissionsListItem = document.querySelector(`li[data-type="permissionsValidation"]`);

        if (!permissionsListItem) {
            bodyContainer.classList.add("flex", "flex-col");
            bottomContainer.classList.remove("hidden");
            bottomContainer.classList.add("flex");
            setAPIKeyInSettings();
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

function setAPIKeyInSettings() {
    const geminiAPIKey = googleApiKeyTextInput.value;
    vscode.postMessage({
        type: "updateSettings",
        value: geminiAPIKey
    });
}

// Function to introduce a delay using a Promise
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
