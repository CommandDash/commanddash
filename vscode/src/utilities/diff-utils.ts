import * as vscode from 'vscode';
import { tempScheme, virtualDocumentProvider } from './virtual-document-provider';

export async function handleDiffViewAndMerge(
    editor: vscode.TextEditor,
    originalCodeUri: vscode.Uri,
    orignalCode: string,
    optimizedCode: string,
    context: vscode.ExtensionContext,
): Promise<void> {

    const posAtTime = editor.selection.active;

    // Create a temporary file with a .dart extension to show the diff
    const currentFileName = `${tempScheme}:current.dart`;
    const updateFileName = `${tempScheme}:updated.dart`;

    virtualDocumentProvider.addDocument(vscode.Uri.parse(currentFileName), orignalCode);
    virtualDocumentProvider.addDocument(vscode.Uri.parse(updateFileName), optimizedCode);

    let lhsUri = vscode.Uri.parse(currentFileName);
    let rhsUri = vscode.Uri.parse(updateFileName);

    // Open the diff view
    await vscode.commands.executeCommand(
        "vscode.diff",
        lhsUri,
        rhsUri,
        "Current Code ↔ Updated Code",
    );

    // Ask user if they want to merge changes
    let userChoice = await vscode.window.showInformationMessage(
        'Do you want to merge these changes?',
        'Yes', 'No'
    );

    if (!userChoice){
        return ; 
    }

    let reopenEditor = async () => {
        let document = await vscode.workspace.openTextDocument(originalCodeUri);
        await vscode.window.showTextDocument(document, {
          viewColumn: editor.viewColumn,
          preserveFocus: false,
          selection: new vscode.Range(posAtTime, posAtTime)
        });
    };
    
   
    if (userChoice === 'Yes') {
        vscode.commands.executeCommand('workbench.action.closeActiveEditor'); // assuming apply edit time will be enough for the diff to close so user doesn't see a jank.
        // Apply the optimized code
        const workspaceEdit = new vscode.WorkspaceEdit();
        const entireDocumentRange = new vscode.Range(
            editor.document.positionAt(0),
            editor.document.positionAt(editor.document.getText().length)
        );
        workspaceEdit.replace(originalCodeUri, entireDocumentRange, optimizedCode);
        if (await vscode.workspace.applyEdit(workspaceEdit)) {
            await reopenEditor();
        }
    } else {
        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
        await reopenEditor();
    }

    // remove the temporary documents
    virtualDocumentProvider.removeDocument(vscode.Uri.parse(`${tempScheme}:current.dart`));
    virtualDocumentProvider.removeDocument(vscode.Uri.parse(`${tempScheme}:updated.dart`));
}