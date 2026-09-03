import { initDb, db } from '../server/db/index.js';
import { transactions, recoveryCases } from '../server/db/schema.js';
import { EvaluationService } from '../server/services/evaluationService.js';
function printMemory(stage) {
    const mem = process.memoryUsage();
    console.log(`\n📊 [MEMORY AT ${stage}]`);
    console.log(`  - RSS:        ${(mem.rss / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  - Heap Total: ${(mem.heapTotal / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  - Heap Used:  ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  - External:   ${(mem.external / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  - ArrayBufs:  ${(mem.arrayBuffers / 1024 / 1024).toFixed(2)} MB`);
}
async function test() {
    printMemory('STARTUP BASELINE');
    await initDb();
    printMemory('AFTER initDb() (PGlite Initialized)');
    const txCount = (await db.select().from(transactions)).length;
    printMemory(`AFTER SELECT ALL TRANSACTIONS (${txCount} records)`);
    const casesCount = (await db.select().from(recoveryCases)).length;
    printMemory(`AFTER SELECT ALL CASES (${casesCount} records)`);
    console.log('\nRunning EvaluationService.runBatchEvaluation()...');
    const evalResults = await EvaluationService.runBatchEvaluation();
    printMemory('AFTER runBatchEvaluation()');
    process.exit(0);
}
test();
