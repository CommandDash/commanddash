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
			console.log('data', data);
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
						break;
					}

				case "pasteCode":
					{
						const editor = vscode.window.activeTextEditor;
						if (editor) {
							editor.edit((builder) => {
								if (editor.selection.isEmpty) {
									builder.insert(editor.selection.active, data.value);
								} else {
									builder.replace(editor.selection, data.value);
								}
							});
						}
						break;
					}
				case "clearChat":
					{
						this.clearConversationHistory();
						break;
					}
				case "chatWebView": 
				{
					webviewView.webview.html = this._getChatWebview(webviewView.webview);
					break;
				}
			}
		});

		vscode.window.onDidChangeActiveColorTheme(() => {
			webviewView.webview.postMessage({ type: 'updateTheme' });
		});
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		const onboardingHtmlPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'onboarding', 'onboarding.html');
		const onboardingHtml = fs.readFileSync(onboardingHtmlPath.fsPath, 'utf8');
		const onboardingCssUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "onboarding", "onboarding.css"));
		const onboardingJsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "onboarding", "onboarding.js"));

		// Modify your Content-Security-Policy
		const cspSource = webview.cspSource;

		const updatedOnboardingChatHtml = onboardingHtml
			.replace(/{{cspSource}}/g, cspSource)
			.replace(/{{onboardingCssUri}}/g, onboardingCssUri.toString())
			.replace(/{{onboardingJsUri}}/g, onboardingJsUri.toString());

		return updatedOnboardingChatHtml;
	}

	private _getChatWebview(webview: vscode.Webview) {
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "chat", "scripts", "main.js"));
		const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "chat", "css", "chatpage.css"));
		const prismCssUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "assets", "prismjs", "prism.min.css"));
		const chatHtmlPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'chat', 'chat.html');
		const chatHtml = fs.readFileSync(chatHtmlPath.fsPath, 'utf8');

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
			.replace(/{{cssUri}}/g, cssUri.toString())
			.replace(/{{prismCssUri}}/g, prismCssUri.toString());

		return updatedChatHtml;
	}



	private _publicConversationHistory: Array<{ role: string, parts: string }> = [];
	private _privateConversationHistory: Array<{ role: string, parts: string }> = [];

	private async getResponse(prompt: string) {
		if (!this._view) {
			await vscode.commands.executeCommand('fluttergpt.chatView.focus');

		} else {
			this._view?.show?.(true);
		}

		// Initialize conversation history if it's the first time
		if (this._privateConversationHistory.length === 0) {
			this._privateConversationHistory.push(
				{ role: 'user', parts: "You are a flutter/dart development expert who specializes in providing production-ready well-formatted code. Each response from you must be STRICTLY under 8192 characters. DO NOT MENTION EXTRA DETAILS APART FROMT THE QUERY ASKED BY THE USER.\n\n" },
				{ role: 'model', parts: "I am a flutter/dart development expert who specializes in providing production-ready well-formatted code. Each response of mine will be STRICTLY under 8192 characters. How can I help you?\n\n" }
			);
		}
		let workspacePrompt = "";

		// Add a simplified version to the public history
		this._publicConversationHistory.push({ role: 'user', parts: prompt });

		this._view?.webview.postMessage({ type: 'displayMessages', value: this._publicConversationHistory });
		this._view?.webview.postMessage({ type: 'setPrompt', value: '' });

		// Check if the prompt includes '@workspace' and handle accordingly
		try {
			if (prompt.includes('@workspace')) {
				// Add the full prompt to the private history for completion
				this._view?.webview.postMessage({ type: 'workspaceLoader', value: true });
				const dartFiles = await this.aiRepo.findClosestDartFiles(prompt, this._view);
				workspacePrompt = "You've complete access to the codebase. I'll provide you with top 5 closest files code as context and your job is to read following files code end-to-end and answer the prompt initialised by `@workspace` symbol. If you're unable to find answer for the requested prompt, suggest an alternative solution as a dart expert. Be crisp & crystal clear in your answer. Make sure to provide your thinking process in steps including the file paths, name & code. Here's the code: \n\n" + dartFiles + "\n\n" + prompt;
				this._privateConversationHistory.push({ role: 'user', parts: workspacePrompt });
			} else {
				// Append the current user prompt to the conversation history
				this._privateConversationHistory.push({ role: 'user', parts: prompt });
				this._view?.webview.postMessage({ type: 'showLoadingIndicator' });
			}
		} catch (error) {
			console.error("Error processing workspace prompt: ", error);
		}
		// Use the stored conversation history for the prompt
		try {
			let response = '';
			if (prompt.includes('@workspace')) {
				response = await this.aiRepo.getCompletion(this._privateConversationHistory, true, this._view);
				this._privateConversationHistory.push({ role: 'user', parts: workspacePrompt });
			} else {
				response = await this.aiRepo.getCompletion(this._privateConversationHistory);
				this._privateConversationHistory.push({ role: 'user', parts: prompt });
				this._view?.webview.postMessage({ type: 'showLoadingIndicator' });
			}
			this._privateConversationHistory.push({ role: 'model', parts: response });
			this._publicConversationHistory.push({ role: 'model', parts: response });
			this._view?.webview.postMessage({ type: 'displayMessages', value: this._publicConversationHistory });
			this._view?.webview.postMessage({ type: 'stepLoader', value: { creatingResultLoader: true } });
			this._view?.webview.postMessage({ type: 'addResponse', value: '' });

		} catch (error) {
			console.error(error);
			const response = error instanceof Error ? error.message : 'An unexpected error occurred.';
			this._view?.webview.postMessage({ type: 'displaySnackbar', value: response });
			this._view?.webview.postMessage({ type: 'addResponse', value: '' });
		} finally {
			this._view?.webview.postMessage({ type: 'hideLoadingIndicator' });
			this._view?.webview.postMessage({ type: 'workspaceLoader', value: false });
		}
	}


	private clearConversationHistory() {
		this._privateConversationHistory = [];
		this._publicConversationHistory = [];
	}
}
