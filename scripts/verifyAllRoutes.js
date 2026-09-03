import { initDb } from '../server/db/index.js';
import { seedDatabase } from '../server/services/seed.js';
import { router } from '../server/routes/api.js';
import express from 'express';
import http from 'node:http';
async function verifyAll() {
    console.log('🧪 Starting Full Route & Endpoint Verification Check...\n');
    await initDb();
    await seedDatabase(1200, 42);
    const app = express();
    app.use(express.json());
    app.use('/api', router);
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const endpoints = [
        { method: 'GET', path: '/api/dashboard/metrics' },
        { method: 'GET', path: '/api/transactions' },
        { method: 'GET', path: '/api/recovery-cases' },
        { method: 'GET', path: '/api/audit' },
        { method: 'GET', path: '/api/analytics' },
        { method: 'GET', path: '/api/policies' },
    ];
    let passed = 0;
    for (const ep of endpoints) {
        const res = await fetch(`${baseUrl}${ep.path}`);
        const data = await res.json();
        if (res.ok) {
            console.log(`✅ ${ep.method} ${ep.path} -> 200 OK (Received ${Array.isArray(data) ? data.length + ' items' : 'valid object'})`);
            passed++;
        }
        else {
            console.error(`❌ ${ep.method} ${ep.path} -> Failed (${res.status})`);
        }
    }
    // Fetch a single recovery case ID for detailed tests
    const casesRes = await fetch(`${baseUrl}/api/recovery-cases`);
    const cases = await casesRes.json();
    const sampleCaseId = cases[0]?.id;
    if (sampleCaseId) {
        const detailRes = await fetch(`${baseUrl}/api/recovery-cases/${sampleCaseId}`);
        if (detailRes.ok) {
            console.log(`✅ GET /api/recovery-cases/${sampleCaseId} -> 200 OK`);
            passed++;
        }
    }
    // Test Policy Update
    const putPolRes = await fetch(`${baseUrl}/api/policies`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxRetries: 4, minimumAiConfidence: 0.70 })
    });
    if (putPolRes.ok) {
        console.log('✅ PUT /api/policies -> 200 OK (Updated policy guardrails)');
        passed++;
    }
    // Test Demo Scenario Trigger
    const demoRes = await fetch(`${baseUrl}/api/simulation/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: 'TIMEOUT' })
    });
    if (demoRes.ok) {
        console.log('✅ POST /api/simulation/run -> 200 OK (Demo scenario executed)');
        passed++;
    }
    server.close();
    console.log(`\n🎉 Verification Complete: ${passed} out of ${endpoints.length + 3} API endpoints verified successfully!`);
    process.exit(0);
}
verifyAll();
