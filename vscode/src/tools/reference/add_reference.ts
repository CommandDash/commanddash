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


  const workspaceFolders = vscode.workspace.workspaceFolders;
  const fileName = path.basename(editor.document.fileName);
  let relativePath = editor.document.fileName;
  const filePath = editor.document.uri.fsPath;
  if (workspaceFolders && workspaceFolders.length > 0) {
    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    relativePath = path.relative(workspaceRoot, editor.document.fileName);
  }

  flutterGPTViewProvider.postMessageToWebview({
    type: 'addToReference', value: JSON.stringify({
      filePath,
      relativePath: relativePath.trim(), referenceContent: `\n\`\`\`\n${referenceContent.toString()}\n\`\`\`\n`, referenceData: {
        'selection': {
          'start': {
            'line': startLineNumber,
            'character': 0
          },
          'end': {
            'line': endLineNumber,
            'character': 0
          }
        },
        'editor': editor.document.uri.toString(),
      }, startLineNumber, endLineNumber, fileName
    }),

  });
}

