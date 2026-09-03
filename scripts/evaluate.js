import { initDb } from '../server/db/index.js';
import { seedDatabase } from '../server/services/seed.js';
import { EvaluationService } from '../server/services/evaluationService.js';
async function main() {
    console.log('📊 Initializing Recura Evaluation Runner...');
    await initDb();
    await seedDatabase(1200, 42);
    console.log('⚡ Running batch comparison (Baseline vs Recura)...');
    const results = await EvaluationService.runBatchEvaluation();
    console.log('\n==========================================');
    console.log('         RECURA EVALUATION REPORT         ');
    console.log('==========================================');
    console.log(`Total Transactions:          ${results.totalTransactions}`);
    console.log(`Failed Transactions:         ${results.failedTransactions}`);
    console.log(`Revenue at Risk:             ₹${(results.revenueAtRiskMinor / 100).toLocaleString('en-IN')}`);
    console.log(`Eligible Candidate Cases:    ${results.eligibleCasesCount}`);
    console.log('------------------------------------------');
    console.log(`BASELINE Recovered Revenue:  ₹${(results.baseline.recoveredRevenueMinor / 100).toLocaleString('en-IN')}`);
    console.log(`BASELINE Recovery Rate:      ${results.baseline.recoveryRatePercent}%`);
    console.log('------------------------------------------');
    console.log(`RECURA Recovered Revenue:    ₹${(results.recura.recoveredRevenueMinor / 100).toLocaleString('en-IN')}`);
    console.log(`RECURA Recovery Rate:        ${results.recura.recoveryRatePercent}%`);
    console.log('------------------------------------------');
    console.log(`INCREMENTAL REVENUE:         +₹${(results.incrementalRevenueMinor / 100).toLocaleString('en-IN')}`);
    console.log(`INCREMENTAL LIFT:            +${results.incrementalRatePercent}%`);
    console.log('==========================================\n');
    process.exit(0);
}
main();
