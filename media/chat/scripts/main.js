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
		for (let i = 0; i < preCodeBlocks.length; i++) {
			preCodeBlocks[i].classList.add(
				"p-2",
				"my-2",
				"block",
				"overflow-x-scroll"
			);
		}

		const codeBlocks = document.querySelectorAll("code");
		for (let i = 0; i < codeBlocks.length; i++) {
			// Check if innertext starts with "Copy code"
			if (codeBlocks[i].innerText.startsWith("Copy code")) {
				codeBlocks[i].innerText = codeBlocks[i].innerText.replace("Copy code", "");
			}

			codeBlocks[i].classList.add("inline-flex", "max-w-full", "overflow-hidden", "rounded-sm", "cursor-pointer");

			codeBlocks[i].addEventListener("click", function (e) {
				e.preventDefault();
				vscode.postMessage({
					type: "codeSelected",
					value: this.innerText,
				});
			});

			const d = document.createElement("div");
			d.innerHTML = codeBlocks[i].innerHTML;
			codeBlocks[i].innerHTML = null;
			codeBlocks[i].appendChild(d);
			d.classList.add("code");
		}

		microlight.reset("code");

		// document.getElementById("response").innerHTML = document.getElementById("response").innerHTML.replaceAll('<', '&lt;').replaceAll('>', '&gt;');
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
