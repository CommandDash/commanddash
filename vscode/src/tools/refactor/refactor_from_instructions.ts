import * as vscode from 'vscode';
import { extractDartCode, filterSurroundingCode } from '../../utilities/code-processing';
import { logError, logEvent } from '../../utilities/telemetry-reporter';
import { ILspAnalyzer } from '../../shared/types/LspAnalyzer';
import { ContextualCodeProvider } from '../../utilities/contextual-code';
import { handleDiffViewAndMerge } from '../../utilities/diff-utils';
import { GenerationRepository } from '../../repository/generation-repository';
import { FlutterGPTViewProvider } from '../../providers/chat_view_provider';
import * as path from 'path';

export async function refactorCode(generationRepository: GenerationRepository, globalState: vscode.Memento, range: vscode.Range | undefined, analyzer: ILspAnalyzer, elementname: string | undefined, context: vscode.ExtensionContext, flutterGPTViewProvider: FlutterGPTViewProvider, usedEditor: vscode.TextEditor | undefined, instructions: string | undefined, showLoadingIndicator: boolean = true): Promise<string | undefined> {
    logEvent('refactor-code', { 'type': 'refractor' });
    try {
        const editor = usedEditor === undefined ? vscode.window.activeTextEditor : usedEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }

        // Get the entire document's text
        const entireDocumentText = editor.document.getText();

        var replaceRange: vscode.Range = range ?? editor.selection;

        // Get the selected text
        const selectedText = editor.document.getText(replaceRange);

        // If there's no selection, simply return or handle as needed
        if (!selectedText) {
            vscode.window.showErrorMessage('No code selected');
            return;
        }

        // Define the markers for highlighting
        const highlightStart = "<CURSOR_SELECTION>";
        const highlightEnd = "<CURSOR_SELECTION>";

        // Split the entire document into two parts, at the start of the selection
        const docStart = entireDocumentText.substring(0, editor.document.offsetAt(replaceRange.start));
        const docEnd = entireDocumentText.substring(editor.document.offsetAt(replaceRange.end));

        // Construct the final string with highlighted selected code
        const finalString = `${docStart}${highlightStart}${selectedText}${highlightEnd}${docEnd}`;

        if (!instructions) {

            const workspaceFolders = vscode.workspace.workspaceFolders;
            let filePath = editor.document.uri.fsPath;
            let relativePath = editor.document.fileName;
            const referenceContent = editor.document.getText(editor.selection);
            if (workspaceFolders && workspaceFolders.length > 0) {
                const workspaceRoot = workspaceFolders[0].uri.fsPath;
                relativePath = path.relative(workspaceRoot, editor.document.fileName);
            }
            const startLineNumber = replaceRange.start.line;
            const endLineNumber = replaceRange.end.line;
            const fileName = path.basename(editor.document.fileName);

            // focus chatView
            vscode.commands.executeCommand('dashai.chatView.focus');
            flutterGPTViewProvider.postMessageToWebview({
                type: 'setInput',
                value: "/refactor"
            });
            console.log('selected text', selectedText);
            flutterGPTViewProvider.postMessageToWebview({
                type: 'addToReference', value: JSON.stringify({
                    filePath,
                    relativePath: relativePath.trim(), referenceContent: `\`${relativePath.trim()}\`\n\`\`\`\n${selectedText.toString()}\n\`\`\`\n`, referenceData: {
                        'selection': {
                            'start': {
                                'line': replaceRange.start.line,
                                'character': replaceRange.start.character
                            },
                            'end': {
                                'line': replaceRange.end.line,
                                'character': replaceRange.end.character,
                            }
                        },
                        'editor': editor.document.uri.toString(),
                    }, startLineNumber, endLineNumber, fileName
                }),
            });
            return;
        }
        let documentRefactoredText = editor.document.getText(); // Get the entire document text
        const refactorCodeWithoutProgress = async () => {
            let contextualCode = await new ContextualCodeProvider().getContextualCode(editor.document, editor.selection, analyzer, elementname);
            const result = await generationRepository.refactorCode(finalString, contextualCode, instructions!, globalState);
            console.log(result);
            if (!result) {
                vscode.window.showErrorMessage('Failed to refactor code. Please try again.');
                return;
            }

            let refactoredCode = extractDartCode(result, false);
            if (!refactoredCode) {
                vscode.window.showErrorMessage('Failed to refactor code. Please try again.');
                return;
            }
            refactoredCode = refactoredCode.replace(/<CURSOR_SELECTION>/g, '');
            refactoredCode = filterSurroundingCode(editor.document.getText(), refactoredCode, replaceRange.start.line, replaceRange.end.line);
            console.log("Refactored code:", refactoredCode);

            // Modify the documentText string instead of the document directly
            const startOffset = editor.document.offsetAt(replaceRange.start);
            const endOffset = editor.document.offsetAt(replaceRange.end);
            documentRefactoredText = documentRefactoredText.substring(0, startOffset) + refactoredCode + documentRefactoredText.substring(endOffset);
        };
        if (showLoadingIndicator) {
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
                try {
                    await refactorCodeWithoutProgress();
                    vscode.window.showInformationMessage('Code refactored successfully!');
                } finally {
                    clearInterval(progressInterval);
                }
            });
        }
        else {
            await refactorCodeWithoutProgress();
        }
        // Pass the current editor, current document uri and optimized code respectively.
        handleDiffViewAndMerge(editor, editor.document.uri, editor.document.getText(), documentRefactoredText, context, showLoadingIndicator);
        return documentRefactoredText;
    } catch (error: Error | unknown) {
        logError('refactor-from-instructions-error', error);
        if (error instanceof Error) {
            vscode.window.showErrorMessage(`${error.message}`);
        } else {
            vscode.window.showErrorMessage(`Failed to refactor code: ${error}`);
        }
        return '';
    }
}
