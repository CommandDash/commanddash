/* eslint-disable @typescript-eslint/naming-convention */
import { APICommunicator } from "../utilities/api-communicator";
import { appendReferences } from "../utilities/prompt_helpers";
import { getReferenceEditor } from "../utilities/state-objects";
import * as vscode from 'vscode';
import { GenerationRepository } from "./generation-repository";

/**
 * This class is not currently active and will be implemented in a later phase of the roadmap
 * Represents the Welltested Repository.
 * This class is responsible for interacting with the Welltested API and performing code generation operations.
 * @extends GenerationRepository
 */
export class WelltestedRepostiory extends GenerationRepository {
    private api: APICommunicator;
    private static instance: WelltestedRepostiory;

    constructor(apiKey: string) {
        super(apiKey);
        this.api = new APICommunicator();
    }

    public static getInstance(apiKey: string): WelltestedRepostiory {
        if (!WelltestedRepostiory.instance) {
            WelltestedRepostiory.instance = new WelltestedRepostiory(apiKey);
        }
        return WelltestedRepostiory.instance;
    }

    // TODO: Add proper error handling here
    public async optimizeCode(finalString: string, contextualCode: String | undefined, globalState: vscode.Memento): Promise<string | undefined> {
        let referenceEditor = getReferenceEditor(globalState);
        let refrenceEditorText = appendReferences(referenceEditor, '');
        const response = await this.api.post<string>(
            '/ai/dev/optimizecode', {
            'reference_editor_code': refrenceEditorText,
            'contextual_code': contextualCode,
            'document_code_string': finalString,
        }
        );
        if (response === null) {
            return undefined;
        }
        return response;
    }
    public fixErrors(finalString: string, contextualCode: String | undefined, errorsDescription: string, globalState: vscode.Memento): Promise<string | undefined> {
        throw new Error("Method not implemented.");
    }
    public refactorCode(finalString: string, contextualCode: String | undefined, instructions: string, globalState: vscode.Memento): Promise<string | undefined> {
        throw new Error("Method not implemented.");
    }
    public createCodeFromBlueprint(blueprint: string, globalState: vscode.Memento): Promise<string | undefined> {
        throw new Error("Method not implemented.");
    }
    public createCodeFromDescription(aboveText: string, belowText: string, instructions: string, globalState: vscode.Memento): Promise<string | undefined> {
        throw new Error("Method not implemented.");
    }
    public createModelClass(library: string | undefined, jsonStructure: string, includeHelpers: string | undefined, globalState: vscode.Memento): Promise<string | undefined> {
        throw new Error("Method not implemented.");
    }
    public createRepositoryFromJson(description: string, globalState: vscode.Memento): Promise<string | undefined> {
        throw new Error("Method not implemented.");
    }
}