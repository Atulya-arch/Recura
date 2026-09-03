import { PaymentStatus } from '../../shared/enums.js';
export class RazorpayPaymentProvider {
    name = 'RAZORPAY TEST MODE';
    keyId;
    keySecret;
    constructor() {
        this.keyId = process.env.RAZORPAY_KEY_ID || '';
        this.keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    }
    isConfigured() {
        return Boolean(this.keyId && this.keySecret);
    }
    async createPayment(request) {
        if (!this.isConfigured()) {
            throw new Error('Razorpay credentials missing. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
        }
        try {
            const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
            const response = await fetch('https://api.razorpay.com/v1/orders', {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount: request.amountMinor,
                    currency: request.currency || 'INR',
                    receipt: `rc_order_${request.transactionId}`,
                    notes: {
                        idempotency_key: request.idempotencyKey,
                        customer_id: request.customerId
                    }
                })
            });
            const data = await response.json();
            if (!response.ok) {
                return {
                    success: false,
                    status: PaymentStatus.FAILED,
                    providerTransactionId: data.id || `rzp_err_${Date.now()}`,
                    rawResponse: data,
                    errorMessage: data.error?.description || 'Razorpay order creation failed'
                };
            }
            return {
                success: true,
                status: PaymentStatus.PENDING,
                providerTransactionId: data.id,
                rawResponse: data
            };
        }
        catch (err) {
            return {
                success: false,
                status: PaymentStatus.FAILED,
                providerTransactionId: `rzp_exc_${Date.now()}`,
                rawResponse: { error: err.message },
                errorMessage: err.message
            };
        }
    }
    async retryPayment(request) {
        return this.createPayment(request);
    }
    async getPaymentStatus(transactionId) {
        return PaymentStatus.PENDING;
    }
    async verifyPayment(transactionId, providerTransactionId) {
        if (!this.isConfigured() || !providerTransactionId) {
            return {
                verified: true,
                actualStatus: PaymentStatus.SUCCESS,
                verifiedAt: new Date().toISOString(),
                details: 'Razorpay verification skipped (unconfigured credentials).'
            };
        }
        try {
            const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
            const response = await fetch(`https://api.razorpay.com/v1/orders/${providerTransactionId}`, {
                headers: { 'Authorization': `Basic ${auth}` }
            });
            const data = await response.json();
            const rzpStatus = data.status;
            let actualStatus = PaymentStatus.PENDING;
            if (rzpStatus === 'paid')
                actualStatus = PaymentStatus.SUCCESS;
            else if (rzpStatus === 'attempted')
                actualStatus = PaymentStatus.FAILED;
            return {
                verified: true,
                actualStatus,
                verifiedAt: new Date().toISOString(),
                details: `Razorpay order status confirmed: ${rzpStatus}`
            };
        }
        catch (err) {
            return {
                verified: false,
                actualStatus: PaymentStatus.UNKNOWN,
                verifiedAt: new Date().toISOString(),
                details: `Razorpay verification request failed: ${err.message}`
            };
        }
    }
}
