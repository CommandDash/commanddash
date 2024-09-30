import * as vscode from 'vscode';
import { DartCLIClient, deleteExecutable } from "../commanddash-integration/dart-cli-client";
import { Auth } from "../auth/auth";
import { refreshAccessToken } from '../../repository/http-utils';

export enum SetupStep { github, executable }

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
        // this.dartClient = DartCLIClient.init(this.context);
        // this.dartClient.onGlobalError((error) => {

        //     vscode.window.showInformationMessage('Error processing an open task. Please consider closing existing tasks or restart IDE if there is trouble using CommandDash', {
        //         detail: error
        //     });
        //     console.log(error);
        // });
        // this.dartClient.onProcessOperation('refresh_access_token', async (message) => {
        //     let refreshToken = this.auth.getGithubRefreshToken();
        //     if (refreshToken) {
        //         let accessToken = await refreshAccessToken(refreshToken, context);
        //         this.dartClient?.sendOperationResponse(message, {
        //             'access_token': accessToken
        //         });
        //     } else {
        //         throw Error('No refresh token available.');
        //     }
        // });

        // if (!this.dartClient.executableExists()) {
        //     this.pendingSetupSteps.push(SetupStep.executable);
        // } else {
        //     this.dartClient.connect();
        //     try {
        //         this.dartClient.backgroundUpdateExecutable();
        //     } catch (error) {
        //         console.log(`Error: ${error}`);
        //     }
        // }
    }

    public async updatePendingSteps() {

        if (!this.auth.getGithubAccessToken()) {
            this.pendingSetupSteps.push(SetupStep.github);
        }
        // if (this.dartClient && !this.dartClient.executableExists()) {
        //     this.pendingSetupSteps.push(SetupStep.executable);
        // }
        if (this.auth.getGithubAccessToken() && (this.dartClient && this.dartClient.executableExists())) {
            this.pendingSetupSteps.length = 0;
        }
    }

    public async setupGithub() {
        await this.auth.signInWithGithub(this.context!);
        this._onDidChangeSetup.fire(SetupStep.github);
    }

    public async setupExecutable(onProgress: (progress: number) => void) {
        await this.dartClient!.installExecutable(onProgress);
        this._onDidChangeSetup.fire(SetupStep.executable);
        this.dartClient!.connect();
    }

    public async deleteExecutable() {
        return this.dartClient?.deleteExecutable();
    }

    public async deleteGithub() {
        return this.auth.signOutFromGithub(this.context!);
    }
}