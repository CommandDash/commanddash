import * as vscode from 'vscode';

export class DiffViewAgent {
    static async handleResponse(userChoice: string, data: any, messageId: string) {
        const chip = data.chip;
        const optimizedCode = data.optimizedCode;
        const originalCodeUri = data.originalCodeUri;


        let document = vscode.workspace.textDocuments.find(function (e) {
            console.log(e.uri.toString(), originalCodeUri);
            return e.uri.toString() === originalCodeUri;
        });

        const selection = chip.referenceData.selection;
        if (!document) {
            // if document is not founds, open the document
            let uri = vscode.Uri.parse(originalCodeUri);
            document = await vscode.workspace.openTextDocument(uri);
            if (!document) {
                return;
            }
        }
        if (userChoice === 'accept') {

            vscode.commands.executeCommand('workbench.action.closeActiveEditor'); // assuming apply edit time will be enough for the diff to close so user doesn't see a jank.
            // Apply the optimized code
            const workspaceEdit = new vscode.WorkspaceEdit();
            const entireDocumentRange = new vscode.Range(
                document.positionAt(0),
                document.positionAt(document.getText().length)
            );
            workspaceEdit.replace(vscode.Uri.parse(originalCodeUri), entireDocumentRange, optimizedCode);
            const isSuccess = await vscode.workspace.applyEdit(workspaceEdit);
            if (isSuccess) {
                if (vscode.window.activeTextEditor?.document.uri.toString() !== document.uri.toString()) {
                    await vscode.window.showTextDocument(document, {
                        viewColumn: selection.start.character,
                        preserveFocus: false,
                        selection: new vscode.Range(new vscode.Position(selection.start.line, selection.start.character), new vscode.Position(selection.start.line, selection.start.character))
                    });
                }
            }

        } else {
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
            let openDocument = await vscode.workspace.openTextDocument(document.uri);
            // show text document if the document is not open
            if (vscode.window.activeTextEditor?.document.uri.toString() !== document.uri.toString()) {
                await vscode.window.showTextDocument(openDocument, {
                    viewColumn: selection.start.character,
                    preserveFocus: false,
                    selection: new vscode.Range(new vscode.Position(selection.start.line, selection.start.character), new vscode.Position(selection.start.line, selection.start.character))
                });
            }

        }
        return { role: "dash", parts: 'Code refactored successfully!', messageId: messageId, data: {}, buttons: [], agent: "messageView" };
    }
}