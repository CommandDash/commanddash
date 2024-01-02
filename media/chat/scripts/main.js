/* eslint-disable @typescript-eslint/prefer-for-of */

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
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
			_preBlock.classList.add("language-dart");
			Prism.highlightElement(_preBlock);
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
			vscode.postMessage({
				type: "prompt",
				value: this.value,
			});
		}
	});
})();
