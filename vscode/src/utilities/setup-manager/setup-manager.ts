import * as vscode from 'vscode';
import { DartCLIClient, deleteExecutable } from "../commanddash-integration/dart-cli-client";
import { Auth } from "../auth/auth";

export enum SetupStep { github, apiKey, executable }

export class SetupManager {
    public pendingSetupSteps: SetupStep[] = [];
    private auth = Auth.getInstance();
    private dartClient: DartCLIClient | undefined;
    private context: vscode.ExtensionContext | undefined;
    private _onDidChangeSetup = new vscode.EventEmitter<SetupStep>();
    public onDidChangeSetup = this._onDidChangeSetup.event;
    private constructor() { }

    private static instance: SetupManager;

    public static getInstance(): SetupManager {
        if (!SetupManager.instance) {
            SetupManager.instance = new SetupManager();
        }

        return SetupManager.instance;
    }

    public async init(context: vscode.ExtensionContext): Promise<void> {
        this.context = context;
        if (!this.auth.getGithubAccessToken()) {
            this.pendingSetupSteps.push(SetupStep.github);
        }
        if (!this.auth.getApiKey()) {
            this.pendingSetupSteps.push(SetupStep.apiKey);
        }
        this.dartClient = DartCLIClient.init(this.context);

        if (!this.dartClient.executableExists()) {
            this.pendingSetupSteps.push(SetupStep.executable);
        } else {
            this.dartClient.connect();
            this.dartClient.backgroundUpdateExecutable();
        }
    }

    public async setupGithub() {
        await this.auth.signInWithGithub(this.context!);
        this._onDidChangeSetup.fire(SetupStep.github);
    }

    public async setupApiKey(apiKey: string) {
        await this.auth.setApiKey(apiKey);
        this._onDidChangeSetup.fire(SetupStep.apiKey);
    }

    public async setupExecutable(onProgress: (progress: number) => void) {
        await this.dartClient!.installExecutable(onProgress);
        this._onDidChangeSetup.fire(SetupStep.executable);
        this.dartClient!.connect();
    }
}