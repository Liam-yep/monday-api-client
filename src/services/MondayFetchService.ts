import { MondayClient } from '../MondayClient';
import { QueryBuilder, ColumnDef } from '../utils/QueryBuilder';

export interface Item {
    id: string;
    name: string;
    values: Record<string, any>; // mapped column values
}

export class MondayFetchService {
    private client: MondayClient;

    constructor(client: MondayClient) {
        this.client = client;
    }

    async getItem(itemId: number | string, columns: ColumnDef[]): Promise<Item | null> {
        const query = QueryBuilder.buildItemQuery([Number(itemId)], columns);
        const response = await this.client.api<{ items: any[] }>(query);

        if (!response.items || response.items.length === 0) {
            return null;
        }

        return this.mapItem(response.items[0]);
    }

    async getItems(itemIds: (number | string)[], columns: ColumnDef[]): Promise<Item[]> {
        const query = QueryBuilder.buildItemQuery(itemIds.map(id => String(id)), columns);
        const response = await this.client.api<{ items: any[] }>(query);
        return (response.items || []).map(item => this.mapItem(item));
    }

    async getBoardItems(boardId: number | string, columns: ColumnDef[]): Promise<Item[]> {
        const query = QueryBuilder.buildBoardItemsQuery(boardId, columns);
        // Monday API 2023-10+ uses nested boards -> items_page -> items
        // We need to handle that structure if the user is on the new API version (which is default now).
        const response = await this.client.api<{ boards: any[] }>(query);

        const board = response.boards?.[0];
        if (!board) return [];

        const items = board.items_page?.items || [];
        return items.map((item: any) => this.mapItem(item));
    }

    private mapItem(rawItem: any): Item {
        const mappedValues: Record<string, any> = {};

        if (rawItem.column_values) {
            for (const cv of rawItem.column_values) {
                // Basic mapping: id -> { text, value, ... }
                // We might want to parse 'value' (which is JSON string) into an object
                let parsedValue = null;
                try {
                    if (cv.value) {
                        parsedValue = JSON.parse(cv.value);
                    }
                } catch {
                    parsedValue = cv.value;
                }

                mappedValues[cv.id] = {
                    text: cv.text,
                    value: parsedValue,
                    type: cv.type,
                    title: cv.column?.title
                };

                // Handle linked items specifically if present
                if (cv.linked_items) {
                    mappedValues[cv.id].linkedItems = cv.linked_items.map((li: any) => this.mapItem(li));
                }
            }
        }

        return {
            id: rawItem.id,
            name: rawItem.name,
            values: mappedValues
        };
    }
}
