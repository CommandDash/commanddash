import * as vscode from 'vscode';

export class Auth {
    private constructor() { }

    private static instance: Auth;

    public static getInstance(): Auth {
        if (!Auth.instance) {
            Auth.instance = new Auth();
        }

        return Auth.instance;
    }

    public getApiKey(): string | undefined {
        const config = vscode.workspace.getConfiguration('fluttergpt');
        return config.get<string>('apiKey');
    }

    public getGithubAccessToken(): string | undefined {
        const config = vscode.workspace.getConfiguration('fluttergpt');
        return config.get<string>('accessToken');
    }

    public async signInWithGithub(): Promise<void> {}

    public async setApiKey(apiKey: string): Promise<void> {}
}