import * as vscode from 'vscode';
import { extractDartCode, extractExplanation, extractReferenceTextFromEditor } from '../../utilities/code-processing';
import { getReferenceEditor } from '../../utilities/state-objects';
import { logEvent } from '../../utilities/telemetry-reporter';
import { GeminiRepository } from '../../repository/gemini-repository';
import { appendReferences } from '../../utilities/prompt_helpers';

export async function refactorCode(gemini: GeminiRepository, globalState: vscode.Memento, range: vscode.Range | undefined) {
    logEvent('refactor-code', { 'type': 'refractor' });
    try {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }

        var selectedCode = editor.document.getText(editor.selection);
        var replaceRange: vscode.Range | vscode.Position;
        replaceRange = editor.selection;
        if (!selectedCode) {
            if (range === undefined) {
                vscode.window.showErrorMessage('No code selected');
                return;
            }
            // if no code is selected, we use the range 
            selectedCode = editor.document.getText(range);
            replaceRange = range;
        }

        const instructions = await vscode.window.showInputBox({ prompt: "Enter refactor instructions" });
        if (!instructions) {
            return;
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Refactoring Code",
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

            let referenceEditor = getReferenceEditor(globalState);
            let prompt = `You're an expert Flutter/Dart coding assistant. Follow the instructions carefully and output response in the modified format.\n\n`;
            prompt += `Modify the following Flutter code based on the user instructions: ${instructions}\n\nHighlighted Code:\n${selectedCode}\n\nFull Code:\n${editor.document.getText()}\n\n`;
            prompt = appendReferences(referenceEditor, prompt);
            prompt += `Output the modified code in a single code block to be replaced over selected code.\n\n`;

            const result = await gemini.getCompletion([{
                'role': 'user',
                'parts': prompt
            }]);
            clearInterval(progressInterval);
            progress.report({ increment: 100 });

            const refactoredCode = extractDartCode(result);
            editor.edit((editBuilder) => {
                editBuilder.replace(replaceRange, refactoredCode);
            });
            vscode.window.showInformationMessage('Code refactored successfully!');
        });
    } catch (error: Error | unknown) {
        if (error instanceof Error) {
            vscode.window.showErrorMessage(`${error.message}`);
        } else {
            vscode.window.showErrorMessage(`Failed to refactor code: ${error}`);
        }
        return '';
    }
}