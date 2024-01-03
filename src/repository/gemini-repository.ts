import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from 'fs';
import * as vscode from "vscode";


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

    public async getCompletion(prompt: { role: string, parts: string }[], isReferenceAdded?: boolean): Promise<string> {

        if (!this.apiKey) {
            throw new Error('API token not set, please go to extension settings to set it (read README.md for more info)');
        }
        let lastMessage = prompt.pop();
        if (lastMessage && isReferenceAdded) {
            const dartFiles = await this.findClosestDartFiles(lastMessage.parts);
            lastMessage.parts = "Read following code end-to-end and answer following prompt: \n" + "```\n" + dartFiles + "\n```\n\n" + lastMessage.parts;
        }
        console.log("Prompt: " + lastMessage?.parts);
        const chat = this.genAI.getGenerativeModel({ model: "gemini-pro", generationConfig: { temperature: 0.0, topP: 0.2 } }).startChat(
            {
                history: prompt,
            }
        );
        const result = await chat.sendMessage(lastMessage?.parts ?? "");

        const response = result.response;
        const text = response.text();
        return text;
    }

    public async findClosestDartFiles(query: string): Promise<string> {
        const taskType = require("@google/generative-ai");

        if (!this.apiKey) {
            throw new Error('API token not set, please go to extension settings to set it (read README.md for more info)');
        }

        const embedding = this.genAI.getGenerativeModel({ model: "embedding-001" });

        const dartFiles = await vscode.workspace.findFiles('lib/**/*.dart');
        console.log("dartFiles: " + dartFiles.concat().toString());


        const fileContents = await Promise.all(dartFiles.map(async (file: any) => {
            const document = await vscode.workspace.openTextDocument(file);
            return document.getText();
        }));

        console.log("FileContents: " + fileContents.concat().toString());

        const docEmbeddings = await embedding.batchEmbedContents({
            requests: fileContents.map((text) => ({
                content: { role: "document", parts: [{ text }] },
                taskType: taskType.RETRIEVAL_DOCUMENT,

            })),
        });

        const queryEmbedding = await embedding.embedContent({
            content: { role: "query", parts: [{ text: query }] },
            taskType: taskType.RETRIEVAL_QUERY
        });

        const distances = docEmbeddings.embeddings.map((embedding, index) => ({
            file: dartFiles[index],
            distance: this.euclideanDistance(embedding.values, queryEmbedding.embedding.values)
        }));

        distances.sort((a, b) => a.distance - b.distance);
        console.log("Distances: " + distances.toString());


        let resultString = '';
        distances.slice(0, 5).forEach((fileEmbedding, index) => {
            const fileName = fileEmbedding.file.path.split('/').pop();
            const fileContent = fileContents[dartFiles.indexOf(fileEmbedding.file)];
            resultString += `${index + 1}. ${fileName}\n`;
            resultString += '```dart\n' + fileContent + '\n```\n\n';
        });

        return resultString.trim();
    }


    private euclideanDistance(a: string | any[], b: number[]) {
        let sum = 0;
        for (let n = 0; n < a.length; n++) {
            sum += Math.pow(a[n] - b[n], 2);
        }
        return Math.sqrt(sum);
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