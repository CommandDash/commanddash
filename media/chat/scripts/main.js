/* eslint-disable @typescript-eslint/prefer-for-of */

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.

const copyIcon = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Zm160-240v-480 480Z"/></svg>`;
const mergeIcon = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M664-160 440-384v-301L336-581l-57-57 201-201 200 200-57 57-103-103v269l200 200-56 56Zm-368 1-56-56 127-128 57 57-128 127Z"/></svg>`;

const activityBarBackground = getComputedStyle(document.documentElement).getPropertyValue("--vscode-activityBar-background");
const activityBarForeground = getComputedStyle(document.documentElement).getPropertyValue("--vscode-activityBar-foreground");

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

const actions = ['workspace', 'vscode'];

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

    div.textContent = element.value.substring(0, position);

    const span = document.createElement('span');
    span.textContent = element.value.substring(position) || '.';
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

class Mentionify {
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
        const options = await this.resolveFn(query);
        if (options.lenght !== 0) {
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
            const preMention = this.ref.value.substr(0, this.triggerIdx);
            const option = this.options[active];
            const mention = this.replaceFn(option, this.ref.value[this.triggerIdx]);
            const postMention = this.ref.value.substr(this.ref.selectionStart);
            const newValue = `${preMention}${mention}${postMention}`;
            this.ref.value = newValue;
            const caretPosition = this.ref.value.length - postMention.length;
            this.ref.setSelectionRange(caretPosition, caretPosition);
            this.closeMenu();
            this.ref.focus();
        };
    }

    onInput(ev) {
        const positionIndex = this.ref.selectionStart;
        const textBeforeCaret = this.ref.value.slice(0, positionIndex);
        const tokens = textBeforeCaret.split(/\s/);
        const lastToken = tokens[tokens.length - 1];
        const triggerIdx = textBeforeCaret.endsWith(lastToken)
            ? textBeforeCaret.length - lastToken.length
            : -1;
        const maybeTrigger = textBeforeCaret[triggerIdx];
        const keystrokeTriggered = maybeTrigger === '@';
        const highlightRegex = new RegExp(`\\B(@${actions.join("|")})\\b`, 'gi');
        const highlightedText = this.ref.value.replace(highlightRegex, (match) => `<span class="bg-white">${match}</span>`);
        this.ref.innerHTML = highlightedText;
        this.ref.style.height = "auto";
        this.ref.style.height = this.ref.scrollHeight + "px";

        if (!keystrokeTriggered) {
            this.closeMenu();
            return;
        }

        const query = textBeforeCaret.slice(triggerIdx + 1);
        this.makeOptions(query);

        const coords = getCaretCoordinates(this.ref, positionIndex);
        const { top, left } = this.ref.getBoundingClientRect();

        setTimeout(() => {
            this.active = 0;
            this.left = window.scrollX + coords.left + left + this.ref.scrollLeft;
            this.top = window.scrollY + coords.top + top + coords.height - this.ref.scrollTop;
            this.triggerIdx = triggerIdx;
            this.renderMenu();
        }, 0);
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
            this.menuRef.appendChild(this.menuItemFn(
                option,
                this.selectItem(idx),
                this.active === idx));
        });

        this.menuRef.hidden = false;
    }
}

