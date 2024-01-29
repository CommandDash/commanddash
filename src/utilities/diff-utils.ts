import * as vscode from 'vscode';

export async function handleDiffViewAndMerge(
    editor: vscode.TextEditor,
    originalCodeUri: vscode.Uri,
    optimizedCode: string,
    context: vscode.ExtensionContext,
): Promise<void> {
    // Create a temporary file with a .dart extension to show the diff
    const fileName = originalCodeUri.fsPath.split('/').pop()?.replace('.dart', '.optimized.dart') ?? 'optimized.dart';
    const tempFileUri = vscode.Uri.joinPath(context.storageUri!, fileName);
    await vscode.workspace.fs.writeFile(tempFileUri, Buffer.from(optimizedCode, 'utf8'));


    // Open the diff view
    await vscode.commands.executeCommand(
        "vscode.diff",
        originalCodeUri,
        tempFileUri,
        "Current Code ↔ Optimized Code"
    );

    // Register an event to delete the temp file when it's closed
    const closeSubscription = vscode.workspace.onDidCloseTextDocument(async document => {
        if (document.uri.toString() === tempFileUri.toString()) {
            try {
                await vscode.workspace.fs.delete(tempFileUri, { recursive: true, useTrash: false });
            } catch (error) {
                console.error('Failed to delete temporary file:', error);
            }
            closeSubscription.dispose();
        }
    });

    // Ask user if they want to merge changes
    let userChoice = await vscode.window.showInformationMessage(
        'Do you want to merge these changes?',
        'Yes', 'No'
    );

    if (userChoice !== null) {
        closeSubscription.dispose();
    }

    if (userChoice === 'Yes') {
        // Apply the optimized code
        const workspaceEdit = new vscode.WorkspaceEdit();
        const entireDocumentRange = new vscode.Range(
            editor.document.positionAt(0),
            editor.document.positionAt(editor.document.getText().length)
        );
        workspaceEdit.replace(originalCodeUri, entireDocumentRange, optimizedCode);
        await vscode.workspace.applyEdit(workspaceEdit);
    }

    // Close the diff view and delete the temporary file
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    try {
        await vscode.workspace.fs.delete(tempFileUri, { recursive: true, useTrash: false });
    } catch (error) {
        console.error('Failed to delete temporary file:', error);
    }
}