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

const dartIcon = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_1896_4)">
<path d="M2.44739 9.55215L0.395172 7.49993C0.150814 7.2496 0 6.89595 0 6.55185C0 6.3922 0.0899636 6.14236 0.157973 5.99942L2.05222 2.05176L2.44739 9.55215Z" fill="#01579B"/>
<path d="M9.47344 2.44739L7.42122 0.395172C7.24201 0.214767 6.86879 0 6.55285 0C6.28128 0 6.01473 0.0546463 5.84268 0.157973L2.05371 2.05222L9.47344 2.44739Z" fill="#40C4FF"/>
<path d="M4.89463 11.9998H9.86864V9.86839L6.15794 8.68359L2.76318 9.86839L4.89463 11.9998Z" fill="#40C4FF"/>
<path d="M2.05225 8.44705C2.05225 9.08037 2.13171 9.23572 2.4467 9.55238L2.76241 9.86833H9.86858L6.39532 5.92091L2.05225 2.05176V8.44705Z" fill="#29B6F6"/>
<path d="M8.36879 2.05176H2.05225L9.86858 9.86714H12V4.97259L9.47365 2.44597C9.11857 2.09042 8.80357 2.05176 8.36879 2.05176Z" fill="#01579B"/>
<path opacity="0.2" d="M2.52644 9.63066C2.21073 9.31399 2.13222 9.00163 2.13222 8.44705V2.13098L2.05371 2.05176V8.44705C2.05371 9.00186 2.05371 9.15554 2.52644 9.63089L2.76292 9.86738L2.52644 9.63066Z" fill="white"/>
<path opacity="0.2" d="M11.9215 4.89453V9.78908H9.79004L9.86855 9.86854H12V4.97304L11.9215 4.89453Z" fill="#263238"/>
<path opacity="0.2" d="M9.47344 2.44693C9.08233 2.0551 8.76208 2.05176 8.29007 2.05176H2.05371L2.13222 2.13027H8.29007C8.5256 2.13027 9.12027 2.09065 9.47392 2.44621L9.47344 2.44693Z" fill="white"/>
<path opacity="0.2" d="M11.9215 4.89455L9.47362 2.44739L7.4214 0.395172C7.24219 0.214767 6.86897 0 6.55303 0C6.28146 0 6.01491 0.0546463 5.84286 0.157973L2.05389 2.05222L0.158689 5.99988C0.0909181 6.14377 0 6.39338 0 6.55231C0 6.89713 0.151769 7.24911 0.394217 7.49967L2.28679 9.37817C2.33715 9.43924 2.39076 9.49755 2.44739 9.55285L2.5259 9.63136L2.76215 9.86784L4.81437 11.9201L4.89287 11.9986H9.86593V9.8676H11.9974V4.97305L11.9215 4.89455Z" fill="url(#paint0_radial_1896_4)"/>
</g>
<defs>
<radialGradient id="paint0_radial_1896_4" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(5.99964 5.9994) scale(5.99917)">
<stop stop-color="white" stop-opacity="0.1"/>
<stop offset="1" stop-color="white" stop-opacity="0"/>
</radialGradient>
<clipPath id="clip0_1896_4">
<rect width="12" height="12" fill="white"/>
</clipPath>
</defs>
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
const workspaceLoader = document.getElementById('workspace-loader');
const workspaceLoaderText = document.getElementById('workspace-loader-text');
const fileNameContainer = document.getElementById("file-names");
const textInputContainer = document.getElementById("text-input-container");

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

let agents = ['workspace'];
const commands = [];
// Add your additional commands and agents
const agentCommandsMap = {};

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

    //check if key exists
    ifKeyExists();

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

    const commandDeck = new CommandDeck(
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

    textInput.addEventListener("focus", removePlaceholder);
    textInput.addEventListener("blur", addPlaceholder);

    textInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey && commandDeck.menuRef?.hidden) {
            event.preventDefault();
            vscode.postMessage({
                type: "prompt",
                value: textInput.textContent.trim(),
            });
            textInput.textContent = "";
        }
    });
})();

function ifKeyExists() {
    vscode.postMessage({
        type: "checkKeyIfExists",
    });
}

