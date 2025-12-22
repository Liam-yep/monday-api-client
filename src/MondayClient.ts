import initMondayClient from 'monday-sdk-js';
import { MondayError } from './utils/MondayError';

interface MondayClientOptions {
    token: string;
    apiVersion?: string;
}

interface ExecuteOptions {
    retries?: number;
    initialDelay?: number;
}

export class MondayClient {
    private client: any;
    private token: string;

    constructor(options: MondayClientOptions) {
        this.token = options.token;
        this.client = initMondayClient();
        this.client.setToken(this.token);
        if (options.apiVersion) {
            this.client.setApiVersion(options.apiVersion);
        }
    }

    /**
     * Execute a GraphQL query with automatic retries and error handling
     */
    public async api<T = any>(query: string, variables?: Record<string, any>, options: ExecuteOptions = {}): Promise<T> {
        const { retries = 3, initialDelay = 1000 } = options;

        let attempts = 0;
        while (attempts <= retries) {
            try {
                const response = await this.client.api(query, { variables });

                // Check for Monday-specific errors in the response body
                if (response.errors) {
                    // Monday API might return errors as an array
                    // Check if it's a complexity error or something transient
                    const isComplexityError = response.errors.some((err: any) =>
                        err.message && err.message.toLowerCase().includes('complexity')
                    );

                    if (isComplexityError && attempts < retries) {
                        // Wait and retry for complexity issues (simple backoff for now)
                        const delay = initialDelay * Math.pow(2, attempts);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        attempts++;
                        continue;
                    }

                    throw new MondayError('Monday API Error', response.errors, response.account_id);
                }

                return response.data as T;

            } catch (error: any) {
                // If it's our own MondayError, rethrow it immediately unless we want to retry specific codes?
                // MondayError means we got a response but it had errors.
                if (error instanceof MondayError) {
                    throw error;
                }

                // For network errors or other exceptions, retry
                if (attempts < retries) {
                    const delay = initialDelay * Math.pow(2, attempts);
                    // console.warn(`Monday API attempt ${attempts + 1} failed. Retrying in ${delay}ms...`, error.message);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    attempts++;
                } else {
                    throw new MondayError(`Failed after ${retries} retries: ${error.message}`);
                }
            }
        }

        throw new Error('Unexpected unreachable code in MondayClient.api');
    }
}
