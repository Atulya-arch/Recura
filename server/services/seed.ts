import { db, initDb, sqlite } from '../db/index.js';
import { merchants, customers, transactions, policies } from '../db/schema.js';
import { PaymentStatus, FailureCategory } from '../../shared/enums.js';

// Deterministic Mulberry32 PRNG
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_NAMES = ['Rahul', 'Priya', 'Amit', 'Neha', 'Rohan', 'Ananya', 'Vikram', 'Sneha', 'Karan', 'Pooja', 'Siddharth', 'Divya', 'Arjun', 'Meera', 'Aditya', 'Rhea', 'Gaurav', 'Shweta', 'Rajesh', 'Kavita'];
const LAST_NAMES = ['Sharma', 'Verma', 'Patel', 'Gupta', 'Singh', 'Kumar', 'Joshi', 'Mehta', 'Nair', 'Rao', 'Shah', 'Chawla', 'Deshmukh', 'Bhat', 'Reddy'];
const PAYMENT_METHODS = ['CARD', 'UPI', 'NET_BANKING', 'WALLET'];

const FAILURE_REASONS = [
  { reason: 'Gateway network authorization timeout', category: FailureCategory.NETWORK_FAILURE, type: 'TRANSIENT' },
  { reason: 'Insufficient account balance or credit limit', category: FailureCategory.INSUFFICIENT_FUNDS, type: 'INSUFFICIENT_FUNDS' },
  { reason: 'Issuer bank server temporarily unavailable', category: FailureCategory.BANK_FAILURE, type: 'BANK_FAILURE' },
  { reason: 'Checkout authorization step abandoned', category: FailureCategory.ABANDONMENT, type: 'ABANDONMENT' },
  { reason: 'Card expired or invalid CVV provided', category: FailureCategory.TRANSIENT, type: 'PERMANENT' },
  { reason: '3D-Secure authentication failed', category: FailureCategory.TRANSIENT, type: 'TRANSIENT' }
];

export async function seedDatabase(totalTransactions = 1200, seedValue = 42) {
  await initDb();
  const rand = mulberry32(seedValue);

  // Clear existing records
  sqlite.exec(`
    DELETE FROM audit_events;
    DELETE FROM ai_decisions;
    DELETE FROM recovery_actions;
    DELETE FROM recovery_cases;
    DELETE FROM transactions;
    DELETE FROM customers;
    DELETE FROM policies;
    DELETE FROM merchants;
  `);

  const merchantId = 'mch_acme_retail';
  await db.insert(merchants).values({
    id: merchantId,
    name: 'Acme Retail India',
    createdAt: new Date('2025-01-01T00:00:00Z').toISOString()
  });

  await db.insert(policies).values({
    id: `pol_${merchantId}`,
    merchantId,
    maxRetries: 3,
    maxRecoveryWindowHours: 72,
    maxReminders: 2,
    maxAutomatedActions: 3,
    minimumAiConfidence: 65,
    updatedAt: new Date('2025-01-01T00:00:00Z').toISOString()
  });

  // Generate ~200 customers
  const customerList: { id: string; name: string; email: string; phone: string; optedOut: boolean }[] = [];
  for (let i = 1; i <= 200; i++) {
    const fn = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)];
    const ln = LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)];
    const id = `cust_${1000 + i}`;
    const optedOut = rand() < 0.05; // 5% opt out rate

    customerList.push({
      id,
      name: `${fn} ${ln}`,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@example.com`,
      phone: `+9198${Math.floor(10000000 + rand() * 90000000)}`,
      optedOut
    });
  }

  for (const c of customerList) {
    await db.insert(customers).values({
      id: c.id,
      merchantId,
      name: c.name,
      email: c.email,
      phone: c.phone,
      optedOut: c.optedOut,
      createdAt: new Date(Date.now() - Math.floor(rand() * 60 * 24 * 60 * 60 * 1000)).toISOString()
    });
  }

  // Generate transactions within active recovery window (last 48 hours)
  const txBatch: any[] = [];
  const nowMs = Date.now();

  for (let i = 1; i <= totalTransactions; i++) {
    const cust = customerList[Math.floor(rand() * customerList.length)];
    const amountMinor = Math.floor(499 + rand() * 15000) * 100; // ₹499 to ₹15,499 in paise
    const isSuccess = rand() > 0.35; // 65% success rate initially
    const pm = PAYMENT_METHODS[Math.floor(rand() * PAYMENT_METHODS.length)];
    const txTime = new Date(nowMs - Math.floor(rand() * 48 * 60 * 60 * 1000)).toISOString();

    let paymentStatus = PaymentStatus.SUCCESS;
    let failureReason: string | null = null;
    let checkoutStatus = 'COMPLETED';

    if (!isSuccess) {
      paymentStatus = PaymentStatus.FAILED;
      const f = FAILURE_REASONS[Math.floor(rand() * FAILURE_REASONS.length)];
      failureReason = f.reason;
      if (f.category === FailureCategory.ABANDONMENT) {
        checkoutStatus = 'ABANDONED';
      } else {
        checkoutStatus = 'FAILED';
      }
    }

    const txId = `tx_${10000 + i}`;
    txBatch.push({
      id: txId,
      merchantId,
      customerId: cust.id,
      orderId: `ORD-${50000 + i}`,
      amountMinor,
      currency: 'INR',
      paymentStatus,
      failureReason,
      paymentMethod: pm,
      checkoutStatus,
      attemptCount: paymentStatus === PaymentStatus.FAILED ? 1 : 1,
      createdAt: txTime,
      updatedAt: txTime
    });
  }

  // Insert in batches with SQLite transaction
  const batchSize = 100;
  for (let i = 0; i < txBatch.length; i += batchSize) {
    const chunk = txBatch.slice(i, i + batchSize);
    await db.insert(transactions).values(chunk);
  }

  console.log(`Seeded database with 1 Merchant, ${customerList.length} Customers, and ${totalTransactions} Transactions.`);
  return { merchantId, customerCount: customerList.length, transactionCount: totalTransactions };
}
