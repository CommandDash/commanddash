import * as vscode from 'vscode';
import { logError } from './telemetry-reporter';
import { ContentEmbedding } from '@google/generative-ai';
import * as path from 'path';
import { computeCodehash } from '../shared/utils';
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

    async setGeminiCache(cacheData: { [filePath: string]: { codehash: string, embedding: ContentEmbedding } }): Promise<void> {
        const excludePatterns = "**/{android,ios,web,linux,macos,windows,.dart_tool}/**";
        const pubspecs = await vscode.workspace.findFiles("**/pubspec.yaml", excludePatterns);
        if (pubspecs.length === 0) {
            throw new Error("No pubspec.yaml found in the workspace.");
        }
        // Get all the flutter projects in the workspace
        const flutterProjects = pubspecs.map((uri) => uri.fsPath);
        const cache: { [flutterProject: string]: { [filePath: string]: { codehash: string, embedding: ContentEmbedding } } } = {};

        // ITERATE OVER ALL THE FILES IN THE CACHE
        // Find the flutter project for the file
        // Add the file to the cache of that flutter project
        for (const filePath in cacheData) {
            const parentProjectPath = this.findParentFlutterProject(filePath, flutterProjects);
            if (parentProjectPath) {
                const key = "gemini-cache-" + computeCodehash(parentProjectPath);
                await this.setGlobalValue(key, JSON.stringify(cacheData));
            }
        }

    }

    async getGeminiCache(): Promise<string | undefined> {
        const excludePatterns = "**/{android,ios,web,linux,macos,windows,.dart_tool}/**";
        const pubspecs = await vscode.workspace.findFiles("**/pubspec.yaml", excludePatterns);
        if (pubspecs.length === 0) {
            throw new Error("No pubspec.yaml found in the workspace.");
        }

        // Get all the flutter projects in the workspace
        const flutterProjects = pubspecs.map((uri) => uri.fsPath);

        const activeCache: { [filePath: string]: { codehash: string, embedding: ContentEmbedding } } = {};
        // Return cache only for the parent flutter project of the current workspace
        for (const projectPath of flutterProjects) {
            const projectDir = path.dirname(projectPath);
            const key = "gemini-cache-" + projectDir;
            // await this.setGlobalValue<String>(key, "value");
            const cacheString = await this.getGlobalValue<string>(key);
            if (!cacheString) {
                continue;
            }
            const cache = JSON.parse(cacheString);
            // Add the cache for the project to the activeCache
            Object.assign(activeCache, cache);
        }

        return JSON.stringify(activeCache);
    }

    // Helper function to find parent Flutter project
    private findParentFlutterProject(filePath: string, flutterProjects: string[]) {
        let parentProjectPath = null;
        let maxCommonLength = -1;

        for (const projectPath of flutterProjects) {
            const projectDir = path.dirname(projectPath);

            // Check if the current projectDir is a prefix of the filePath
            if (filePath.startsWith(projectDir)) {
                const commonLength = projectDir.length;

                if (commonLength > maxCommonLength) {
                    maxCommonLength = commonLength;
                    parentProjectPath = projectDir;
                }
            }
        }

        return parentProjectPath;
    }
}