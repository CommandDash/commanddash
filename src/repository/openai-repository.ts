import { makeHttpRequest } from './http-utils';
require('dotenv').config();
interface ChatCompletionRequest {
    model: string;
    messages: { role: string, content: string }[];
    temperature: number;
}

interface Message {
    role: string;
    content: string;
  }
  
interface Choice {
    index: number;
    message: Message;
    finishReason: string;
  }
  interface Usage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  }
  
interface ChatCompletionResponse {
    id: string;
    object: string;
    created: number;
    choices: Choice[];
    usage: Usage;
  }

export class OpenAIRepository {
    private apiKey?: string;
  
    constructor(apiKey: string | undefined) {
      this.apiKey = apiKey;
    }
  
    public async getCompletion(prompt: { role: string, content: string }[]): Promise<string> {

      if(!this.apiKey) {
        throw new Error('API token not set, please go to extension settings to set it (read README.md for more info)');
      }
    
      const request: ChatCompletionRequest = {
          model: 'gpt-3.5-turbo',
          messages: prompt,
          temperature: 0.7
      };
  
      const config = {
          method: 'post',
          url: 'https://api.openai.com/v1/chat/completions',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`
          },
          data: request
      };
      try{
        console.debug(`Making request to gpt: ${JSON.stringify(request)}`);
        const response: ChatCompletionResponse = await makeHttpRequest<ChatCompletionResponse>(config);
        console.debug(`Response from from gpt: ${JSON.stringify(response)}`);
        if (!response.choices || response.choices.length === 0) {
            throw new Error('API response was empty or missing "choices" field');
        }
        const trimmedResponse = response.choices[0].message.content.trim();
        return trimmedResponse;
      } catch (error){
        throw new Error('Failed to get completion from API: ' +  error);
      }
    }
  }