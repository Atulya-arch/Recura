import { initDb } from '../server/db/index.js';
import { seedDatabase } from '../server/services/seed.js';
import { EvaluationService } from '../server/services/evaluationService.js';
async function test() {
    await initDb();
    await seedDatabase(1200, 42);
    try {
        await EvaluationService.runBatchEvaluation();
        console.log('Evaluation succeeded!');
    }
    catch (err) {
        console.error('Stack trace:', err.stack);
    }
    process.exit(0);
}
test();
