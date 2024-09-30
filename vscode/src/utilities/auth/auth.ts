import * as vscode from 'vscode';
import { CacheManager } from '../cache-manager';
import { makeHttpRequest } from '../../repository/http-utils';

export class Auth {
    private constructor() { }

    private static instance: Auth;

    private cacheManager = CacheManager.getInstance();

    public static getInstance(): Auth {
        if (!Auth.instance) {
            Auth.instance = new Auth();
        }

        return Auth.instance;
    }

    public getApiKey(): string | undefined {
        const config = vscode.workspace.getConfiguration('fluttergpt');
        const apiKey = config.get<string>('apiKey');
        if (apiKey?.startsWith('sk-')) { // Don't account the old API Keys
            return;
        }
        return apiKey;
    }

    public async setApiKey(apiKey: string): Promise<void> {
        return vscode.workspace.getConfiguration().update("fluttergpt.apiKey", apiKey, vscode.ConfigurationTarget.Global);
    }

    public getGithubRefreshToken(): string | undefined {
        return this.cacheManager.getGlobalValue<string>('refresh_token');
    }

    public getGithubAccessToken(): string | undefined {
        return this.cacheManager.getGlobalValue<string>('access_token');
    }

    public async signInWithGithub(context: vscode.ExtensionContext): Promise<string> {
        const url = '/account/github/url/' + vscode.env.uriScheme;
        const { github_oauth_url } = await makeHttpRequest<{ github_oauth_url: string }>({ url: url });
        vscode.env.openExternal(vscode.Uri.parse(github_oauth_url));


        // Create a promise to handle the authentication callback
        const authPromise = new Promise<{ accessToken: string; refreshToken: string }>(
            (resolve, reject) => {
                context.subscriptions.push(
                    vscode.window.registerUriHandler({
                        handleUri(uri: vscode.Uri): vscode.ProviderResult<any> {
                            if (uri.path === '/login-success') {
                                const query = uri.query.split('&');
                                const accessToken = query[0].split('=')[1];
                                const refreshToken = query[1].split('=')[1];
                                resolve({ accessToken, refreshToken });
                            } else {
                                reject(new Error('Authentication Failed'));
                            }
                        },
                    })
                );
            }
        );

        // Wait for the promise to resolve and update the global state with the access and refresh tokens
        const { accessToken, refreshToken } = await authPromise;
        await this.cacheManager.setGlobalValue('access_token', accessToken);
        await this.cacheManager.setGlobalValue('refresh_token', refreshToken);
        return refreshToken;
    }

    public async signOutFromGithub(context: vscode.ExtensionContext): Promise<void> {
        // Remove the access and refresh tokens from the global state
        this.cacheManager.setGlobalValue('access_token', undefined);
        this.cacheManager.setGlobalValue('refresh_token', undefined);
    
        // Additional cleanup code if needed
        // For example, you might want to unregister the URI handler
        // context.subscriptions.forEach((subscription) => {
        //     subscription.dispose();
        // });
    }
}