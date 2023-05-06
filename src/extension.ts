// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { OpenAIRepository } from './repository/openai-repository';
import {createWidgetFromDescription} from './tools/create/widget_from_description';
import {refactorCode} from './tools/refactor/refactor_from_instructions';
import {createModelClass} from './tools/create/class_model_from_json';
import {createResponsiveWidgetFromCode} from './tools/create/responsive_widget_from_code';
import {createResponsiveWidgetFromDescription} from './tools/create/responsive_widget_from_description';
import {fixErrors} from './tools/refactor/fix_errors';
import { createCodeFromBlueprint } from './tools/create/code_from_blueprint';
import { createRepoClassFromPostman } from './tools/create/class_repository_from_json';
import { addAsReference } from './tools/reference/add_reference';
import { open } from 'fs';
import { createCodeFromDescription } from './tools/create/code_from_description';
import { ReferenceProvider } from './tools/reference/reference_provider';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "fluttergpt" is now active!');

    let openAIRepo = initOpenAI();

    vscode.workspace.onDidChangeConfiguration(event => {
        let affected = event.affectsConfiguration("fluttergpt.apiKey");
        if (affected) { openAIRepo = initOpenAI();}
    });
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        throw new Error('No workspace folders found.');
    }
    const referenceFolderPath = path.join(workspaceFolder.uri.fsPath, '.fluttergpt_references');
    if (!fs.existsSync(referenceFolderPath)) {
    fs.mkdirSync(referenceFolderPath, { recursive: true });
    }
    const referenceProvider = new ReferenceProvider(referenceFolderPath);
    const referenceView = vscode.window.createTreeView('fluttergpt.References', {
    treeDataProvider: referenceProvider,
    });

    customPush('fluttergpt.createWidget', async () => createWidgetFromDescription(openAIRepo), context);
    customPush('fluttergpt.createCodeFromBlueprint', () => createCodeFromBlueprint(openAIRepo), context);
    customPush("fluttergpt.createModelClass", async () => createModelClass(openAIRepo), context);
    customPush('fluttergpt.createCodeFromDescription',() => createCodeFromDescription(openAIRepo), context);
    customPush('fluttergpt.refactorCode',() => refactorCode(openAIRepo), context);
    customPush('fluttergpt.fixErrors', async () => fixErrors(openAIRepo), context);
    customPush('fluttergpt.createRepoClassFromPostman', () => createRepoClassFromPostman(openAIRepo), context);
    customPush('fluttergpt.createResponsiveWidgetFromCode', () => createResponsiveWidgetFromCode(openAIRepo), context);
    customPush('fluttergpt.selectReference', ()=> addAsReference(context.globalState, referenceFolderPath), context);
    customUriPush('fluttergpt.createResponsiveWidgetFromDescription', openAIRepo, context);
    
    let referenceEditor: vscode.TextEditor | undefined;


    // const disposable1 = vscode.commands.registerCommand('fluttergpt.selectReference', () => {
    // vscode.workspace.openTextDocument({ content: '', language: 'dart' }).then((doc) => {
    //     vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.Two, preview: false }).then((editor) => {
    //     referenceEditor = editor;   
    //     });
    // });
    // });

    // const disposable2 = vscode.commands.registerCommand('fluttergpt.addReference', async () => {
    //     const editor = vscode.window.activeTextEditor;
    //     if(!editor) {
    //         vscode.window.showErrorMessage('Please open a file first.');
    //         return;
    //     }
    //     const referenceContent = editor.document.getText(editor.selection);

    //     if (referenceEditor) {
    //         const position = referenceEditor.selection.active;
    //         const snippet = new vscode.SnippetString(
    //         `Reference: ${editor.document.fileName}\n\`\`\`dart\n${referenceContent.toString()}\n\`\`\`\n`
    //         );
    //         referenceEditor.insertSnippet(snippet, position);
    //     } else {
    //         vscode.window.showErrorMessage('Please open the reference editor using "FlutterGPT: Select Reference" command first.');
    //     }
    // });
    
    //   context.subscriptions.push(disposable1);
    //   context.subscriptions.push(disposable2);
}

function initOpenAI(): OpenAIRepository {
    console.debug("creating new open ai repo instance");
    const config = vscode.workspace.getConfiguration('fluttergpt');
    const apiKey = config.get<string>('apiKey');
    return new OpenAIRepository(apiKey);
}

function customPush(name: string, handler: (...args: any[]) => any, context: vscode.ExtensionContext): void {
    let baseCommand = vscode.commands.registerCommand(name, handler);
    context.subscriptions.push(baseCommand);

    let menuCommand = vscode.commands.registerCommand(name + ".menu", handler);
    context.subscriptions.push(menuCommand);
}

function customUriPush(name: string,openAIRepo: OpenAIRepository, context: vscode.ExtensionContext):void{
    const command=vscode.commands.registerCommand(name, async (uri: vscode.Uri) => {
        await createResponsiveWidgetFromDescription(openAIRepo,uri);
    });
    context.subscriptions.push(command);
}


// This method is called when your extension is deactivated
export function deactivate() {
    
}
