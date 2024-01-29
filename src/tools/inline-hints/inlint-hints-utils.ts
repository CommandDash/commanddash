import * as vscode from 'vscode';

export async function isFirstLineOfSymbol(editor: vscode.TextEditor): Promise<boolean> {
    const cursorLine = editor.selection.active.line;

    // Retrieve the document symbols
    const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>('vscode.executeDocumentSymbolProvider', editor.document.uri);
    const flatSymbols: vscode.DocumentSymbol[] = [];

    // Flatten the symbol tree into an array
    function flattenSymbol(symbol: vscode.DocumentSymbol) {
        flatSymbols.push(symbol);
        if (symbol.children && symbol.children.length > 0) {
            symbol.children.forEach(child => flattenSymbol(child));
        }
    }

    if (symbols) {
        symbols.forEach(symbol => flattenSymbol(symbol));
    }

    // Check if the cursor is at the first line of a method, function, or class
    for (const symbol of flatSymbols) {
        if (symbol.kind === vscode.SymbolKind.Method || symbol.kind === vscode.SymbolKind.Function || symbol.kind === vscode.SymbolKind.Class) {
            if (symbol.range.start.line === cursorLine) {
                return true;
            }
        }
    }

    return false;
}