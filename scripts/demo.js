import { initDb, db } from '../server/db/index.js';
import { seedDatabase } from '../server/services/seed.js';
import { transactions } from '../server/db/schema.js';
import { SimulationPaymentProvider } from '../server/providers/simulationProvider.js';
import { RecoveryEngine } from '../server/services/recoveryEngine.js';
import { PaymentStatus } from '../shared/enums.js';
async function runDemo() {
    console.log('🚀 Running Recura Hackathon Live Demo Script...\n');
    await initDb();
    await seedDatabase(1200, 42);
    const provider = new SimulationPaymentProvider();
    const engine = new RecoveryEngine(provider);
    const [txRecord] = await db.select().from(transactions).where(PaymentStatus.FAILED ? undefined : undefined).limit(1);
    const sampleTxId = txRecord.id;
    console.log('--- Step 1: Demo Successful Recovery Scenario ---');
    provider.setScenarioForTx(sampleTxId, 'TEMPORARY_FAILURE', PaymentStatus.SUCCESS);
    const case1 = await engine.processTransaction(sampleTxId);
    const case1Step2 = await engine.processTransaction(sampleTxId);
    console.log(`Result Case #${case1Step2?.id}: Status = ${case1Step2?.status}, Recovered = ₹${((case1Step2?.recoveredAmountMinor || 0) / 100).toLocaleString('en-IN')}`);
    console.log('\n--- Step 2: Demo Timeout Safety (Status UNKNOWN -> Authoritative Verification) ---');
    const timeoutTxId = 'tx_demo_timeout_script';
    await db.insert(transactions).values({
        id: timeoutTxId,
        merchantId: 'mch_acme_retail',
        customerId: 'cust_1001',
        orderId: 'ORD-DEMO-TIMEOUT',
        amountMinor: 299900,
        currency: 'INR',
        paymentStatus: PaymentStatus.FAILED,
        failureReason: 'Gateway timeout error',
        paymentMethod: 'UPI',
        checkoutStatus: 'FAILED',
        attemptCount: 1
    });
    provider.setScenarioForTx(timeoutTxId, 'TIMEOUT', PaymentStatus.SUCCESS);
    const case2 = await engine.processTransaction(timeoutTxId);
    console.log(`Result Case #${case2?.id}: Status = ${case2?.status}, Recovered = ₹${((case2?.recoveredAmountMinor || 0) / 100).toLocaleString('en-IN')}`);
    console.log('\n--- Step 3: Demo Idempotency Protection ---');
    console.log('Re-executing action with same idempotency key...');
    const case3 = await engine.processTransaction(timeoutTxId);
    console.log(`Result Case #${case3?.id}: Status = ${case3?.status}`);
    console.log('\n✅ Demo execution complete!');
    process.exit(0);
}
runDemo();
