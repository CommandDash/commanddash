import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from 'fs';

export class GeminiRepository {
    private apiKey?: string;
    private genAI: GoogleGenerativeAI;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
        this.genAI = new GoogleGenerativeAI(this.apiKey);
    }

    public async generateTextFromImage(prompt: string, image: string, mimeType: string): Promise<string> {
        const model = this.genAI.getGenerativeModel({ model: "gemini-pro-vision" });
        const imageParts = [
            this.fileToGenerativePart(image, mimeType),
        ];

        const result = await model.generateContent([prompt, ...imageParts]);
        const response = await result.response;
        const text = response.text();
        return text;
    }

    public async getCompletion(prompt: { role: string, parts: string }[]): Promise<string> {

        if (!this.apiKey) {
            throw new Error('API token not set, please go to extension settings to set it (read README.md for more info)');
        }
        const lastMessage = prompt.pop();
        const chat = this.genAI.getGenerativeModel({ model: "gemini-pro" , generationConfig: {temperature: 0.0}}).startChat(
            {
                history: prompt,
            }
        );
        const result = await chat.sendMessage(lastMessage?.parts ?? "");
        const response = result.response;
        const text = response.text();
        return text;
    }

    // Converts local file information to a GoogleGenerativeAI.Part object.
    private fileToGenerativePart(path: string, mimeType: string) {
        return {
            inlineData: {
                data: Buffer.from(fs.readFileSync(path)).toString("base64"),
                mimeType
            },
        };
    }

}