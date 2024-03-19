import * as vscode from 'vscode';
export class SecretManager {

    private constructor() { }

    private static instance: SecretManager;

    public static getInstance(): SecretManager {
        if (!SecretManager.instance) {
            SecretManager.instance = new SecretManager();
        }

        return SecretManager.instance;
    }

    public getApiKey(): string | undefined {
        const config = vscode.workspace.getConfiguration('fluttergpt');
        return config.get<string>('apiKey');
    }

    public getGithubAccessToken(): string | undefined {
        const config = vscode.workspace.getConfiguration('fluttergpt');
        return config.get<string>('accessToken');
    }

}