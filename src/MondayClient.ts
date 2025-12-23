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
        if (!options.token) {
            throw new Error('Monday API Token is required');
        }
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

    /**
     * Fetch all items from a board, handling pagination automatically.
     * Uses API 2023-10 version (items_page).
     * @param boardId The ID of the board to fetch items from
     * @param returnFields GraphQL fields to return for each item (default: 'id name')
     */
    public async getAllItems(boardId: number | string, returnFields: string = 'id name'): Promise<any[]> {
        let allItems: any[] = [];
        let cursor: string | null = null;

        // Initial query
        const initialQuery = `
            query ($boardId: [ID!]) {
                boards (ids: $boardId) {
                    items_page (limit: 500) {
                        cursor
                        items {
                            ${returnFields}
                        }
                    }
                }
            }
        `;

        const initialResponse = await this.api(initialQuery, { boardId });

        // Handle case where board doesn't exist or has no items_page
        if (!initialResponse.boards || initialResponse.boards.length === 0) {
            return [];
        }

        const itemsPage = initialResponse.boards[0].items_page;
        if (!itemsPage) {
            return [];
        }

        allItems.push(...itemsPage.items);
        cursor = itemsPage.cursor;

        // Loop for next pages
        while (cursor) {
            const nextQuery = `
                query ($cursor: String!) {
                    next_items_page (limit: 500, cursor: $cursor) {
                        cursor
                        items {
                            ${returnFields}
                        }
                    }
                }
            `;

            const nextResponse = await this.api(nextQuery, { cursor });
            const nextItemsPage = nextResponse.next_items_page;

            allItems.push(...nextItemsPage.items);
            cursor = nextItemsPage.cursor;
        }

        return allItems;
    }
}
