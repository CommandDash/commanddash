import * as vscode from 'vscode';
export abstract class GenerationRepository {
    protected apiKey?: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }
    public abstract optimizeCode(finalString: string, contextualCode: String | undefined, globalState: vscode.Memento): Promise<string | undefined>;
    public abstract fixErrors(finalString: string, contextualCode: String | undefined, errorsDescription: string, globalState: vscode.Memento): Promise<string | undefined>;
    public abstract refactorCode(finalString: string, contextualCode: String | undefined, instructions: string, globalState: vscode.Memento): Promise<string | undefined>;
    public abstract createModelClass(library: string | undefined, jsonStructure: string, includeHelpers: string | undefined, globalState: vscode.Memento): Promise<string | undefined>;
    public abstract createRepositoryFromJson(description: string, globalState: vscode.Memento): Promise<string | undefined>;
    public abstract createCodeFromBlueprint(blueprint: string, globalState: vscode.Memento): Promise<string | undefined>;
    public abstract createCodeFromDescription(aboveText: string, belowText: string, instructions: string, globalState: vscode.Memento): Promise<string | undefined>;
}
