import { GoogleGenerativeAI } from "@google/generative-ai";

export class GeminiRepository{
     private apiKey?: string;
     private genAI: GoogleGenerativeAI; 

    constructor(apiKey: string) {
        this.apiKey = apiKey;
        this.genAI = new GoogleGenerativeAI(this.apiKey);
    }

    public async generateContent(prompt: string): Promise<string> {
        console.log(prompt);
  
        if(!this.apiKey) {
            throw new Error('API token not set, please go to extension settings to set it (read README.md for more info)');
        }
        const model =   this.genAI.getGenerativeModel({ model: "gemini-pro"});
        const result = await model.generateContent(prompt);
        const response =   result.response;
        const text = response.text();
        console.log(text);
        return text;
    }    
}