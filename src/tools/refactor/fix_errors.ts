import * as vscode from 'vscode';
import { extractDartCode, extractExplanation, extractReferenceTextFromEditor } from '../../utilities/code-processing';
import { getReferenceEditor } from '../../utilities/state-objects';
import { logEvent } from '../../utilities/telemetry-reporter';
import { GeminiRepository } from '../../repository/gemini-repository';
import { appendReferences } from '../../utilities/prompt_helpers';
import { ILspAnalyzer } from '../../shared/types/LspAnalyzer';
import { ContextualCodeProvider } from '../../utilities/contextual-code';

export async function fixErrors(geminiRepo: GeminiRepository, errors: vscode.Diagnostic[], globalState: vscode.Memento, range: vscode.Range, analyzer: ILspAnalyzer) {
    logEvent('fix-errors', { 'type': 'refractor' });
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor');
        return;
    }

    var selectedCode = editor.document.getText(range);
    var replaceRange = range;
    let errorsDescription = errors.map((e) => `Message:${e.message}\nSeverity:${e.severity}`).join('\n');
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

            const contextualCode = await new ContextualCodeProvider().getContextualCode(editor.document, replaceRange, analyzer);

            let prompt = `Follow the instructions carefully and to the letter. You're a Flutter/Dart debugging expert.\n\n`;
            prompt += `Here's a piece of Flutter code with errors:\n\n${selectedCode}\n\n`;
            if (errorsDescription) {
                prompt += `The errors are: ${errorsDescription}\n\n`;
            } else {
                prompt += `The full code context is:\n\n${fullCode}\n\n`;
            }
            if (contextualCode) {
                prompt += `Here are the definitions of the symbols used in the code\n${contextualCode}\n\n`;
            }
            prompt = appendReferences(getReferenceEditor(globalState), prompt);

            prompt += `First give a short explanation and then output the fixed code in a single code block to be replaced over the selected code.`;

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