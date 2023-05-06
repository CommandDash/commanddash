import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class ReferenceProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  constructor(private referenceFolderPath: string) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    if (element) {
      return [];
    } else {
      const referenceFiles = fs.readdirSync(this.referenceFolderPath);
      return referenceFiles.map((file) => {
        const filePath = path.join(this.referenceFolderPath, file);
        return {
          label: file,
          resourceUri: vscode.Uri.file(filePath),
          command: {
            command: 'vscode.open',
            title: '',
            arguments: [vscode.Uri.file(filePath)],
          },
          contextValue: 'referenceFile',
        };
      });
    }
  }
}