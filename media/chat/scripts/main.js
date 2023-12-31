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

	const promptInput = document.getElementById("prompt-input");
	const menu = document.getElementById("slash-command-menu");

	// Listen for keyup events on the prompt input element
	promptInput.addEventListener("keyup", function (e) {
		console.log(this.value);
		// If the key that was pressed was the Enter key
		if (e.keyCode === 13) {
			vscode.postMessage({
				type: "prompt",
				value: this.value,
			});
		}
	});

	// Listen for keypress events on the prompt input element
	promptInput.addEventListener("keypress", function (e) {
		if (e.key === '/') {
			// Show slash command menu
			showSlashCommandMenu();
		}
	});

	// Function to show the slash command menu
	function showSlashCommandMenu() {
		menu.style.display = "flex";
		menu.classList.add("show");
	}

	// Function to hide the slash command menu
	function hideSlashCommandMenu() {
		menu.classList.remove("show");
		menu.style.display = "none";
	}

	// Add event listeners for command selection
	const commandList = document.getElementById("slash-command-list");
	commandList.addEventListener("click", function (e) {
		const selectedCommand = e.target.dataset.command;
		if (selectedCommand) {
			vscode.postMessage({
				type: "slashCommand",
				value: selectedCommand,
			});
		}
		// Hide the menu after selecting a command
		hideSlashCommandMenu();
	});

	// Close the menu if the user clicks outside of it
	document.addEventListener("click", function (e) {
		if (!e.target.matches('#prompt-input') && !e.target.matches('#slash-command-menu')) {
			hideSlashCommandMenu();
		}
	});

	promptInput.addEventListener("input", function (e) {
		// Check if the input is empty after backspacing
		if (e.inputType === 'deleteContentBackward') {
			// Hide the menu after backspacing
			hideSlashCommandMenu();
		}
	});

})();
