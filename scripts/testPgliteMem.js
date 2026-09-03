import { PGlite } from '@electric-sql/pglite';
import path from 'node:path';
import fs from 'node:fs';
function printMemory(stage) {
    const mem = process.memoryUsage();
    console.log(`\n📊 [MEMORY AT ${stage}]`);
    console.log(`  - RSS:        ${(mem.rss / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  - Heap Total: ${(mem.heapTotal / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  - Heap Used:  ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  - External:   ${(mem.external / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  - ArrayBufs:  ${(mem.arrayBuffers / 1024 / 1024).toFixed(2)} MB`);
}
async function run() {
    printMemory('BASELINE');
    const dbDir = path.resolve(process.cwd(), '.data_mem_test');
    if (!fs.existsSync(dbDir))
        fs.mkdirSync(dbDir, { recursive: true });
    const dbPath = path.join(dbDir, 'pglite_data');
    const pglite = new PGlite(dbPath, {
        relaxedDurability: true,
        initialMemory: 2048 * 64 * 1024 // 128 MB exact minimum
    });
    await pglite.waitReady;
    printMemory('AFTER pglite.waitReady (128MB initialMemory exact)');
    await pglite.exec('CREATE TABLE test (id SERIAL PRIMARY KEY, name TEXT);');
    await pglite.exec("INSERT INTO test (name) VALUES ('hello'), ('world');");
    const res = await pglite.query('SELECT * FROM test;');
    console.log('Query result:', res.rows);
    printMemory('AFTER query');
    await pglite.close();
    printMemory('AFTER close');
    fs.rmSync(dbDir, { recursive: true, force: true });
}
run();
