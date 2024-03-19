import * as vscode from 'vscode';
import { DartCLIClient } from "../commanddash-integration/dart-cli-client";
import { Auth } from "../auth/auth";

enum SetupStep { github, apiKey, executable }

export class SetupManager {
    public pendingSetupSteps: SetupStep[] = [];
    private auth = Auth.getInstance();
    private dartClient : DartCLIClient | undefined;
    private constructor() { }

    private static instance: SetupManager;

    public static getInstance(): SetupManager {
        if (!SetupManager.instance) {
            SetupManager.instance = new SetupManager();
        }

        return SetupManager.instance;
    }

    public async init(context: vscode.ExtensionContext): Promise<void> {
        if(!this.auth.getGithubAccessToken()){
            this.pendingSetupSteps.push(SetupStep.github);
        }
        if(!this.auth.getApiKey()){
            this.pendingSetupSteps.push(SetupStep.apiKey);
        }
        this.dartClient = DartCLIClient.init(context);
        const version = await this.dartClient.executableVersion();
        if(!version){
            this.pendingSetupSteps.push(SetupStep.executable);
        } else {
            this.dartClient.connect();
            this.dartClient.backgroundUpdateExecutable();
        }
    }

    public async setupGithub() {
        await this.auth.signInWithGithub();
    }
    public async setupApiKey(apiKey: string) {
        await this.auth.setApiKey(apiKey);
    }

    public async setupExecutable(onProgress: (progress: number) => void) {
        await this.dartClient!.installExecutable(onProgress);
        this.dartClient!.connect();
    }
}