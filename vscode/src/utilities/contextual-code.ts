
import path = require('path');
import * as vscode from 'vscode';
import { SemanticTokensRegistrationType, SemanticTokensProviderShape, SymbolKind } from 'vscode-languageclient';
import { Outline } from '../shared/types/custom_protocols';
import { getCodeForRange, isPositionInElementDefinitionRange } from '../shared/utils';
import { Token } from '../shared/types/token';
import * as fs from 'fs';

export class ContextualCodeProvider {

    // This should return code, filepath and range for the contextual code
    public async getContextualCodeInput(document: vscode.TextDocument, range: vscode.Range, elementname: string | undefined): Promise<{ filePath: string }[] | undefined> {


        const docTokens = await this.getDocumentTokens(document, range);


        const tokensByFilePath = this.getTokensFilePathMap(docTokens, document);

        // Iterate over the new Map to construct the desired string
        let codes: { filePath: string }[] = [];
        for (const [filePath, tokenCodes] of tokensByFilePath) {
            const absoluteFilePath = path.join(vscode.workspace.rootPath || '', filePath);
            var codeObject: { filePath: string } = {
                filePath: absoluteFilePath,
            };
            codes.push(codeObject);
        }
        return codes;
    }

    // gets the contextual code for the given range.
    // Contextual code is the code for all the symbols referenced in the range.
    public async getContextualCode(document: vscode.TextDocument, range: vscode.Range, elementname: string | undefined): Promise<string | undefined> {

        const docTokens = await this.getDocumentTokens(document, range);


        const tokensByFilePath = this.getTokensFilePathMap(docTokens, document);

        // Iterate over the new Map to construct the desired string
        let code: string = "";
        for (const [filePath, tokenCodes] of tokensByFilePath) {
            code += `file path: ${filePath}\n`;
            for (const token of tokenCodes) {
                const symbolCode = "```dart\n" + token + "\n```";
                code += symbolCode + "\n";
            }
        }
        return code;
    }

    // gets the contextual code for the whole file.
    // Used for inline completions to handle cases where there is no method or class in context.
    public async getContextualCodeForCompletion(document: vscode.TextDocument,): Promise<string | undefined> {
        // provide code for tokens in the whole file. Avoid duplicate code for the same file.
        const docTokens = await this.getDocumentTokens(document, new vscode.Range(0, 0, document.lineCount - 1, 0));

        const tokensByFilePath = this.getTokensFilePathMap(docTokens, document);

        // Iterate over the new Map to construct the desired string
        let code: string = "";
        for (const [filePath, tokenCodes] of tokensByFilePath) {
            code += `file path: ${filePath}\n`;
            for (const token of tokenCodes) {
                const symbolCode = "```dart\n" + token + "\n```";
                code += symbolCode + "\n";
            }
        }
        return code;
    }



    private async getDocumentTokens(document: vscode.TextDocument, range: vscode.Range): Promise<Token[]> {

        // const semanticTokens = await shape?.range?.provideDocumentRangeSemanticTokens(document, range, tokenSource.token);
        // if (semanticTokens === undefined || semanticTokens?.data === undefined) {
        //     return [];
        // }
        const semanticTokens = await vscode.commands.executeCommand<vscode.SemanticTokens>(
            'vscode.provideDocumentSemanticTokens',
            document.uri
        );
        let tokens = await this.parseTokens(semanticTokens?.data!, document,);


        return tokens;
    }

    private getTokensFilePathMap(docTokens: Token[], document: vscode.TextDocument) {
        return docTokens.reduce((map, contextualSymbol) => {
            if (contextualSymbol.tokenType !== undefined &&
                ["Class", "Method", "ENUM"].includes(contextualSymbol.tokenType) &&
                contextualSymbol.code) {

                const filePath = contextualSymbol.path;
                // document path relative to the workspace folder with seperator
                const pathSeperator = path.sep; // add seperator to match the format
                const relativePath = pathSeperator + path.relative(vscode.workspace.getWorkspaceFolder(document.uri)!.uri.fsPath, document.uri.fsPath);
                if (relativePath !== filePath) {

                    if (!map.has(filePath)) {
                        map.set(filePath, new Set());
                    }
                    map.get(filePath)!.add(contextualSymbol.code);
                }
            }
            return map;
        }, new Map<string, Set<String>>());
    }


