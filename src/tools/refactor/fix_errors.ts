import * as vscode from 'vscode';
import { extractDartCode, extractExplanation, extractReferenceTextFromEditor } from '../../utilities/code-processing';
import { getReferenceEditor } from '../../utilities/state-objects';
import { logEvent } from '../../utilities/telemetry-reporter';
import { GeminiRepository } from '../../repository/gemini-repository';

export async function fixErrors(geminiRepo: GeminiRepository, errors: vscode.Diagnostic[], globalState: vscode.Memento, range: vscode.Range) {
    logEvent('fix-errors', { 'type': 'refractor' });
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor');
        return;
    }

    var selectedCode = editor.document.getText(editor.selection);
    var replaceRange: vscode.Range | vscode.Position;
    replaceRange = editor.selection;
    if (!selectedCode) {
        // if no code is selected, we use the range 
        selectedCode = editor.document.getText(range);
        replaceRange = range;
    }

    let errorsDescription = errors.map((e) => e.message).join(', ');

    const fullCode = editor.document.getText();

    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Debugging Errors",
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

            let prompt = `Follow the instructions carefully and to the letter. You're a Flutter/Dart debugging expert.\n\n`;
            prompt += `Here's a piece of Flutter code with errors:\n\n${selectedCode}\n\n`;
            if (errorsDescription) {
                prompt += `The errors are: ${errorsDescription}\n\n`;
            } else {
                prompt += `The full code context is:\n\n${fullCode}\n\n`;
            }
            let referenceEditor = getReferenceEditor(globalState);
            if (referenceEditor !== undefined) {
                const referenceText = extractReferenceTextFromEditor(referenceEditor);
                if (referenceText !== '') {
                    prompt += `Some references that might help: \n${referenceText}\n`;
                }
            }
            prompt += `First give a short explanation and then output the fixed code in a single code block.`;

            const result = await geminiRepo.getCompletion([{
                'role': 'user',
                'parts': prompt
            }]);
            clearInterval(progressInterval);
            progress.report({ increment: 100 });

            const fixedCode = extractDartCode(result);
            const explanation = extractExplanation(result);
            editor.edit((editBuilder) => {
                editBuilder.replace(replaceRange, fixedCode);
            });
            vscode.window.showInformationMessage(explanation);
        });
    } catch (error: Error | unknown) {
        if (error instanceof Error) {
            vscode.window.showErrorMessage(`${error.message}`);
        } else {
            vscode.window.showErrorMessage(`Failed to fix code: ${error}`);
        }
        return '';
    }
}