(function () {
    const vscode = acquireVsCodeApi();


    // Define an empty array, which will be loaded through the displayMessages function
    let conversationHistory = [];
    let loadingIndicator = document.getElementById('loader');

    // Handle mexssages sent from the extension to the webview
    window.addEventListener("message", (event) => {
        const message = event.data;
        switch (message.type) {
            case "addResponse": {
                response = message.value;
                setResponse();
                break;
            }
            case "clearResponse": {
                response = "";
                break;
            }
            case "setPrompt": {
                document.getElementById("prompt-input").value = message.value;
                setResponse();
                break;
            }
            case "displayMessages": {
                conversationHistory = message.value;
                displayMessages();
                break;
            }
            case 'showLoadingIndicator':
                loadingIndicator.style.display = 'block';
                break;
            case 'hideLoadingIndicator':
                loadingIndicator.style.display = 'none';
                break;
            case 'updateTheme': {
                const preBlocks = document.querySelectorAll("pre");
                preBlocks.forEach((_preBlock) => {
                    console.log('preBlocks', _preBlock);
                    const iconContainer = _preBlock.querySelectorAll("div");
                    iconContainer.forEach((_iconContainer) => {
                        _iconContainer.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue("--vscode-activityBar-background");
                        const icon = _iconContainer.querySelectorAll("svg");
                        icon.forEach((_icon) => {
                            _icon.style.fill = getComputedStyle(document.documentElement).getPropertyValue("--vscode-activityBar-foreground");
                        });
                    });
                });
                break;
            }
        }
    });

    function fixCodeBlocks(response) {
        // Use a regular expression to find all occurrences of the substring in the string
        const REGEX_CODEBLOCK = new RegExp("\`\`\`", "g");
        const matches = response.match(REGEX_CODEBLOCK);

        // Return the number of occurrences of the substring in the response, check if even
        const count = matches ? matches.length : 0;
        if (count % 2 === 0) {
            return response;
        } else {
            // else append ``` to the end to make the last code block complete
            return response.concat("\n\`\`\`");
        }
    }

    function setResponse() {
        const converter = new showdown.Converter({
            omitExtraWLInCodeBlocks: true,
            simplifiedAutoLink: true,
            excludeTrailingPunctuationFromURLs: true,
            literalMidWordUnderscores: true,
            simpleLineBreaks: true,
        });

        response = fixCodeBlocks(response);
        html = converter.makeHtml(response);
        document.getElementById("response").innerHTML = html;

        const preCodeBlocks = document.querySelectorAll("pre code");
        preCodeBlocks.forEach((_preCodeBlock) => {
            _preCodeBlock.classList.add(
                "p-1",
                "my-2",
                "block",
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
                const textToCopy = _preBlock.textContent;
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
                    value: _preBlock.textContent,
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
            if (_codeBlock.innerText.startsWith("Copy code")) {
                _codeBlock.innerText = _codeBlock.innerText.replace("Copy code", "");
            }
            _codeBlock.classList.add("inline-flex", "max-w-full", "overflow-hidden", "rounded-sm", "cursor-pointer", "language-dart");
            _codeBlock.addEventListener("click", function (e) {
                e.preventDefault();
                vscode.postMessage({
                    type: "codeSelected",
                    value: this.innerText,
                });
            });
        });
    }

    // Function to display messages in the chat container
    function displayMessages() {
        const dynamicMessagesContainer = document.getElementById("dynamic-messages");
        console.log(conversationHistory);

        // Clear existing messages
        dynamicMessagesContainer.innerHTML = "";

        // Loop through the messages array and create message elements
        conversationHistory.slice(2, conversationHistory.length).forEach((message, index) => {
            const messageElement = document.createElement("div");
            if (message.role === "model") {
                messageElement.classList.add("message", "user-gemini-pro"); // Change class to "user-gemini-pro"
                messageElement.innerHTML = `<p><strong>FlutterGPT: </strong>${markdownToPlain(message.parts)}</p>`;
            } else {
                messageElement.classList.add("message", "user-you"); // Change class to "user-you"
                messageElement.innerHTML = `<p><strong>You: </strong>${markdownToPlain(message.parts)}</p>`;
            }
            dynamicMessagesContainer.appendChild(messageElement);
        });

        // Scroll the chat container to the most recent message
        dynamicMessagesContainer.scrollTop = dynamicMessagesContainer.scrollHeight;
    }


    function markdownToPlain(input) {
        const converter = new showdown.Converter({
            omitExtraWLInCodeBlocks: true,
            simplifiedAutoLink: true,
            excludeTrailingPunctuationFromURLs: true,
            literalMidWordUnderscores: true,
            simpleLineBreaks: true,
        });
        // response = fixCodeBlocks(input);
        html = converter.makeHtml(input);
        return html;
    }

    const resolveFn = prefix => prefix === ''
        ? actions
        : actions.filter(action => action.startsWith(prefix));

    const replaceFn = (action, trigger) => `${trigger}${action} `;

    const menuItemFn = (action, setItem, selected) => {
        const div = document.createElement('div');
        div.setAttribute('role', 'option');
        div.className = 'menu-item';
        if (selected) {
            div.classList.add('selected');
            div.setAttribute('aria-selected', '');
        }
        div.textContent = `@${action}`;
        div.onclick = setItem;
        return div;
    };

    const mentionify = new Mentionify(
        document.getElementById('prompt-input'),
        document.getElementById('menu'),
        resolveFn,
        replaceFn,
        menuItemFn
    );

    // Listen for keyup events on the prompt input element
    document.getElementById("prompt-input").addEventListener("keydown", function (e) {
        console.log(this.value);
        // If the key that was pressed was the Enter key
        if (e.key === "Enter" && !e.shiftKey && mentionify.menuRef?.hidden) {
            const promptInputValue = this.value.trim();

            // If the input is empty or contains only whitespaces, show the snackbar
            if (promptInputValue === "") {
                showToast();
            } else {
                // Otherwise, send a message to VSCode with the trimmed input value
                vscode.postMessage({
                    type: "prompt",
                    value: promptInputValue,
                });
            }
        }
    });

    // Function to introduce a delay using a Promise
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Async Function to show the toast
    async function showToast() {
        const toastContainer = document.getElementById('toast-container');

        // Display the toast 
        toastContainer.style.display = 'flex';

        // Wait for 3 seconds
        await delay(3000);

        // Completely hide the toast 
        toastContainer.style.display = 'none';
    }
})();

