import { seedDatabase } from '../server/services/seed.js';

async function main() {
  console.log('🌱 Starting Recura deterministic seed generator...');
  try {
    const res = await seedDatabase(1200, 42);
    console.log(`✅ Seed completed successfully: ${res.transactionCount} transactions created.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
}

main();
