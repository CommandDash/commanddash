import * as vscode from 'vscode';
import { getReferenceEditor } from '../../utilities/state-objects';
import * as path from 'path';
import { logEvent } from '../../utilities/telemetry-reporter';
import { FlutterGPTViewProvider } from '../../providers/chat_view_provider';

export async function addToReference(globalState: vscode.Memento, flutterGPTViewProvider: FlutterGPTViewProvider) {
    logEvent('add-to-reference', { 'type': 'reference' });
    
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('Please open a file first.');
      return;
    }
  
    const referenceContent = editor.document.getText(editor.selection);
    const startLineNumber = editor.selection.start.line + 1;
    const endLineNumber = editor.selection.end.line + 1;
  

    const workspaceFolders  = vscode.workspace.workspaceFolders;
    let relativePath = editor.document.fileName;
    if (workspaceFolders && workspaceFolders.length > 0) {
      const workspaceRoot = workspaceFolders[0].uri.fsPath;
      relativePath = path.relative(workspaceRoot, editor.document.fileName);
    }

    flutterGPTViewProvider.postMessageToWebview({type: 'addToReference', value: JSON.stringify({relativePath: relativePath.trim(), referenceContent: `\`\n${relativePath.trim()}\n\`\n\`\`\`\n${referenceContent.toString()}\n\`\`\`\n`, startLineNumber, endLineNumber})});
  }