function removePlaceholder() {
    if (textInput.textContent.trim() === "# Message") {
        textInput.textContent = '';
        textInput.classList.remove('placeholder', 'text-white/[.4]');
    }
}

// Function to add placeholder when the element is blurred and empty
function addPlaceholder() {
    if (textInput.textContent.trim() === '') {
        textInput.textContent = '# Message';
        textInput.classList.add('placeholder', 'text-white/[.4]');
    }
}

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
                textInputContainer.classList.add("disabled");
                textInput.blur();
                break;
            case "hideLoadingIndicator":
                sendButton.disabled = false;
                sendButton.classList.add("cursor-pointer");
                sendButton.classList.remove("cursor-not-allowed");
                loadingIndicator.classList.add("hidden");
                loadingIndicator.classList.remove("block");
                textInputContainer.classList.remove("disabled");
                textInput.focus();
                break;
            case "showValidationLoader":
                validationLoadingIndicator.classList.add("block");
                validationLoadingIndicator.classList.remove("hidden");
                break;
            case "hideValidationLoader":
                validationLoadingIndicator.classList.add("hidden");
                validationLoadingIndicator.classList.remove("block");
                break;
            case "keyExists":
                onboardingCompleted = true;
                stepOneCompleted = true;
                modelCount = 3;
                googleApiKeyHeader.classList.add("hidden");
                bottomContainer.classList.remove("hidden");
                bottomContainer.classList.add("flex");
                textInput.textContent = "";
                textInput.contentEditable = true;
                onboardingArrowIcon.classList.add("hidden");
                onboardingText.classList.add("hidden");
                tryFlutterText.classList.add("hidden");
                break;
            case 'workspaceLoader':
                workspaceLoader.style.display = message.value ? 'flex' : 'none';
                if (message.value) {
                    workspaceLoader.classList.remove("animate__slideOutDown");
                    workspaceLoader.classList.add("animate__slideInUp");
                    textInputContainer.classList.add("disabled");
                    textInput.blur();
                } else {
                    workspaceLoader.classList.remove("animate__slideInUp");
                    workspaceLoader.classList.add("animate__slideOutDown");
                    textInputContainer.classList.remove("disabled");
                    textInput.focus();
                }
                if (!message.value) {
                    fileNameContainer.innerHTML = '';
                    workspaceLoaderText.textContent = "Finding the most relevant files";
                }
                break;
            case 'stepLoader':
                if (message.value?.fetchingFileLoader) {
                    workspaceLoaderText.textContent = "Finding most relevant files\n(this may take a while for first time)";
                } else if (message.value?.creatingResultLoader) {
                    fileNameContainer.style.display = "inline-flex";
                    workspaceLoaderText.textContent = "Preparing a result";
                    message.value?.filePaths?.forEach((_filePath) => {
                        const divBlock = document.createElement("div");
                        divBlock.classList.add("inline-flex", "flex-row", "items-center", "mt-2");
                        divBlock.id = "divBlock";
                        const fileNames = document.createElement("span");
                        const _dartIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                        _dartIcon.innerHTML = dartIcon;
                        _dartIcon.classList.add("h-3", "w-3", "mx-1");
                        _dartIcon.id = "dartIcon";
                        fileNames.textContent = _filePath;
                        fileNames.classList.add("file-path");
                        fileNames.id = "fileNames";
                        divBlock.appendChild(_dartIcon);
                        divBlock.appendChild(fileNames);
                        fileNameContainer.appendChild(divBlock);
                    });
                }
                break;

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
            userElement.classList.add("block", "w-full", "px-2.5", "py-1.5", "bg-[#3079D8]/[.2]");
            contentElement.classList.add("text-sm", "block", "px-2.5", "py-1.5", "break-words", "leading-relaxed", "bg-[#3079D8]/[.2]");
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
            userElement.classList.add("block", "w-full", "px-2.5", "py-1.5", "bg-[#2F2F2F]");
            contentElement.classList.add("text-sm", "block", "w-full", "px-2.5", "py-1.5", "break-words", "bg-[#2F2F2F]");
            contentElement.innerHTML = message.parts;
        }
        messageElement.classList.add("mt-1");
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
