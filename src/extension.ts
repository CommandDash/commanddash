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
import { open } from 'fs';
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

    customPush('fluttergpt.createWidget', async () => createWidgetFromDescription(openAIRepo), context);
    customPush('fluttergpt.createCodeFromBlueprint', () => createCodeFromBlueprint(openAIRepo), context);
    customPush("fluttergpt.createModelClass", async () => createModelClass(openAIRepo), context);
    customPush('fluttergpt.refactorCode',() => refactorCode(openAIRepo), context);
    customPush('fluttergpt.fixErrors', async () => fixErrors(openAIRepo), context);
    customPush('fluttergpt.createRepoClassFromPostman', () => createRepoClassFromPostman(openAIRepo), context);
    customPush('fluttergpt.createResponsiveWidgetFromCode', () => createResponsiveWidgetFromCode(openAIRepo), context);
    customUriPush('fluttergpt.createResponsiveWidgetFromDescription', openAIRepo, context);
    

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
export function deactivate() {}
