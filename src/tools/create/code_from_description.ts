import * as vscode from 'vscode';
import { OpenAIRepository } from '../../repository/openai-repository';
import { extractDartCode } from '../../utilities/code-processing';

export async function createCodeFromDescription(openAIRepo: OpenAIRepository) {
    try {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }

        var { aboveText, belowText, cursorLine } = getCodeAroundCursor(editor);

        const instructions = await vscode.window.showInputBox({ prompt: "Enter refactor instructions" });
        if (!instructions) {
            return;
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Generating code",
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
            let prompt = `You're an expert Flutter/Dart coding assistant. Follow the user instructions carefully and to the letter.\n\n`;
            prompt += `Create a valid Dart code block based on the following instructions:\n${instructions}\n\n`;
            prompt += `To give you more context, here's `;
            if (aboveText.length > 0) {
                prompt += `the code above the line where you're asked to insert the code: \n ${aboveText}\n\n`;
            }
            if (belowText.length > 0) {
                if (aboveText.length > 0) {prompt += `And here's `;}
                prompt += `the code below the line where you're asked to insert the code: \n ${belowText}\n\n`;
            }
            prompt += `Should you have any general suggestions, add them as comments before the code block. Inline comments are also welcome`;

            const result = await openAIRepo.getCompletion([{
                'role': 'user',
                'content': prompt
            }]);

            clearInterval(progressInterval);
            progress.report({ increment: 100 });

            const createdCode = extractDartCode(result);

            editor.edit((editBuilder) => {
                const selection = new vscode.Selection(cursorLine, 0, cursorLine, 0);
                editBuilder.insert(selection.end, '\n');
                editBuilder.insert(selection.end, createdCode);                
                
            });
            vscode.window.showInformationMessage('Code created successfully!');
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to generate code: ${error}`);
    }

    function getCodeAroundCursor(editor: vscode.TextEditor) {
        const maxWords = 2500;

        const cursorLine = editor.selection.active.line;
        let lineAbove = cursorLine - 1;
        let lineBelow = cursorLine + 1;
        let aboveWordCounter = 0;
        let belowWordCounter = 0;

        let iterationCounter = 0;
        while (iterationCounter < 1024) {
            let outOfAboveLines = lineAbove < 0;
            let outOfBelowLines = lineBelow >= editor.document.lineCount;
            if (outOfAboveLines && outOfBelowLines) {
                break;
            }

            if (!outOfAboveLines) {
                aboveWordCounter += editor.document.lineAt(lineAbove).text.split(' ').length;
                if (aboveWordCounter + belowWordCounter > maxWords) { break; }
            }

            if (!outOfBelowLines) {
                belowWordCounter += editor.document.lineAt(lineBelow).text.split(' ').length;
                if (aboveWordCounter + belowWordCounter > maxWords) { break; }
            }

            lineAbove--;
            lineBelow++;
            iterationCounter++;
        }

        if (lineAbove < 0) { lineAbove = 0; }
        if (lineBelow >= editor.document.lineCount) { lineBelow = editor.document.lineCount - 1; }

        var aboveText = editor.document.getText(new vscode.Range(lineAbove, 0, cursorLine + 1, 0));
        var belowText = editor.document.getText(new vscode.Range(cursorLine + 1, 0, lineBelow, 0));
        return { aboveText, belowText, cursorLine };
    }
}