import * as vscode from 'vscode';
import { extractDartCode, extractExplanation, extractReferenceTextFromEditor } from '../../utilities/code-processing';
import { getReferenceEditor } from '../../utilities/state-objects';
import { logError, logEvent } from '../../utilities/telemetry-reporter';
import { GeminiRepository } from '../../repository/gemini-repository';
import { GenerationRepository } from '../../repository/generation-repository';

export async function createCodeFromBlueprint(generationRepository: GenerationRepository, globalState: vscode.Memento) {
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
            const result = await generationRepository.createCodeFromBlueprint(blueprint, globalState);
            clearInterval(progressInterval);
            progress.report({ increment: 100 });
            if (!result) {
                vscode.window.showErrorMessage('Failed to create code');
                return;
            }

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
