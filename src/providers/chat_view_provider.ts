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
			}
		});

		vscode.window.onDidChangeActiveColorTheme(() => {
			webviewView.webview.postMessage({type: 'updateTheme'});
		});
	}

	private _getHtmlForWebview(webview: vscode.Webview,) {
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


	private _conversationHistory: Array<{ role: string, parts: string }> = [];

	private async getResponse(prompt: string) {
		if (!this._view) {
			await vscode.commands.executeCommand('fluttergpt.chatView.focus');

		} else {
			this._view?.show?.(true);
		}

		// Initialize conversation history if it's the first time
		// debugger;
		if (this._conversationHistory.length === 0) {
			this._conversationHistory.push(
				{ role: 'user', parts: "You are a flutter/dart development expert who specializes in providing production-ready well-formatted code.\n\n" },
				{ role: 'model', parts: "I am a flutter/dart development expert who specializes in providing production-ready well-formatted code. How can I help you?\n\n" }
			);
		}
		console.debug('conversation history', this._conversationHistory);

		// Append the current user prompt to the conversation history
		this._conversationHistory.push({ role: 'user', parts: prompt });
		this._view?.webview.postMessage({ type: 'displayMessages', value: this._conversationHistory });

		this._view?.webview.postMessage({ type: 'setPrompt', value: '' });
		this._view?.webview.postMessage({ type: 'showLoadingIndicator' });

		try {
			// Use the stored conversation history for the prompt
			const isWorkspacePresent = prompt.includes('@workspace');
			const response = await this.aiRepo.getCompletion(this._conversationHistory, isWorkspacePresent);
			this._conversationHistory.push({ role: 'user', parts: prompt });
			this._conversationHistory.push({ role: 'model', parts: response });
			this._view?.webview.postMessage({ type: 'displayMessages', value: this._conversationHistory });
			this._view?.webview.postMessage({ type: 'addResponse', value: '' });
		} catch (error) {
			console.error(error);
			const response = error instanceof Error ? error.message : 'An unexpected error occurred.';
			this._view?.webview.postMessage({ type: 'displaySnackbar', value: response });
		} finally {
			this._view?.webview.postMessage({ type: 'hideLoadingIndicator' });
		}
	}


	private clearConversationHistory() {
		this._conversationHistory = [];
	}
}
