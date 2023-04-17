import * as vscode from 'vscode';
import { OpenAIRepository } from '../../repository/openai-repository';
import {extractDartCode} from '../../utilities/code-processing';

export async function createWidgetFromDescription(openAIRepo: OpenAIRepository) {
    try {
        const description = await vscode.window.showInputBox({ prompt: "Enter widget description" });
        if (!description) {
            return;
        }
        await vscode.window.withProgress({
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
            let prompt=`You're an expert Flutter/Dart coding assistant. Follow the user instructions carefully and to the letter.\n\n`;
            prompt+=`Create a Flutter Widget from the following description: ${description}.\n`;
            prompt+=`Output code in a single block`;
            const result = await openAIRepo.getCompletion([{
                'role': 'user',
                'content': prompt
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
}