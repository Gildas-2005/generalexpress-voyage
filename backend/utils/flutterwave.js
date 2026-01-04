const axios = require('axios');
const crypto = require('crypto');

class FlutterwaveService {
    constructor() {
        this.publicKey = process.env.FLW_PUBLIC_KEY;
        this.secretKey = process.env.FLW_SECRET_KEY;
        this.encryptionKey = process.env.FLW_ENCRYPTION_KEY;
        this.baseURL = 'https://api.flutterwave.com/v3';
        
        this.axiosInstance = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Authorization': `Bearer ${this.secretKey}`,
                'Content-Type': 'application/json'
            }
        });
    }

    // Initialize payment
    async initializePayment(paymentData) {
        try {
            const payload = {
                tx_ref: paymentData.reference,
                amount: paymentData.amount,
                currency: 'XAF',
                redirect_url: `${process.env.APP_URL}/payment/callback`,
                customer: {
                    email: paymentData.customer.email,
                    phonenumber: paymentData.customer.phone,
                    name: paymentData.customer.name
                },
                customizations: {
                    title: 'General Express',
                    description: `Payment for ${paymentData.description}`,
                    logo: `${process.env.APP_URL}/logo.png`
                },
                meta: {
                    booking_reference: paymentData.bookingReference,
                    customer_id: paymentData.customer.id
                }
            };

            // Add payment method specific data
            if (paymentData.method === 'card') {
                payload.payment_options = 'card';
            } else if (paymentData.method === 'mobile_money') {
                payload.payment_options = 'mobilemoney';
                payload.meta.mobile_money_operator = paymentData.operator;
            }

            const response = await this.axiosInstance.post('/payments', payload);
            
            return {
                success: true,
                data: response.data,
                paymentLink: response.data.data.link
            };
        } catch (error) {
            console.error('Flutterwave initialization error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || 'Payment initialization failed'
            };
        }
    }

    // Verify payment
    async verifyPayment(transactionId) {
        try {
            const response = await this.axiosInstance.get(`/transactions/${transactionId}/verify`);
            const data = response.data.data;
            
            // Check if payment was successful
            if (data.status === 'successful' && data.amount === data.charged_amount) {
                return {
                    success: true,
                    data: data,
                    verified: true
                };
            } else {
                return {
                    success: false,
                    data: data,
                    verified: false,
                    error: 'Payment verification failed'
                };
            }
        } catch (error) {
            console.error('Flutterwave verification error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || 'Payment verification failed'
            };
        }
    }

    // Mobile money payment
    async mobileMoneyPayment(paymentData) {
        try {
            const payload = {
                tx_ref: paymentData.reference,
                amount: paymentData.amount,
                currency: 'XAF',
                email: paymentData.customer.email,
                phone_number: paymentData.customer.phone,
                fullname: paymentData.customer.name,
                is_mobile_money: 1,
                redirect_url: `${process.env.APP_URL}/payment/callback`,
                meta: {
                    booking_reference: paymentData.bookingReference,
                    operator: paymentData.operator
                }
            };

            const response = await this.axiosInstance.post('/charges?type=mobile_money', payload);
            
            return {
                success: true,
                data: response.data,
                requiresApproval: response.data.meta?.authorization?.mode === 'redirect'
            };
        } catch (error) {
            console.error('Mobile money payment error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || 'Mobile money payment failed'
            };
        }
    }

    // Transfer to bank account (for refunds)
    async transferToBank(transferData) {
        try {
            const payload = {
                account_bank: transferData.bankCode,
                account_number: transferData.accountNumber,
                amount: transferData.amount,
                narration: transferData.narration || 'Refund from General Express',
                currency: 'XAF',
                reference: `REFUND-${Date.now()}`,
                beneficiary_name: transferData.beneficiaryName
            };

            const response = await this.axiosInstance.post('/transfers', payload);
            
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Bank transfer error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || 'Bank transfer failed'
            };
        }
    }

    // Get transaction details
    async getTransaction(transactionId) {
        try {
            const response = await this.axiosInstance.get(`/transactions/${transactionId}`);
            return {
                success: true,
                data: response.data.data
            };
        } catch (error) {
            console.error('Get transaction error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || 'Failed to get transaction'
            };
        }
    }

    // Verify webhook signature
    verifyWebhookSignature(payload, signature, secret) {
        try {
            const hash = crypto
                .createHmac('sha256', secret)
                .update(JSON.stringify(payload))
                .digest('hex');
            
            return hash === signature;
        } catch (error) {
            console.error('Webhook verification error:', error);
            return false;
        }
    }

    // Generate payment reference
    generateReference(prefix = 'GE') {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        return `${prefix}-${timestamp}-${random}`;
    }

    // Calculate fees
    calculateFees(amount) {
        // Flutterwave fees: 1.4% + 100 XAF for local cards
        const percentageFee = amount * 0.014;
        const fixedFee = 100;
        const totalFee = percentageFee + fixedFee;
        
        return {
            amount: amount,
            fee: Math.ceil(totalFee),
            total: Math.ceil(amount + totalFee),
            breakdown: {
                percentage: Math.ceil(percentageFee),
                fixed: fixedFee
            }
        };
    }
}

module.exports = new FlutterwaveService();