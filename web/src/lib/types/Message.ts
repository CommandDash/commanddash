export type Message = {
    role: "user" | "model";
    text: string,
    references?: any[],
}