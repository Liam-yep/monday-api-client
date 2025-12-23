# My Monday SDK

A wrapper around `monday-sdk-js` that provides retry logic, better error handling, and TypeScript support.

## Installation

### From GitHub (Recommended for teams)
To install this package directly from your GitHub repository:

```bash
npm install git+https://github.com/YOUR_USERNAME/monday-api-client.git
```

*Replace `YOUR_USERNAME` with your actual GitHub username.*

### Local Installation (For testing)
```bash
npm install /path/to/monday-api-client
```

## Usage

### 1. Initialize the Client
Import the client and initialize it with your API token.

```typescript
import { MondayClient } from 'my-monday-sdk';

const client = new MondayClient({ 
    token: 'YOUR_API_TOKEN' 
});
```

### 2. Execute Queries
The `api` method automatically handles retries for complexity errors and network issues.

```typescript
async function getBoards() {
    try {
        const query = `query { boards(limit: 5) { id name } }`;
        const data = await client.api(query);
        console.log(data);
    } catch (error) {
        console.error('Failed to fetch boards:', error);
    }
}
```

### 3. Using Variables
You can pass variables as the second argument.

```typescript
async function createItem(boardId: number, itemName: string) {
    const query = `
        mutation ($boardId: ID!, $itemName: String!) {
            create_item (board_id: $boardId, item_name: $itemName) {
                id
            }
        }
    `;
    
    await client.api(query, { boardId, itemName });
}

### 4. Fetch All Items (Pagination)
Use `getAllItems` to fetch all items from a board without worrying about cursors or limits.

```typescript
async function fetchAll(boardId: number) {
    // Second argument is optional (default: 'id name')
    const items = await client.getAllItems(boardId, 'id name column_values { id text }');
    console.log(`Fetched ${items.length} items`);
}
```
```
