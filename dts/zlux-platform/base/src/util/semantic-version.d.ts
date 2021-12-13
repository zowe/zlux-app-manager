export declare class SemanticVersion {
    major: number;
    minor: number;
    patch: number | null;
    identifiers: string | null;
    build: string | null;
    constructor(version: string);
}
