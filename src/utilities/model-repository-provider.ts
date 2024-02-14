import * as vscode from 'vscode';
import { GenerationRepository } from "../repository/generation-repository";
import { GeminiRepository } from '../repository/gemini-repository';
import { SecretApiKeyManager } from './secret-storage-manager';

export async function getUserPrefferedModel(): Promise<GenerationRepository> {
    var apiKey = await SecretApiKeyManager.instance.getApiKey();

    if (!apiKey) {
        throw new Error('No API key found');
    }
    return new GeminiRepository(apiKey);
}