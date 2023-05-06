import * as vscode from 'vscode';

// Retrieve the reference editor from the global state
export function getReferenceEditor(globalState: vscode.Memento): vscode.TextEditor | undefined {
let referenceEditor: vscode.TextEditor | undefined;
  const referenceEditorId = globalState.get<string>('referenceEditorId');
  if (referenceEditorId) {
    referenceEditor = vscode.window.visibleTextEditors.find(
      (editor) => editor.document.uri.toString() === referenceEditorId
    );
  }
  return referenceEditor;
}