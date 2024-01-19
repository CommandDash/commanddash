import * as vscode from 'vscode';
import { extractDartCode, extractExplanation, extractReferenceTextFromEditor } from '../../utilities/code-processing';
import { getReferenceEditor } from '../../utilities/state-objects';
import { logEvent } from '../../utilities/telemetry-reporter';
import { GeminiRepository } from '../../repository/gemini-repository';
import { appendReferences } from '../../utilities/prompt_helpers';
import { ILspAnalyzer } from '../../shared/types/LspAnalyzer';
import { ContextualCodeProvider } from '../../utilities/contextual-code';
import { handleDiffViewAndMerge } from '../../utilities/diff-utils';

export async function optimizeCode(geminiRepo: GeminiRepository, globalState: vscode.Memento, range: vscode.Range | undefined, analyzer: ILspAnalyzer, elementName: string | undefined) {
    logEvent('optimize-code', { 'type': 'refractor' });
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor');
        return;
    }

    var selectedCode = editor.document.getText(editor.selection);
    var replaceRange: vscode.Range;
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

    const fullCode = editor.document.getText();


    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Optimizing Code",
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

            let contextualCode = await new ContextualCodeProvider().getContextualCode(editor.document, replaceRange, analyzer, elementName);

            let prompt = `You're an expert Flutter/Dart coding assistant. Follow the instructions carefully and output response in the modified format..\n\n`;
            prompt += `Develop and optimize the following Flutter code by troubleshooting errors, fixing errors, and identifying root causes of issues. Reflect and critique your solution to ensure it meets the requirements and specifications of speed, flexibility and user friendliness.\n\n Subject Code:\n${selectedCode}\n\n`;
            prompt += "Here is the full code for context:\n";
            prompt += "```" + fullCode + "```";
            prompt += "\n\n";
            if (contextualCode) {
                prompt += `Here are the definitions of the symbols used in the code\n${contextualCode}\n\n`;
            }
            let referenceEditor = getReferenceEditor(globalState);
            prompt = appendReferences(referenceEditor, prompt);
            prompt += `Output the optimized code in a single code block to be replaced over selected code.`;

            const result = await geminiRepo.getCompletion([{
                'role': 'user',
                'parts': prompt
            }]);

            clearInterval(progressInterval);
            progress.report({ increment: 100 });

            const optimizedCode = extractDartCode(result);
            // Pass the current editor, current document uri and optimized code respectively.
            await handleDiffViewAndMerge(editor, editor.document.uri, optimizedCode);
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