import * as vscode from "vscode";
import * as fs from 'fs';
import path = require('path');
import { GeminiRepository } from "../repository/gemini-repository";


export class FlutterGPTViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = "fluttergpt.chatView";
	private _view?: vscode.WebviewView;
	private _currentMessageNumber = 0;

	// In the constructor, we store the URI of the extension
	constructor(private readonly _extensionUri: vscode.Uri,
		private context: vscode.ExtensionContext,
		private readonly aiRepo: GeminiRepository,
	) {

	}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;

		// set options for the webview, allow scripts
		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [
				this._extensionUri,
			],
		};

		// set the HTML for the webview
		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		// add an event listener for messages received by the webview
		webviewView.webview.onDidReceiveMessage((data) => {
			switch (data.type) {
				case "codeSelected":
					{
						const code = data.value;
						// code = code.replace(/([^\\])(\$)([^{0-9])/g, "$1\\$$$3");
						const snippet = new vscode.SnippetString();
						// snippet.appendText(code);
						// insert the code as a snippet into the active text editor
						// await vscode.window.activeTextEditor?.insertSnippet(snippet);
						break;
					}
				case "prompt":
					{
						this.getResponse(data.value);
					}
			}
		});
	}

	private _getHtmlForWebview(webview: vscode.Webview,) {
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "chat", "scripts", "main.js"));
		const chatHtmlPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'chat', 'chat.html');
		const chatHtml = fs.readFileSync(chatHtmlPath.fsPath, 'utf8');
		const showdownUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'chat', 'scripts', 'showdown.min.js'));

		// Modify your Content-Security-Policy
		const cspSource = webview.cspSource;
		const contentSecurityPolicy = `
			default-src 'none';
			connect-src 'self' https://api.openai.com;
			img-src ${cspSource} https:;
			style-src 'unsafe-inline' ${cspSource};
			script-src 'unsafe-inline' ${cspSource} https: http:;
		`;

		const updatedChatHtml = chatHtml
			.replace(/{{cspSource}}/g, cspSource)
			.replace(/{{scriptUri}}/g, scriptUri.toString())
			.replace(/{{shadowUri}}/g, showdownUri.toString());

		return updatedChatHtml;
	}


	private _conversationHistory: Array<{ role: string, parts: string }> = [];

	private async getResponse(prompt: string) {
		if (!this._view) {
			await vscode.commands.executeCommand('fluttergpt.chatView.focus');

		} else {
			this._view?.show?.(true);
		}

		const selection = vscode.window.activeTextEditor?.selection;
		const selectedText = vscode.window.activeTextEditor?.document.getText(selection);
		let searchPrompt = this.createPrompt(prompt, selectedText);

		// Initialize conversation history if it's the first time
		if (this._conversationHistory.length === 0) {
			this._conversationHistory.push(
				{ role: 'user', parts: "You are a flutter/dart development expert who specializes in providing production-ready well-formatted code.\n\n" },
				{ role: 'model', parts: "I am a flutter/dart development expert who specializes in providing production-ready well-formatted code. How can I help you?\n\n" }
			);
		}

		// Append the current user prompt to the conversation history
		this._conversationHistory.push({ role: 'user', parts: searchPrompt });
		this._view?.webview.postMessage({ type: 'displayMessages', value: this._conversationHistory });

		this._view?.webview.postMessage({ type: 'setPrompt', value: '' });
		this._view?.webview.postMessage({ type: 'addResponse', value: 'loading...' });

		try {
			// Use the stored conversation history for the prompt
			const response = await this.aiRepo.getCompletion(this._conversationHistory);

			// Uncomment below to use the prompt with the image
			// const response = await this.aiRepo.generateTextFromImage(`Act as flutter developer expert. ${searchPrompt}`, "/Users/yatendrakumar/desktop/example.jpeg", "image/jpeg");

			this._conversationHistory.push({ role: 'user', parts: searchPrompt });
			this._conversationHistory.push({ role: 'model', parts: response });
			this._view?.webview.postMessage({ type: 'displayMessages', value: this._conversationHistory });
			this._view?.webview.postMessage({ type: 'addResponse', value: '' });

		} catch (error) {
			console.error(error);
			const response = 'Sorry, I could not find a response. Please try again.';
			this._view?.webview.postMessage({ type: 'addResponse', value: response });
		}
	}


	private createPrompt(prompt: string, selectedText: string | undefined) {
		let searchPrompt = prompt;
		if (selectedText) {
			searchPrompt += "\n```" + selectedText + "```";
		}
		return searchPrompt;
	}
}
