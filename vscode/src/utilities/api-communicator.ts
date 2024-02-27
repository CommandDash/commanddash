import axios, { AxiosResponse } from 'axios';
import * as vscode from 'vscode';
import * as path from 'path';

export async function getWelltestedKey(): Promise<string> {
    if (vscode.workspace.workspaceFolders === undefined) {
        vscode.window.showErrorMessage(' No active workspace found');
        throw new Error("No active workspace found");
    }
    const envPath = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, '.env');
    const dotenv = require('dotenv');
    const env = dotenv.config({ path: envPath });
    const WELLTESTED_API = env.parsed?.WELLTESTED_API;
    if (!WELLTESTED_API) {
        throw new Error("No WELLTESTED_API found in .env file");
    }
    return WELLTESTED_API;
}

export class APICommunicator {
    private apiUrl: string;

    constructor() {
        this.apiUrl = 'http://api.welltested.ai';
    }

    async post<T>(url: string, data: Record<string, unknown>): Promise<T | null> {
        try {
            const apiKey = await getWelltestedKey();
            const response: AxiosResponse<T> = await axios.post(`${this.apiUrl}${url}`, data, {
                headers: {
                    'apikey': `${apiKey}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Error in POST request:', error);
            return null;
        }
    }

    async get<T>(url: string): Promise<T | null> {
        try {
            const apiKey = getWelltestedKey();
            const response: AxiosResponse<T> = await axios.get(`${this.apiUrl}${url}`, {
                headers: {
                    'apikey': `Bearer ${apiKey}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Error in GET request:', error);
            vscode.window.showErrorMessage('Error connecting to Welltested API.');
            return null;
        }
    }
}


export class UnauthorizedException extends Error {
    constructor() {
        super();
        this.name = 'UnauthorizedException';
    }
}