
import path = require('path');
import * as vscode from 'vscode';
import { SemanticTokensRegistrationType, SemanticTokensProviderShape, SymbolKind } from 'vscode-languageclient';
import { ILspAnalyzer } from '../shared/types/LspAnalyzer';
import { Outline } from '../shared/types/custom_protocols';
import { getCodeForRange, isPositionInElementDefinitionRange } from '../shared/utils';
import { Token } from '../shared/types/token';
export class ContextualCodeProvider {

    public async getContextualCode(document: vscode.TextDocument, range: vscode.Range, analyzer: ILspAnalyzer, elementname: string | undefined): Promise<string | undefined> {
        const checkSymbols = (symbols: Outline[]): Outline | undefined => {
            for (const symbol of symbols) {
                if (isPositionInElementDefinitionRange(symbol, range.start)) {
                    return symbol;
                }
                if (symbol.children) {
                    const result = checkSymbols(symbol.children);
                    if (result !== undefined) {
                        return result;
                    }
                }
            }
            return undefined;
        };

        // get the target symbol if the elementname is not provided. This is the case when the user selects a range of code.
        // The elementName is used to avoid adding target symbol in the contextual code.
        if (elementname === undefined) {
            const outline = await analyzer.fileTracker.waitForOutline(document);

            if (outline === undefined) {
                return undefined;
            }
            const outlineSymbols = outline?.children || [];
            // parse the outline to get all top level symbols
            const symbol = checkSymbols(outlineSymbols);
            if (symbol !== undefined) {
                elementname = symbol.element.name;
            }
        }
        const docTokens = await this.getDocumentTokens(document, analyzer, range);


        const tokensByFilePath = docTokens.reduce((map, contextualSymbol) => {
            if (contextualSymbol.tokenType !== undefined &&
                ["Class", "Method", "ENUM"].includes(contextualSymbol.tokenType) &&
                contextualSymbol.name !== elementname &&
                contextualSymbol.code) {

                const filePath = contextualSymbol.path;
                if (!map.has(filePath)) {
                    map.set(filePath, []);
                }
                map.get(filePath)!.push(contextualSymbol);
            }
            return map;
        }, new Map<string, Token[]>());

        // Iterate over the new Map to construct the desired string
        let code: string = "";
        for (const [filePath, tokens] of tokensByFilePath) {
            code += `file path: ${filePath}\n`;
            for (const token of tokens) {
                const symbolCode = "```dart\n" + token.code + "\n```";
                code += symbolCode + "\n";
            }
        }
        return code;
    }



    private async getDocumentTokens(document: vscode.TextDocument, analyzer: ILspAnalyzer, range: vscode.Range): Promise<Token[]> {

        let tokenSource = new vscode.CancellationTokenSource();
        const shape = analyzer.client.getFeature(SemanticTokensRegistrationType.method).getProvider(document)! as SemanticTokensProviderShape;
        const semanticTokens = await shape.range!.provideDocumentRangeSemanticTokens(document, range, tokenSource.token);
        let tokens = await this.parseTokens(semanticTokens?.data!, document, analyzer);


        return tokens;
    }



    private async parseTokens(tokensArray: Uint32Array, document: vscode.TextDocument, analyzer: ILspAnalyzer): Promise<Token[]> {
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
            const definitionProvider = analyzer.client.getFeature('textDocument/definition').getProvider(document);
            if (definitionProvider === undefined) {
                continue;
            }
            let definition = await definitionProvider?.provideDefinition(document, range.start, cancellationToken.token) as vscode.LocationLink[];

            let uri = definition[0]?.targetUri;
            if (uri) {
                // check if same file as document. 
                // We don't want to show the code for the same file as we already pass the for for full file in the prompt.
                if (uri !== document.uri) {
                    // We add the code only for files in the current workspace. This is to avoid code from the sdk and other packages.
                    // TODO: Add support for code from other packages as well. This will be better for users who modulize their code into packages.
                    let workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
                    if (workspaceFolder && this.toAddInContextualCode(this.getSymbolKind(tokenType))) {
                        const code = await getCodeForRange(uri, definition[0].targetRange);
                        if (code) {
                            tokens.push({
                                name: name,
                                tokenTypeNumber: tokenType,
                                tokenType: this.getSymbolKind(tokenType),
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

    private getSymbolKind(kindNumber: number): string | undefined {
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