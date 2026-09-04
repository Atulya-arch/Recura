import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GeminiCircuitBreaker } from '../server/agents/geminiCircuitBreaker.js';

describe('GeminiCircuitBreaker Enterprise Quota & State Tests', () => {
  let breaker: GeminiCircuitBreaker;

  beforeEach(() => {
    breaker = GeminiCircuitBreaker.getInstance();
    breaker.reset();
    vi.useRealTimers();
  });

  it('A. Gemini succeeds -> returns operation result and maintains CLOSED state', async () => {
    const mockGeminiOp = vi.fn().mockResolvedValue({ diagnosis: 'Live Gemini Output', confidence: 0.95 });
    const mockFallback = vi.fn().mockReturnValue({ diagnosis: 'Heuristic Fallback', confidence: 0.85 });

    const res = await breaker.execute(mockGeminiOp, mockFallback);

    expect(res.fromFallback).toBe(false);
    expect(res.result.diagnosis).toBe('Live Gemini Output');
    expect(mockGeminiOp).toHaveBeenCalledTimes(1);
    expect(mockFallback).not.toHaveBeenCalled();
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('B. Gemini times out -> falls back to local heuristic without crashing', async () => {
    const mockGeminiOp = vi.fn().mockRejectedValue(new Error('AI network call timed out after 2000ms'));
    const mockFallback = vi.fn().mockReturnValue({ diagnosis: 'Heuristic Fallback', confidence: 0.85 });

    const res = await breaker.execute(mockGeminiOp, mockFallback);

    expect(res.fromFallback).toBe(true);
    expect(res.result.diagnosis).toBe('Heuristic Fallback');
    expect(mockFallback).toHaveBeenCalledTimes(1);
  });

  it('C. Gemini returns 429 -> immediately opens circuit, extracts retry delay, and returns fallback', async () => {
    const mock429Error = new Error('[GoogleGenerativeAI Error]: [429 Too Many Requests] Quota exceeded for gemini-3.6-flash. Please retry in 45s.');
    const mockGeminiOp = vi.fn().mockRejectedValue(mock429Error);
    const mockFallback = vi.fn().mockReturnValue({ diagnosis: 'Heuristic Fallback', confidence: 0.85 });

    const res = await breaker.execute(mockGeminiOp, mockFallback);

    expect(res.fromFallback).toBe(true);
    expect(res.reason).toBe('QUOTA_429');
    expect(breaker.getState()).toBe('OPEN');

    const stats = breaker.getStats();
    expect(stats.cooldownUntil).not.toBeNull();
    // Verify retry delay ~45 seconds was extracted
    const remainingSec = Math.ceil(((stats.cooldownUntil || 0) - Date.now()) / 1000);
    expect(remainingSec).toBeGreaterThanOrEqual(40);
    expect(remainingSec).toBeLessThanOrEqual(50);
  });

  it('D. Subsequent requests while circuit is OPEN -> zero Gemini network calls made', async () => {
    // Trip the circuit to OPEN
    breaker.trip(60);
    expect(breaker.getState()).toBe('OPEN');

    const mockGeminiOp = vi.fn().mockResolvedValue({ diagnosis: 'Should not run' });
    const mockFallback = vi.fn().mockReturnValue({ diagnosis: 'Instant Heuristic', confidence: 0.90 });

    const res1 = await breaker.execute(mockGeminiOp, mockFallback);
    const res2 = await breaker.execute(mockGeminiOp, mockFallback);
    const res3 = await breaker.execute(mockGeminiOp, mockFallback);

    expect(mockGeminiOp).not.toHaveBeenCalled();
    expect(mockFallback).toHaveBeenCalledTimes(3);
    expect(res1.reason).toBe('CIRCUIT_OPEN');
    expect(res2.reason).toBe('CIRCUIT_OPEN');
    expect(res3.reason).toBe('CIRCUIT_OPEN');
  });

  it('E. Cooldown expires -> transitions to HALF_OPEN state for single probe', () => {
    vi.useFakeTimers();
    breaker.trip(10); // 10s cooldown
    expect(breaker.getState()).toBe('OPEN');

    // Fast forward 11 seconds
    vi.advanceTimersByTime(11000);
    expect(breaker.getState()).toBe('HALF_OPEN');
  });

  it('F. HALF_OPEN probe succeeds -> closes circuit (Gemini recovered)', async () => {
    vi.useFakeTimers();
    breaker.trip(5);
    vi.advanceTimersByTime(6000);
    expect(breaker.getState()).toBe('HALF_OPEN');

    const mockProbeOp = vi.fn().mockResolvedValue({ diagnosis: 'Probe Success' });
    const mockFallback = vi.fn().mockReturnValue({ diagnosis: 'Fallback' });

    const res = await breaker.execute(mockProbeOp, mockFallback);

    expect(res.fromFallback).toBe(false);
    expect(res.result.diagnosis).toBe('Probe Success');
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('G. HALF_OPEN probe fails -> reopens circuit for new cooldown window', async () => {
    vi.useFakeTimers();
    breaker.trip(5);
    vi.advanceTimersByTime(6000);
    expect(breaker.getState()).toBe('HALF_OPEN');

    const mockProbeOp = vi.fn().mockRejectedValue(new Error('[429 Too Many Requests] Still limited'));
    const mockFallback = vi.fn().mockReturnValue({ diagnosis: 'Fallback Recovery' });

    const res = await breaker.execute(mockProbeOp, mockFallback);

    expect(res.fromFallback).toBe(true);
    expect(breaker.getState()).toBe('OPEN');
  });

  it('H. Concurrent requests during OPEN state -> all use local fallback without calling Gemini', async () => {
    breaker.trip(60);

    const mockGeminiOp = vi.fn().mockResolvedValue({ diagnosis: 'Should not run' });
    const mockFallback = vi.fn().mockImplementation((idx) => ({ diagnosis: `Fast Fallback ${idx}` }));

    const promises = Array.from({ length: 10 }).map((_, i) =>
      breaker.execute(mockGeminiOp, () => mockFallback(i))
    );

    const results = await Promise.all(promises);

    expect(mockGeminiOp).not.toHaveBeenCalled();
    expect(mockFallback).toHaveBeenCalledTimes(10);
    results.forEach((r, i) => {
      expect(r.fromFallback).toBe(true);
      expect(r.reason).toBe('CIRCUIT_OPEN');
      expect(r.result.diagnosis).toBe(`Fast Fallback ${i}`);
    });
  });

  it('I. Concurrency limiter throttles excessive simultaneous Gemini calls', async () => {
    let activeCalls = 0;
    let maxObservedCalls = 0;

    const slowGeminiOp = vi.fn().mockImplementation(async () => {
      activeCalls++;
      maxObservedCalls = Math.max(maxObservedCalls, activeCalls);
      await new Promise((resolve) => setTimeout(resolve, 50));
      activeCalls--;
      return { status: 'OK' };
    });

    const fallback = vi.fn().mockReturnValue({ status: 'FALLBACK_THROTTLED' });

    const promises = Array.from({ length: 6 }).map(() =>
      breaker.execute(slowGeminiOp, fallback)
    );

    const results = await Promise.all(promises);

    // Max active calls should never exceed 2
    expect(maxObservedCalls).toBeLessThanOrEqual(2);
    // At least some requests should have been protected and used fallback
    const throttled = results.filter((r) => r.reason === 'CONCURRENCY_LIMIT');
    expect(throttled.length).toBeGreaterThanOrEqual(1);
  });
});
