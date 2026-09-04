/**
 * Gemini API Quota & Rate-Limit Circuit Breaker
 *
 * Implements a 3-state circuit breaker pattern (CLOSED -> OPEN -> HALF_OPEN)
 * with retry delay extraction, concurrency throttling, and request storm protection.
 */
export class GeminiCircuitBreaker {
    static instance;
    state = 'CLOSED';
    consecutiveFailures = 0;
    lastFailureTime = null;
    cooldownUntil = null;
    activeRequests = 0;
    totalRequests = 0;
    totalFallbackHits = 0;
    // Maximum concurrent active Gemini calls to prevent quota exhaustion from request storms
    maxConcurrentRequests = 2;
    // Default cooldown in seconds when retryDelay cannot be extracted
    defaultCooldownSeconds = 60;
    static getInstance() {
        if (!GeminiCircuitBreaker.instance) {
            GeminiCircuitBreaker.instance = new GeminiCircuitBreaker();
        }
        return GeminiCircuitBreaker.instance;
    }
    /**
     * Resets circuit breaker state (useful for unit testing).
     */
    reset() {
        this.state = 'CLOSED';
        this.consecutiveFailures = 0;
        this.lastFailureTime = null;
        this.cooldownUntil = null;
        this.activeRequests = 0;
        this.totalRequests = 0;
        this.totalFallbackHits = 0;
    }
    /**
     * Evaluates and returns current circuit state, handling cooldown transitions.
     */
    getState() {
        const now = Date.now();
        if (this.state === 'OPEN' && this.cooldownUntil && now >= this.cooldownUntil) {
            this.state = 'HALF_OPEN';
            console.log('[AI] Gemini circuit HALF_OPEN — testing availability with single probe request');
        }
        return this.state;
    }
    getStats() {
        return {
            state: this.getState(),
            consecutiveFailures: this.consecutiveFailures,
            lastFailureTime: this.lastFailureTime,
            cooldownUntil: this.cooldownUntil,
            activeRequests: this.activeRequests,
            totalRequests: this.totalRequests,
            totalFallbackHits: this.totalFallbackHits
        };
    }
    /**
     * Manually trips the circuit breaker to OPEN state (for testing or external 429 signals).
     */
    trip(cooldownSeconds = 60) {
        this.state = 'OPEN';
        this.cooldownUntil = Date.now() + cooldownSeconds * 1000;
        this.lastFailureTime = Date.now();
        this.consecutiveFailures++;
        console.warn(`[AI] Gemini circuit manually OPENED for ${cooldownSeconds}s`);
    }
    /**
     * Executes a Gemini API call if circuit is available, otherwise calls fallback immediately.
     */
    async execute(operation, fallback) {
        this.totalRequests++;
        const currentState = this.getState();
        // 1. If circuit is OPEN -> bypass network completely and use fallback
        if (currentState === 'OPEN') {
            this.totalFallbackHits++;
            const remainingSec = Math.max(0, Math.ceil(((this.cooldownUntil || 0) - Date.now()) / 1000));
            console.log(`[AI] Gemini circuit OPEN (cooling down for ${remainingSec}s) — fast fallback to local heuristic`);
            return { result: await fallback(), fromFallback: true, reason: 'CIRCUIT_OPEN' };
        }
        // 2. If HALF_OPEN -> only allow 1 probe request concurrently
        if (currentState === 'HALF_OPEN') {
            if (this.activeRequests >= 1) {
                this.totalFallbackHits++;
                console.log('[AI] Gemini circuit HALF_OPEN (probe in flight) — fast fallback to local heuristic for concurrent request');
                return { result: await fallback(), fromFallback: true, reason: 'HALF_OPEN_PROBE_BUSY' };
            }
        }
        // 3. Concurrency limiter protection (Request storm guard)
        if (this.activeRequests >= this.maxConcurrentRequests) {
            this.totalFallbackHits++;
            console.log(`[AI] Gemini concurrency limit reached (${this.activeRequests}/${this.maxConcurrentRequests}) — using local heuristic`);
            return { result: await fallback(), fromFallback: true, reason: 'CONCURRENCY_LIMIT' };
        }
        // 4. Execute Gemini request
        this.activeRequests++;
        try {
            if (currentState === 'HALF_OPEN') {
                console.log('[AI] Gemini request probe starting (model: gemini-3.6-flash)');
            }
            else {
                console.log('[AI] Gemini request starting (model: gemini-3.6-flash)');
            }
            const res = await operation();
            this.onSuccess();
            return { result: res, fromFallback: false };
        }
        catch (err) {
            return await this.onFailure(err, fallback);
        }
        finally {
            this.activeRequests--;
        }
    }
    onSuccess() {
        if (this.state === 'HALF_OPEN') {
            console.log('✅ [AI] Gemini probe succeeded — closing circuit (Gemini recovered)');
        }
        this.state = 'CLOSED';
        this.consecutiveFailures = 0;
        this.cooldownUntil = null;
    }
    async onFailure(err, fallback) {
        this.totalFallbackHits++;
        this.lastFailureTime = Date.now();
        this.consecutiveFailures++;
        const is429 = this.isRateLimitOrQuotaError(err);
        const cooldownSec = is429 ? this.extractRetryDelay(err) : this.defaultCooldownSeconds;
        if (is429) {
            this.state = 'OPEN';
            this.cooldownUntil = Date.now() + cooldownSec * 1000;
            console.warn(`⚠️ [AI] Gemini quota exhausted (429) — opening circuit for ${cooldownSec}s`);
        }
        else {
            const safeCategory = this.classifyError(err);
            if (this.state === 'HALF_OPEN') {
                this.state = 'OPEN';
                this.cooldownUntil = Date.now() + 30 * 1000; // 30s cooldown on probe failure
                console.warn(`⚠️ [AI] Gemini probe failed (${safeCategory}) — reopening circuit for 30s`);
            }
            else if (this.consecutiveFailures >= 2) {
                this.state = 'OPEN';
                this.cooldownUntil = Date.now() + 30 * 1000;
                console.warn(`⚠️ [AI] Gemini repeated failures (${safeCategory}) — opening circuit for 30s`);
            }
            else {
                console.warn(`[AI] Gemini request failed (${safeCategory}) — falling back to local heuristic`);
            }
        }
        return { result: await fallback(), fromFallback: true, reason: is429 ? 'QUOTA_429' : 'API_ERROR' };
    }
    isRateLimitOrQuotaError(err) {
        if (!err)
            return false;
        const msg = (typeof err.message === 'string' ? err.message : String(err)).toLowerCase();
        const status = err.status || err.statusCode || err.response?.status;
        return (status === 429 ||
            msg.includes('429') ||
            msg.includes('too many requests') ||
            msg.includes('quota') ||
            msg.includes('resource_exhausted') ||
            msg.includes('rate limit'));
    }
    extractRetryDelay(err) {
        const text = (err?.message || '') + ' ' + JSON.stringify(err || {});
        const match = text.match(/retry(?:Delay| in)?[:\s"]+(\d+(?:\.\d+)?)\s*s/i) ||
            text.match(/retryDelay["']?\s*:\s*["']?(\d+)/i);
        if (match && match[1]) {
            const sec = Math.ceil(parseFloat(match[1]));
            if (sec >= 1 && sec <= 3600) {
                return sec;
            }
        }
        return this.defaultCooldownSeconds;
    }
    classifyError(err) {
        if (!err)
            return 'UNKNOWN_ERROR';
        const msg = (err.message || String(err)).toLowerCase();
        if (msg.includes('timed out') || msg.includes('timeout'))
            return 'TIMEOUT';
        if (msg.includes('404') || msg.includes('not found'))
            return 'MODEL_NOT_FOUND_404';
        if (msg.includes('fetch failed') || msg.includes('econnrefused') || msg.includes('network'))
            return 'NETWORK_ERROR';
        if (msg.includes('unauthorized') || msg.includes('api_key') || msg.includes('401') || msg.includes('403'))
            return 'AUTH_ERROR';
        return 'SERVICE_UNAVAILABLE';
    }
}
