import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

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