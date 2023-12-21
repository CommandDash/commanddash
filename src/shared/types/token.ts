export type Token = {
    line: number;
    start: number;
    length: number;
    tokenTypeNumber: number;
    tokenType: string | undefined;
    tokenModifiers: number;
    name: string;
    code: string | undefined;
};