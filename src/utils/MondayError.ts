export class MondayError extends Error {
    public readonly errors: any[];
    public readonly accountId?: string;

    constructor(message: string, errors: any[] = [], accountId?: string) {
        super(message);
        this.name = 'MondayError';
        this.errors = errors;
        this.accountId = accountId;

        // Restore prototype chain for instanceof checks
        Object.setPrototypeOf(this, MondayError.prototype);
    }
}
