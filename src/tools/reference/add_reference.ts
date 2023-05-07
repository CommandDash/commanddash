import * as vscode from 'vscode';
import { getReferenceEditor } from '../../utilities/state-objects';
import * as path from 'path';

export async function addToReference(globalState: vscode.Memento) {
    
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('Please open a file first.');
      return;
    }
  
    const referenceContent = editor.document.getText(editor.selection);
  
    let referenceEditor: vscode.TextEditor | undefined;

    referenceEditor = getReferenceEditor(globalState);
  
    if (!referenceEditor) {
      const doc = await vscode.workspace.openTextDocument({ content: '', language: 'dart' });
      referenceEditor = await vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.Two, preview: false });
  
      // Store the reference editor in the global state
      await globalState.update('referenceEditorId', referenceEditor.document.uri.toString());
    }
    const position = referenceEditor.selection.active;

    const workspaceFolders  = vscode.workspace.workspaceFolders;
    let relativePath = editor.document.fileName;
    if (workspaceFolders && workspaceFolders.length > 0) {
      const workspaceRoot = workspaceFolders[0].uri.fsPath;
      relativePath = path.relative(workspaceRoot, editor.document.fileName);
    }
    const snippet = new vscode.SnippetString(
    `${relativePath}:\n\`\`\`\n${referenceContent.toString()}\n\`\`\`\n`
    );
    referenceEditor.insertSnippet(snippet, position);
    // Focus back on the original editor
    await vscode.window.showTextDocument(editor.document, { viewColumn: vscode.ViewColumn.One, preview: false });

  }

