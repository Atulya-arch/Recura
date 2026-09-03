import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
function printMemory(stage) {
    const mem = process.memoryUsage();
    console.log(`\n📊 [MEMORY AT ${stage}]`);
    console.log(`  - RSS:        ${(mem.rss / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  - Heap Total: ${(mem.heapTotal / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  - Heap Used:  ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  - External:   ${(mem.external / 1024 / 1024).toFixed(2)} MB`);
}
const testTable = sqliteTable('test_table', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    amount: integer('amount').notNull()
});
async function run() {
    printMemory('BASELINE');
    const sqlite = new Database(':memory:');
    const db = drizzle(sqlite);
    printMemory('AFTER DRIZZLE + SQLITE INITIALIZED');
    sqlite.exec('CREATE TABLE test_table (id TEXT PRIMARY KEY, name TEXT, amount INTEGER);');
    // Insert 1200 rows to simulate full database
    const insertStmt = sqlite.prepare('INSERT INTO test_table (id, name, amount) VALUES (?, ?, ?)');
    const insertMany = sqlite.transaction((rows) => {
        for (const r of rows)
            insertStmt.run(r.id, r.name, r.amount);
    });
    const dummyRows = [];
    for (let i = 0; i < 1200; i++) {
        dummyRows.push({ id: `id_${i}`, name: `Customer ${i}`, amount: 299900 });
    }
    insertMany(dummyRows);
    printMemory('AFTER 1,200 ROWS INSERTED');
    const rows = await db.select().from(testTable);
    console.log(`Selected ${rows.length} rows successfully.`);
    printMemory('AFTER SELECT 1,200 ROWS');
    sqlite.close();
    printMemory('AFTER CLOSE');
}
run();
