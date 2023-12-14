import * as vscode from 'vscode';
import { OpenAIRepository } from '../../repository/openai-repository';
import {extractDartCode, extractExplanation, extractReferenceTextFromEditor} from '../../utilities/code-processing';
import { getReferenceEditor } from '../../utilities/state-objects';
import { logEvent } from '../../utilities/telemetry-reporter';

export async function refactorCode(openAIRepo: OpenAIRepository, globalState: vscode.Memento, range: vscode.Range) {
    logEvent('refactor-code', { 'type': 'refractor' });
    try {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }

        const selection = editor.selection;
        var selectedCode = editor.document.getText(editor.selection);
        var replaceRange: vscode.Range | vscode.Position;
        replaceRange = editor.selection;
        if (!selectedCode) {
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
            let prompt=`You're an expert Flutter/Dart coding assistant. Follow the instructions carefully and to the letter.\n\n`;
            if(referenceEditor!==undefined){
                const referenceText = extractReferenceTextFromEditor(referenceEditor);
                if(referenceText!==''){
                    prompt+=`Here are user shared context/references: \n${referenceText}\n\n. Anaylze these well and use them to refactor the code.\n\n`;
                }
            }
            prompt+=`Refactor the following Flutter code based on the instructions: ${instructions}\n\nCode:\n${selectedCode}\n\n`;
            prompt+=`Output code in a single block`;
            
            const result = await openAIRepo.getCompletion([{
                'role': 'user',
                'content': prompt
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