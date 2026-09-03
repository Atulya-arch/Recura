import { PGlite } from '@electric-sql/pglite';
function printMemory(stage) {
    const mem = process.memoryUsage();
    console.log(`\n📊 [MEMORY AT ${stage}]`);
    console.log(`  - RSS:        ${(mem.rss / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  - Heap Total: ${(mem.heapTotal / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  - Heap Used:  ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  - External:   ${(mem.external / 1024 / 1024).toFixed(2)} MB`);
}
async function run() {
    printMemory('BASELINE');
    const pglite = new PGlite(); // In-memory
    await pglite.waitReady;
    printMemory('AFTER IN-MEMORY PGlite');
    await pglite.exec('CREATE TABLE test (id SERIAL PRIMARY KEY, name TEXT);');
    await pglite.exec("INSERT INTO test (name) VALUES ('hello'), ('world');");
    const res = await pglite.query('SELECT * FROM test;');
    console.log('Query result:', res.rows);
    printMemory('AFTER query');
}
run();
