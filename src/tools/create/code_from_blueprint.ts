import * as vscode from 'vscode';
import { OpenAIRepository } from '../../repository/openai-repository';
import {extractDartCode, extractExplanation} from '../../utilities/code-processing';

export async function createCodeFromBlueprint(openAIRepo: OpenAIRepository) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor');
        return;
    }

    const blueprint = editor.document.getText(editor.selection);
    if (!blueprint) {
        vscode.window.showErrorMessage('No blueprint selected');
        return;
    }

    try {
        let prompt = `You're an expert Flutter/Dart coding assistant. Follow the user instructions carefully and to the letter.\n\n`;
        prompt+= `Create Flutter/Dart code for the following blueprint: ${blueprint}. Closely analyze the blueprint, see if any state management or architecture is specified and output complete functioning code in a single block.`;
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Creating Code",
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
                'role': 'user',
                'content': prompt
            }]);
            clearInterval(progressInterval);
            progress.report({ increment: 100 });

            const dartCode = extractDartCode(result);
            editor.edit((editBuilder) => {
              
                editBuilder.replace(editor.selection, dartCode);
     
            });
            vscode.window.showInformationMessage('Code added successfully!');
        });

    } catch (error) {
        vscode.window.showErrorMessage(`Failed to add code: ${error}`);
    }
}