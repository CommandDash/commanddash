import * as vscode from 'vscode';
import { GenerationRepository } from "../repository/generation-repository";
import { GeminiRepository } from '../repository/gemini-repository';

export function getUserPrefferedModel(): GenerationRepository {
    const config = vscode.workspace.getConfiguration('fluttergpt');
    const apiKey = config.get<string>('apiKey');

    if (!apiKey) {
        throw new Error('No API key found');
    }
    return new GeminiRepository(apiKey);
}