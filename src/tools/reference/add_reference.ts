import * as vscode from 'vscode';


export async function addAsReference(globalState: vscode.Memento) {
    
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('Please open a file first.');
      return;
    }
  
    const referenceContent = editor.document.getText(editor.selection);
  
    let referenceEditor: vscode.TextEditor | undefined;
  
    // Retrieve the reference editor from the global state
    const referenceEditorId = globalState.get<string>('referenceEditorId');
    if (referenceEditorId) {
      referenceEditor = vscode.window.visibleTextEditors.find(
        (editor) => editor.document.uri.toString() === referenceEditorId
      );
    }
  
    if (!referenceEditor) {
      const doc = await vscode.workspace.openTextDocument({ content: '', language: 'dart' });
      referenceEditor = await vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.Two, preview: false });
  
      // Store the reference editor in the global state
      await globalState.update('referenceEditorId', referenceEditor.document.uri.toString());
    }
  
    if (referenceEditor) {
        const position = referenceEditor.selection.active;
        const snippet = new vscode.SnippetString(
        `Reference: ${editor.document.fileName}\n\`\`\`dart\n${referenceContent.toString()}\n\`\`\`\n`
        );
        referenceEditor.insertSnippet(snippet, position);
        // Focus back on the original editor
        await vscode.window.showTextDocument(editor.document, { viewColumn: vscode.ViewColumn.One, preview: false });
    } else {
      vscode.window.showErrorMessage('Please open the reference editor using "FlutterGPT: Select Reference" command first.');
    }
  }

