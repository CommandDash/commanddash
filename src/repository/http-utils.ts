import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import * as vscode from 'vscode';

export async function makeHttpRequest<T>(config: AxiosRequestConfig): Promise<T> {
    try {
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
export async function makeAuthorizedHttpRequest<T>(config:AxiosRequestConfig,context:vscode.ExtensionContext): Promise<T>{
    // add base url localhost:5000
    config.baseURL =process.env["HOST"]!;
    const access_token = context.globalState.get('access_token');
    const refresh_token = context.globalState.get<string>('refresh_token');
    if (!refresh_token){
        throw new Error("Please login to FlutterGpt to use this feature");
    }
    config.headers = {
        Authorization: `Bearer ${access_token}`
    };
    try {
        const response: AxiosResponse<T> = await axios(config);
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            if (error.response?.status === 401||error.response?.status === 422){
                const new_access_token = await getNewAccessToken(refresh_token);
                context.globalState.update('access_token',new_access_token);
                return makeAuthorizedHttpRequest<T>(config,context);
            }
            throw new Error(`Error: ${error.response?.data.error.code} received with status code ${error.response?.status}.\nMessage: ${error.response?.data.error.message}`);
        } else {
            throw new Error(`Failed to make HTTP request: ${error}`);
        };
    }
}


async function getNewAccessToken(refresh_token:string): Promise<string>{
    const response = await makeHttpRequest<{access_token:string}>({url:"http://localhost:5000/token/refresh",method:'POST',
    headers:{
        Authorization:`Bearer ${refresh_token}` 
    }
});
    return response.access_token;
}