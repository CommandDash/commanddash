// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { OpenAIRepository } from './repository/openai-repository';
import {extractDartCode} from './utilities/code-processing';
import {refactorCode} from './tools/refactor_from_instructions';
import {debugErrors} from './tools/debug_errors';
import { open } from 'fs';
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "fluttergpt" is now active!');
    const config = vscode.workspace.getConfiguration('fluttergpt');
    const apiKey = config.get<string>('apiKey');
    if(!apiKey){
        return ;
    }
    const openAIRepo = new OpenAIRepository(apiKey);

    let disposable = vscode.commands.registerCommand('fluttergpt.createWidget', async () => {
        try {
            const description = await vscode.window.showInputBox({ prompt: "Enter widget description" });
            if (!description) {
                return;
            }
    
            // Show notification
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Creating Widget",
                cancellable: false
            }, async (progress) => {
                let progressPercentage = 0;
                let prevProgressPercentage = 0;
                const progressInterval = setInterval(() => {
                    prevProgressPercentage = progressPercentage;
                    progressPercentage = (progressPercentage + 10) % 100;
                    const increment = progressPercentage - prevProgressPercentage;
                    progress.report({ increment });
                }, 200);
                const result = await openAIRepo.getCompletion([{
                    role: 'system',
                    content: ''
                }, {
                    'role': 'user',
                    'content': `Create a Flutter Widget from the following description: ${description}`
                }]);
                clearInterval(progressInterval);
                progress.report({ increment: 100 });
    
                const dartCode = extractDartCode(result);
                const editor = vscode.window.activeTextEditor;
                if (editor) {
                    editor.edit((editBuilder) => {
                        const position = editor.selection.active;
                        editBuilder.insert(position, dartCode);
                    });
                    vscode.window.showInformationMessage('Widget created successfully!');
                } else {
                    vscode.window.showErrorMessage('No active editor');
                }
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create widget: ${error}`);
        }
    });

	context.subscriptions.push(disposable);

    let refactorDisposable = vscode.commands.registerCommand('fluttergpt.refactorCode',()=> refactorCode(openAIRepo));
    context.subscriptions.push(refactorDisposable);

    let debugErrorsDisposable = vscode.commands.registerCommand('fluttergpt.debugErrors', async () => debugErrors(openAIRepo));
    context.subscriptions.push(debugErrorsDisposable);
}


// This method is called when your extension is deactivated
export function deactivate() {}
