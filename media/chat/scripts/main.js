/* eslint-disable @typescript-eslint/prefer-for-of */

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.

const copyIcon = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Zm160-240v-480 480Z"/></svg>`;
const mergeIcon = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M664-160 440-384v-301L336-581l-57-57 201-201 200 200-57 57-103-103v269l200 200-56 56Zm-368 1-56-56 127-128 57 57-128 127Z"/></svg>`;

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
			iconContainer.classList.add("absolute", "-top-5", "right-2" ,"inline-flex", "flex-row", "bg-white", "h-8", "w-16" ,"z-10", "justify-center", "items-center", "rounded-md", "opacity-0");

			const _copyIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
			_copyIcon.innerHTML = copyIcon;
			_copyIcon.classList.add("h-7", "w-7", "inline-flex", "justify-center", "items-center", "cursor-pointer");
			iconContainer.appendChild(_copyIcon);

			_copyIcon.addEventListener("click", () => {
				const textToCopy = _preBlock.textContent;
				navigator.clipboard.writeText(textToCopy);
			});

			const _mergeIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
			_mergeIcon.innerHTML = mergeIcon;
			_mergeIcon.classList.add("h-7", "w-7", "inline-flex", "justify-center", "items-center", "cursor-pointer");
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

	// Listen for keyup events on the prompt input element
	document.getElementById("prompt-input").addEventListener("keyup", function (e) {
		console.log(this.value);
		// If the key that was pressed was the Enter key
		if (e.key === "Enter") {
			const promptInputValue = this.value.trim();

			// If the input is empty or contains only whitespaces, show the snackbar
			if(promptInputValue === "") {
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
