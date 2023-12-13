/* eslint-disable @typescript-eslint/naming-convention */
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
import { addToReference } from './tools/reference/add_reference';
import { createCodeFromDescription } from './tools/create/code_from_description';
import { optimizeCode } from './tools/refactor/optimize_code';
import { savePebblePanel } from './pebbles/pebble_repository';
import { makeHttpRequest } from './repository/http-utils';
import { activateTelemetry, logEvent } from './utilities/telemetry-reporter';
import * as dotenv from 'dotenv';
import path = require('path');
import { PebblePanelViewProvider } from './pebbles/pebble-pabel-provider';
import { ExtensionVersionManager } from './utilities/update-check';
import { WellTestedActionProvider } from './providers/welltested_code_actions_provider';
import { ILspAnalyzer } from './shared/types/LspAnalyzer';
import { dartCodeExtensionIdentifier } from './shared/types/constants';

export const DART_MODE: vscode.DocumentFilter & { language: string } = { language: "dart", scheme: "file" };

const activeFileFilters: vscode.DocumentFilter[] = [DART_MODE];

export async function activate(context: vscode.ExtensionContext) {
 
	console.log('Congratulations, "fluttergpt" is now active!');
    
    dotenv.config({ path: path.join(__dirname, '../.env') });
    activateTelemetry(context);
    logEvent('activated');

    // Dart-code extenstion stuff
    const dartExt =  vscode.extensions.getExtension(dartCodeExtensionIdentifier);
	if (!dartExt) {
		// This should not happen since the FlutterGPT extension has a dependency on the Dart one
		// but just in case, we'd like to give a useful error message.
		throw new Error("The Dart extension is not installed, Flutter extension is unable to activate.");
	}
	await dartExt.activate();

	if (!dartExt.exports) {
		console.error("The Dart extension did not provide an exported API. Maybe it failed to activate or is not the latest version?");
		return;
	}
	const analyzer:ILspAnalyzer = dartExt.exports._privateApi.analyzer;

    let pebblePanelWebViewProvider: PebblePanelViewProvider;
     let pebbleView: vscode.Disposable;
    console.log(process.env["HOST"]);
    let openAIRepo = initOpenAI();
    context.subscriptions.push(
        vscode.window.registerUriHandler({
            handleUri(uri: vscode.Uri): vscode.ProviderResult<void> {
                console.log(uri);
                if(uri.path===process.env["success_path"]!){
                    const query=uri.query.split('&');   
                    const access_token=query[0].split('=')[1];
                    const refresh_token=query[1].split('=')[1];
                 Promise.all([
                        context.globalState.update('access_token',access_token),
                        context.globalState.update('refresh_token',refresh_token)
                  ]).then(()=>{
                    logEvent('login');
                    // show success message
                    vscode.window.showInformationMessage('Successfully logged in to FlutterGPT');
                    pebblePanelWebViewProvider.refresh();
               
                    }).catch((error)=>{
                        logEvent('login-failed', {error: error});
                        vscode.window.showErrorMessage('Error logging in to FlutterGPT');

                    });
                }
            }
        })
      );


	const wellTestedActionProvider = new WellTestedActionProvider(analyzer, openAIRepo, context);
    context.subscriptions.push(vscode.languages.registerCodeActionsProvider(activeFileFilters, wellTestedActionProvider));

      
    pebblePanelWebViewProvider = new PebblePanelViewProvider( context.extensionUri, context, openAIRepo);
    
      pebbleView = vscode.window.registerWebviewViewProvider(
        "fluttergpt.pebblePanel",
        pebblePanelWebViewProvider,
    );

    context.subscriptions.push(pebbleView);
      
    vscode.workspace.onDidChangeConfiguration(event => {
        let affected = event.affectsConfiguration("fluttergpt.apiKey");
        if (affected) { openAIRepo = initOpenAI();}
    });
    customPush('fluttergpt.addToReference', ()=> addToReference(context.globalState), context);
    customPush('fluttergpt.createWidget', async () => createWidgetFromDescription(openAIRepo, context.globalState), context);
    customPush('fluttergpt.createCodeFromBlueprint', () => createCodeFromBlueprint(openAIRepo, context.globalState), context);
    customPush("fluttergpt.createModelClass", async () => createModelClass(openAIRepo, context.globalState), context);
    customPush('fluttergpt.createCodeFromDescription',() => createCodeFromDescription(openAIRepo, context.globalState), context);
    customPush('fluttergpt.createRepoClassFromPostman', () => createRepoClassFromPostman(openAIRepo, context.globalState), context);
    customPush('fluttergpt.createResponsiveWidgetFromCode', () => createResponsiveWidgetFromCode(openAIRepo, context.globalState), context);
    customUriPush('fluttergpt.createResponsiveWidgetFromDescription', openAIRepo, context);
    customPush('fluttergpt.refactorCode',() => refactorCode(openAIRepo, context.globalState), context);
    customPush('fluttergpt.fixErrors', async () => fixErrors(openAIRepo, 'runtime', context.globalState), context);
    customPush('fluttergpt.optimizeCode', async (range: vscode.Range) => optimizeCode(openAIRepo, context.globalState, range), context);
    customPush('fluttergpt.savePebblePanel', () => savePebblePanel(openAIRepo,context), context);
    context.subscriptions.push(vscode.commands.registerCommand('fluttergpt.optimizeCode', optimizeCode));
    
    new ExtensionVersionManager(context).isExtensionUpdated();
}

export function promptGithubLogin(context:vscode.ExtensionContext): void {
    const refresh_token = context.globalState.get<string>('refresh_token');
    if (refresh_token) {
        return;
    }
    vscode.window.showInformationMessage('Please login to Github to use this feature', 'Login').then(async selection => {
        if (selection === 'Login') {
            try {
                const url = process.env["HOST"]!+process.env["github_oauth"]!;
                const github_oauth_url = await makeHttpRequest<{github_oauth_url:string}>({url:url});
                vscode.env.openExternal(vscode.Uri.parse(github_oauth_url.github_oauth_url));
            } catch (error) {
                vscode.window.showErrorMessage('Error logging in to fluttergpt');
            }
        }
    });

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
        await createResponsiveWidgetFromDescription(openAIRepo,uri, context.globalState);
    });
    context.subscriptions.push(command);
}


// This method is called when your extension is deactivated
export function deactivate() {
    console.log("Fluttergpt deactivated");   
}
