export type ColumnDef = string | LinkedColumnDef;

export interface LinkedColumnDef {
    id: string; // The column ID of the connect_boards column
    linkedColumns: ColumnDef[]; // The columns to fetch from the linked item
}

export class QueryBuilder {
    static buildItemQuery(itemIds: number[] | string[], columns: ColumnDef[]): string {
        const idsString = itemIds.map(id => String(id)).join(', ');
        const columnQuery = this.buildColumnSelection(columns);

        return `
      query {
        items (ids: [${idsString}]) {
          id
          name
          ${columnQuery}
        }
      }
    `;
    }

    static buildBoardItemsQuery(boardId: number | string, columns: ColumnDef[], limit: number = 50): string {
        const columnQuery = this.buildColumnSelection(columns);
        return `
      query {
        boards (ids: [${boardId}]) {
          items_page (limit: ${limit}) {
            items {
              id
              name
              ${columnQuery}
            }
          }
        }
      }
     `;
    }

    private static buildColumnSelection(columns: ColumnDef[]): string {
        if (!columns || columns.length === 0) {
            return '';
        }

        // Separate simple columns from linked columns
        const simpleColIds: string[] = [];
        const linkedCols: LinkedColumnDef[] = [];

        columns.forEach(col => {
            if (typeof col === 'string') {
                simpleColIds.push(col);
            } else {
                linkedCols.push(col);
            }
        });

        const simpleColIdsString = simpleColIds.map(id => JSON.stringify(id)).join(', ');

        // We need to fetch all columns in one `column_values` block usually, 
        // but for specific simple IDs we can filter. 
        // However, mixing specific IDs and "all other" structure is tricky in Monday API.
        // Monday API `column_values(ids: [...])` filters what we get back.

        // Strategy: Request the simple IDs. For linked items, we must request those column IDs too, 
        // and then expand the fragment.

        const allTopLevelIds = [
            ...simpleColIds,
            ...linkedCols.map(c => c.id)
        ].map(id => JSON.stringify(id)).join(', ');

        let query = `
      column_values (ids: [${allTopLevelIds}]) {
        id
        text
        value
        type
        column {
            title
        }
    `;

        // Add specific handling for linked columns
        if (linkedCols.length > 0) {
            query += `
        ... on BoardRelationValue {
          linked_items {
            id
            name
      `;

            // For each linked column, we effectively need a sub-query. 
            // Note: Monday API support for this is via `linked_items`. 
            // If we have multiple connect-board columns, we are inside one `column_values` loop.
            // We can't easily distinguish WHICH column we are expanding for unless we handle them selectively.
            // But `... on BoardRelationValue` applies to *all* board relation columns in this list.
            // So we must fetch the sub-columns for *all* requested relation columns here?
            // Or we assume the user provides a unified list of sub-columns?

            // Simplification: We merge all sub-column requests for the linked items.
            // (A robust solution might need a more complex recursive optional checking, 
            // but usually you just want "these columns" from "that linked item").

            const allSubColumns = linkedCols.flatMap(c => c.linkedColumns);
            // specific sub-columns? 
            // If we differ per column (e.g. colA links to Board X (need Status), colB links to Board Y (need Date)),
            // having one `linked_items { column_values(...) }` block means we request Status AND Date for all linked items.
            // This is usually fine (extra nulls for irrelevant columns).

            if (allSubColumns.length > 0) {
                query += this.buildColumnSelection(allSubColumns);
            }

            query += `
          }
        }
      `;
        }

        query += `
      }
    `;

        return query;
    }
}
