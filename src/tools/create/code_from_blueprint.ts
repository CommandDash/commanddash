import * as vscode from 'vscode';
import { extractDartCode, extractExplanation, extractReferenceTextFromEditor } from '../../utilities/code-processing';
import { getReferenceEditor } from '../../utilities/state-objects';
import { logError, logEvent } from '../../utilities/telemetry-reporter';
import { GeminiRepository } from '../../repository/gemini-repository';

export async function createCodeFromBlueprint(geminiRepo: GeminiRepository, globalState: vscode.Memento) {
    logEvent('create-code-from-blueprint', { 'type': "create" });
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
        let referenceEditor = getReferenceEditor(globalState);
        if (referenceEditor !== undefined) {
            const referenceText = extractReferenceTextFromEditor(referenceEditor);
            if (referenceText !== '') {
                prompt += `Keeping in mind these references/context:\n${referenceText}\n`;
            }
        }
        prompt += `Create Flutter/Dart code for the following blueprint: \n===${blueprint}\n===. Closely analyze the blueprint, see if any state management or architecture is specified and output complete functioning code in a single block.`;
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
            const result = await geminiRepo.getCompletion([{
                'role': 'user',
                'parts': prompt
            }]);
            clearInterval(progressInterval);
            progress.report({ increment: 100 });

            const dartCode = extractDartCode(result);
            editor.edit((editBuilder) => {

                editBuilder.replace(editor.selection, dartCode);

            });
            vscode.window.showInformationMessage('Code added successfully!');
        });

    } catch (error: Error | unknown) {
        logError('code-from-blueprint-error', error);
        if (error instanceof Error) {
            vscode.window.showErrorMessage(`${error.message}`);
        } else {
            vscode.window.showErrorMessage(`Failed to create code: ${error}`);
        }
    }
}
