import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

const baseUrl = 'https://api.commanddash.dev';

export async function makeHttpRequest<T>(config: AxiosRequestConfig): Promise<T> {
    try {
        config.baseURL = baseUrl;
        const response: AxiosResponse<T> = await axios(config);
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(`Error: ${error.response?.data.error.code} received with status code ${error.response?.status}.\nMessage: ${error.response?.data.error.message}`);
        } else {
            throw new Error(`Failed to make HTTP request: ${error}`);
        };
    }
}

// make a request as above but with the authorization header set
// get access key from vscode config
// make a request to the server to get a new access key if the current one is expired
// update the config with the new access key
// make the request again
export async function makeAuthorizedHttpRequest<T>(config: AxiosRequestConfig, context: vscode.ExtensionContext): Promise<T> {
    // add base url localhost:5000
    config.baseURL = baseUrl;
    const accessToken = context.globalState.get<string>('access_token');
    const refreshToken = context.globalState.get<string>('refresh_token');
    if (!refreshToken) {
        throw new Error("Please login to CommandDash to use this feature");
    }
    config.headers = {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Authorization: `Bearer ${accessToken}`
    };
    try {
        const response: AxiosResponse<T> = await axios(config);
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            if (error.response?.status === 401 || error.response?.status === 422) {
                const newAccessToken = await refreshAccessToken(refreshToken);
                context.globalState.update('access_token', newAccessToken);
                return makeAuthorizedHttpRequest<T>(config, context);
            }
            throw new Error(`Error: ${error.response?.data.error.code} received with status code ${error.response?.status}.\nMessage: ${error.response?.data.error.message}`);
        } else {
            throw new Error(`Failed to make HTTP request: ${error}`);
        };
    }
}


export async function refreshAccessToken(refreshToken: string): Promise<string> {
    const response = await makeHttpRequest<{ access_token: string }>({
        url: baseUrl + '/account/github/refresh', method: 'POST',
        headers: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            Authorization: `Bearer ${refreshToken}`
        }
    });
    return response.access_token;
}


export async function downloadFile(url: string, destinationPath: string, onProgress: (progress: number) => void): Promise<void> {
    const tempFilePath = `${destinationPath}.tmp`;

    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
        onDownloadProgress: (progressEvent) => {
            const total = progressEvent.total ? progressEvent.total : 9999999;
            const progress = Math.round((progressEvent.loaded * 100) / total);
            onProgress(Math.min(progress, 100));
        },
    });

    const directory = path.dirname(destinationPath);
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
    }

    if (fs.existsSync(tempFilePath)) {
        fs.truncateSync(tempFilePath, 0);
    }

    const writer = fs.createWriteStream(tempFilePath);

    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
    // Downloaded executable is saved as a temporory file. This will be renamed in the next session.
}