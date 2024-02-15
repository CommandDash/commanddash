import * as vscode from 'vscode';

export const tempScheme = 'temp-files';

// insipred from https://github.com/ryu1kn/vscode-partial-diff/issues/2
// Full Documentation: https://code.visualstudio.com/api/extension-guides/virtual-documents
export const virtualDocumentProvider = new class VirtalDocumentProvider implements vscode.TextDocumentContentProvider{
    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
    onDidChange = this._onDidChange.event;
    private _documents = new Map<string, string>();

    addDocument(uri: vscode.Uri, doc: string) {
        this._documents.set(uri.toString(), doc);
        this._onDidChange.fire(uri); // Notify VS Code that the document has changed (when streaming responses)
    }

    removeDocument(uri: vscode.Uri) {
        this._documents.delete(uri.toString());
    }

    provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken): vscode.ProviderResult<string> {
       
		const document = this._documents.get(uri.toString());
		if (document) {
			return document;
		}
        throw new Error('No Document Found Error');
    }
};