    private async parseTokens(tokensArray: Uint32Array, document: vscode.TextDocument,): Promise<Token[]> {
        const tokens: Token[] = [];
        let currentLine = 0;
        let currentStart = 0;

        for (let i = 0; i < tokensArray.length; i += 5) {
            const deltaLine = tokensArray[i];
            const deltaStart = tokensArray[i + 1];
            const length = tokensArray[i + 2];
            const tokenType = tokensArray[i + 3];
            const tokenModifiers = tokensArray[i + 4];

            currentLine += deltaLine;
            if (deltaLine > 0) {
                currentStart = deltaStart;
            } else {
                currentStart += deltaStart;
            }

            // get the name of the token using the range
            const range = new vscode.Range(currentLine, currentStart, currentLine, currentStart + length);
            const name = document.getText(range);


            const cancellationToken = new vscode.CancellationTokenSource();
            console.log("range", range);
            let definition: {
                targetUri?: vscode.Uri;
                targetRange?: vscode.Range;
                uri: vscode.Uri;
                range: vscode.Range;
            }[] = await vscode.commands.executeCommand('vscode.executeDefinitionProvider', document.uri, range.start, cancellationToken.token);
            console.log(typeof (definition[0]));

            // const definitionProvider =
            //     // await vscode.commands.executeCommand<vscode.DefinitionProvider>('vscode.executeDefinitionProvider', document.uri, range.start, cancellationToken.token);
            //     analyzer.client.getFeature('textDocument/definition').getProvider(document);
            // if (definitionProvider === undefined) {
            //     continue;
            // }
            // let definition_analyzer = await definitionProvider?.provideDefinition(document, range.start, cancellationToken.token) as vscode.LocationLink[];
            let uri = definition[0]?.targetUri ?? definition[0].uri;
            if (uri) {
                // check if same file as document. 
                // We don't want to show the code for the same file as we already pass the for for full file in the prompt.
                if (uri !== document.uri) {
                    // We add the code only for files in the current workspace. This is to avoid code from the sdk and other packages.
                    // TODO: Add support for code from other packages as well. This will be better for users who modulize their code into packages.
                    let workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
                    const legend = await vscode.commands.executeCommand<vscode.SemanticTokensLegend>(
                        'vscode.provideDocumentSemanticTokensLegend',
                        document.uri
                    );
                    console.log(legend);
                    var symbolkind = this.getSymbolKind(tokenType, legend);
                    if (workspaceFolder && this.toAddInContextualCode(this.getSymbolKind(tokenType, legend))) {
                        const code = await getCodeForRange(uri, definition[0].targetRange ?? definition[0].range);
                        if (code) {
                            tokens.push({
                                name: name,
                                tokenTypeNumber: tokenType,
                                tokenType: this.getSymbolKind(tokenType, legend),
                                line: currentLine,
                                start: currentStart,
                                length: length,
                                tokenModifiers: tokenModifiers,
                                code: code,
                                path: uri.fsPath.replace(workspaceFolder.uri.fsPath, "")
                            });
                        }
                    }
                }
            }

        }

        return tokens;
    }

    private toAddInContextualCode(kind: string | undefined): boolean {
        if (kind === undefined) {
            return false;
        }
        switch (kind) {
            case "Class":
            case "Method":
            case "ENUM":
                return true;
            default:
                return false;
        }
    }

    private getSymbolKind(kindNumber: number, legend: vscode.SemanticTokensLegend): string | undefined {
        var kind = legend.tokenTypes[kindNumber];
        if (kind === "function") {
            return 'Method';
        }
        return kind;
        switch (kindNumber) {
            case 2:
                return "Class";
            case 4:
                return "Method";
            case 7:
                return "ENUM";
            case 8:
                return "ENUM_CONSTANT";
            default:
                return undefined;
        }
    }
}