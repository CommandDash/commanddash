import * as vscode from 'vscode';
import { logError } from './telemetry-reporter';

export class CacheManager {
    private static instance: CacheManager;
    private globalState: vscode.Memento;
    private workspaceState: vscode.Memento;

    private constructor(globalState: vscode.Memento, workspaceState: vscode.Memento) {
        this.globalState = globalState;
        this.workspaceState = workspaceState;
    }

    public static getInstance(globalState?: vscode.Memento, workspaceState?: vscode.Memento): CacheManager {
        if (!CacheManager.instance) {
            if (globalState && workspaceState) {
                CacheManager.instance = new CacheManager(globalState, workspaceState);
            } else {
                throw new Error('CacheManager not initialized. Call getInstance with Mementos first.');
            }
        }
        return CacheManager.instance;
    }

    private async getGlobalValue<T>(key: string): Promise<T | undefined> {
        return this.globalState.get<T>(key);
    }

    private async setGlobalValue<T>(key: string, value: T): Promise<void> {
        await this.globalState.update(key, value);
    }

    private async getWorkspaceValue<T>(key: string): Promise<T | undefined> {
        return this.workspaceState.get<T>(key);
    }

    private async setWorkspaceValue<T>(key: string, value: T): Promise<void> {
        await this.workspaceState.update(key, value);
    }

    async incrementInlineCompletionCount() {
        try {
            let currentCount: number = await this.getGlobalValue<number | undefined>("inline-count") ?? 0;
            currentCount++;
            await this.setGlobalValue<number>("inline-count", currentCount);
        } catch (error) {
            logError('incrementInlineCompletionCount', error);
            console.log("Failed updating cache for FlutterGpt!!");
        }
    }

    async getInlineCompletionCount(): Promise<number> {
        try {
            return await this.getGlobalValue<number | undefined>("inline-count") ?? 0;
        } catch (error) {
            logError('getInlineCompletionCount', error);
            console.log("Failed updating cache for FlutterGpt!!");
            return 0;
        }
    }

    async setGeminiCache(cacheData: string): Promise<void> {
        try {
            await this.setWorkspaceValue<string>("gemini-cache", cacheData);
        } catch (error) {
            logError('setGeminiCache', error);
            console.log("Failed updating cache for FlutterGpt!!");
        }
    }

    async getGeminiCache(): Promise<string | undefined> {
        try {
            return await this.getWorkspaceValue<string | undefined>("gemini-cache");
        } catch (error) {
            logError('getGeminiCache', error);
            console.log("Failed updating cache for FlutterGpt!!");
            return undefined;
        }
    }
}