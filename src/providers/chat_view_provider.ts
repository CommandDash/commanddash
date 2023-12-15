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
		var chatHtml = fs.readFileSync(path.join(this.context.extensionPath, 'media', 'chat', 'chat.html'), 'utf8');
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
		chatHtml = chatHtml.replace(/{{cspSource}}/g, cspSource)
			.replace(/{{scriptUri}}/g, scriptUri.toString())
			.replace(/{{shadowUri}}/g, showdownUri.toString())
			;
		return chatHtml;
	}

	private async getResponse(prompt: string) {
		if (!this._view) {
			await vscode.commands.executeCommand('fluttergpt.chatView.focus');
		} else {
			this._view?.show?.(true);
		}
		let response = '';
		const selection = vscode.window.activeTextEditor?.selection;
		const selectedText = vscode.window.activeTextEditor?.document.getText(selection);
		let searchPrompt = this.createPrompt(prompt, selectedText);
		this._view?.webview.postMessage({ type: 'setPrompt', value: searchPrompt });
		this._view?.webview.postMessage({ type: 'addResponse', value: '...' });
		this._currentMessageNumber++;
		try {
			const prompt = [
				{ role: 'model', parts: "You are a flutter/dart development expert.\n\n" },
				{ role: 'user', parts: searchPrompt }];
			response = await this.aiRepo.getCompletion(prompt);
			this._view?.webview.postMessage({ type: 'addResponse', value: response });


		} catch (error) {
			console.log(error);
			response = 'Sorry, I could not find a response. Please try again.';
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
