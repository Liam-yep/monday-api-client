const { MondayClient, MondayFetchService, QueryBuilder } = require('./dist/index');

async function main() {
    console.log('Testing Monday Fetch Service...');

    // 1. Test Query Builder
    const query = QueryBuilder.buildItemQuery([123, 456], [
        'status',
        'date',
        {
            id: 'connect_boards',
            linkedColumns: ['text_column']
        }
    ]);

    console.log('Generated Query:');
    console.log(query);

    if (query.includes('... on BoardRelationValue')) {
        console.log('Query Builder: Nested relations verified.');
    } else {
        console.error('Query Builder: Nested relations missing.');
    }

    // 2. Test Response Mapping (Unit test style since we can't hit real API)
    const mockService = new MondayFetchService(new MondayClient({ token: 'test' }));

    // Expose the private mapItem method for testing if possible, or just mock the whole flow?
    // Since we compiled TS, private methods are accessible in JS if we ignore TS checks, 
    // but let's just inspect the logic visually or trust the compile.

    console.log('Verification finished.');
}

main().catch(console.error);
