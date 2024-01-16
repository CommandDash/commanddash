import * as vscode from 'vscode';
import { GeminiRepository } from '../../repository/gemini-repository';
import { logEvent } from '../../utilities/telemetry-reporter';
import path = require('path');


// async function startProcess(geminiRepo: GeminiRepository, globalState: vscode.Memento) {
//     vscode.window.withProgress({
//         location: vscode.ProgressLocation.Notification,
//         title: "FlutterGPT: Generating relevant suggestions",
//         cancellable: false}, (_progress, _token) => {
//             return createInlineCodeCompletion(geminiRepo, globalState);
//         });
// }

export async function createInlineCodeCompletion(geminiRepo: GeminiRepository, globalState: vscode.Memento) {
    logEvent('create-inline-code-completion', { 'type': "create" });

    const provider: vscode.InlineCompletionItemProvider = {
        async provideInlineCompletionItems(document, position, context, token) {
            // Ideal way would have been return [{insertText: "Suggestion here"}];
            // Since we need to reachout to gemini for code completion, we can't return a text instantaneously. 
            // So assign the result to  gobal state, and use it from there
            const output = globalState.get<string>('inline_code_completion_key', "");
            if (output.length === 0) {
                return;
            }
            const inlineList: vscode.InlineCompletionItem[] = [
                {
                    insertText: output,
                    command: {
                        command: "editor.action.format",
                        title: "Format"
                    },
                }
            ];
            globalState.update('inline_code_completion_key', '');
            return inlineList;
        }
    };

    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        cancellable: false,
        title: 'FlutterGPT: Generating code'
    }, async (progress) => {
        try {
            globalState.update('inline_code_completion_key', 'FlutterGPT: Generating suggestion');
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('No active editor');
                return;
            }
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders && workspaceFolders.length > 0) {
                const workspaceRoot = workspaceFolders[0].uri.fsPath;
                const currentFile = path.relative(workspaceRoot, editor.document.fileName);
                const currentLineContent = editor.document.lineAt(editor.selection.active.line).text.trim();
                const relevantFiles = await geminiRepo.findClosestDartFiles("Filename:" + currentFile + "\n\n" + "Line of code:" + currentLineContent);
                const prompt = "You've complete access to the flutter codebase. I'll provide you with top 5 relevant file's code as context and your job is do code completion for the line of code I'm providing. Respond with the code completion and inline comments only. Do not add detailed explanations. If you're unable to find answer for the requested prompt, return with a possible prediction of what this line of code might end up be. Here's the relevant file's code: \n\n" + relevantFiles + "\n\n and here is the line of code that needs completion:" + currentLineContent + "in the file" + currentFile + "at line" + editor.selection.active.line;
                const _conversationHistory: Array<{ role: string; parts: string }> = [];
                _conversationHistory.push({ role: "user", parts: prompt });
                const result = await geminiRepo.getCompletion(_conversationHistory);
                globalState.update('inline_code_completion_key', result);
                console.log(result + Date());
            }
        }
        catch (error: Error | unknown) {
            if (error instanceof Error) {
                vscode.window.showErrorMessage(`${error.message}`);
            } else {
                vscode.window.showErrorMessage(`Failed to generate code: ${error}`);
            }
        }
    });
    
    vscode.languages.registerInlineCompletionItemProvider({ pattern: '**/*.dart' }, provider);
}
