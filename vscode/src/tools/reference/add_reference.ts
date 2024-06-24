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
      relativePath: relativePath.trim(), 
      referenceContent: `\`${relativePath.trim()}\`\n\`\`\`${extractFileExtension(fileName)}\n${referenceContent.toString()}\n\`\`\`\n`, 
      referenceData: {
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

/**
 * Extracts the extension from a given filename.
 * 
 * @param filename - The name of the file from which to extract the extension.
 * @returns The file extension without the dot, or an empty string if no extension is found.
 */
function extractFileExtension(filename: string): string {
  // Split the filename by dots
  const parts = filename.split('.');

  // If there are no dots or the last part is empty, return an empty string
  if (parts.length <= 1 || parts[parts.length - 1] === '') {
      return '';
  }

  // Return the last part as the extension
  return parts[parts.length - 1];
}