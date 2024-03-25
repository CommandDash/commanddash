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

    public getGlobalValue<T>(key: string): T | undefined {
        return this.globalState.get<T>(key);
    }

    public async setGlobalValue<T>(key: string, value: T): Promise<void> {
        await this.globalState.update(key, value);
    }

    private getWorkspaceValue<T>(key: string): T | undefined {
        return this.workspaceState.get<T>(key);
    }

    private async setWorkspaceValue<T>(key: string, value: T): Promise<void> {
        await this.workspaceState.update(key, value);
    }

    async incrementInlineCompletionCount() {
        try {
            let currentCount: number = this.getGlobalValue<number | undefined>("inline-count") ?? 0;
            currentCount++;
            await this.setGlobalValue<number>("inline-count", currentCount);
        } catch (error) {
            logError('incrementInlineCompletionCount', error);
            console.log("Failed updating cache for FlutterGpt!!");
        }
    }

    public getInlineCompletionCount(): number {
        try {
            return this.getGlobalValue<number | undefined>("inline-count") ?? 0;
        } catch (error) {
            logError('getInlineCompletionCount', error);
            console.log("Failed updating cache for FlutterGpt!!");
            return 0;
        }
    }
}