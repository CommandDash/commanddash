export type Message = {
    role: "user" | "model";
    text: string,
    references?: Array<{reference_id: string, type: string, url: string}>,
}