import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

export async function makeHttpRequest<T>(config: AxiosRequestConfig): Promise<T> {
    try {
        const response: AxiosResponse<T> = await axios(config);
        return response.data;
    } catch (error) {
        throw new Error(`Failed to make HTTP request: ${error}`);
    }
}