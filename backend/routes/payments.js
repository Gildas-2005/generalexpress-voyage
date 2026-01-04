const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const FlutterwaveService = require('../utils/flutterwave');
const authMiddleware = require('../middleware/auth');

// Initialize payment
router.post('/initialize', [
    body('amount').isFloat({ min: 100 }).withMessage('Amount must be at least 100 FCFA'),
    body('customer.email').isEmail().normalizeEmail(),
    body('customer.phone').isMobilePhone(),
    body('customer.name').notEmpty().trim(),
    body('bookingReference').notEmpty(),
    body('method').isIn(['card', 'mobile_money', 'cash']),
    body('description').optional().trim()
], authMiddleware, async (req, res) => {
    try {
        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { amount, customer, bookingReference, method, description, operator } = req.body;
        
        // Generate unique reference
        const reference = FlutterwaveService.generateReference();
        
        // Prepare payment data
        const paymentData = {
            reference,
            amount: parseFloat(amount),
            customer: {
                email: customer.email,
                phone: customer.phone.replace(/\s/g, ''),
                name: customer.name,
                id: req.user?.id || null
            },
            bookingReference,
            description: description || `Payment for booking ${bookingReference}`,
            method,
            operator
        };

        let result;
        
        // Process based on payment method
        if (method === 'mobile_money' && operator) {
            result = await FlutterwaveService.mobileMoneyPayment(paymentData);
        } else {
            result = await FlutterwaveService.initializePayment(paymentData);
        }

        if (!result.success) {
            return res.status(400).json(result);
        }

        // Save payment record to database
        const [paymentResult] = await req.db.query(
            `INSERT INTO payments (
                booking_id, reference, amount, currency, method, status,
                customer_email, customer_phone, metadata
            ) VALUES (
                (SELECT id FROM bookings WHERE reference = ?),
                ?, ?, 'XAF', ?, 'pending',
                ?, ?, ?
            )`,
            [
                bookingReference,
                reference,
                amount,
                method,
                customer.email,
                customer.phone,
                JSON.stringify({
                    flutterwaveResponse: result.data,
                    description: paymentData.description
                })
            ]
        );

        res.json({
            success: true,
            message: 'Payment initialized successfully',
            data: {
                reference,
                paymentLink: result.paymentLink,
                requiresApproval: result.requiresApproval,
                paymentId: paymentResult.insertId
            }
        });

    } catch (error) {
        console.error('Payment initialization error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Verify payment
router.post('/verify', [
    body('reference').notEmpty(),
    body('transactionId').notEmpty()
], async (req, res) => {
    try {
        const { reference, transactionId } = req.body;

        // Verify with Flutterwave
        const verification = await FlutterwaveService.verifyPayment(transactionId);

        if (!verification.success || !verification.verified) {
            return res.status(400).json({
                success: false,
                error: 'Payment verification failed',
                details: verification.error
            });
        }

        const transaction = verification.data;

        // Update payment record
        await req.db.query(
            `UPDATE payments 
             SET status = 'successful',
                 flutterwave_transaction_id = ?,
                 verified_at = NOW(),
                 metadata = JSON_SET(metadata, '$.verification', ?)
             WHERE reference = ?`,
            [transactionId, JSON.stringify(transaction), reference]
        );

        // Update booking status
        await req.db.query(
            `UPDATE bookings 
             SET payment_status = 'paid',
                 payment_reference = ?,
                 flutterwave_transaction_id = ?,
                 status = 'confirmed'
             WHERE id = (SELECT booking_id FROM payments WHERE reference = ?)`,
            [reference, transactionId, reference]
        );

        // Send confirmation email (optional)
        // await sendPaymentConfirmation(transaction);

        res.json({
            success: true,
            message: 'Payment verified successfully',
            data: {
                reference,
                transactionId,
                amount: transaction.amount,
                currency: transaction.currency,
                paidAt: transaction.created_at,
                customer: {
                    email: transaction.customer.email,
                    name: transaction.customer.name
                }
            }
        });

    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const signature = req.headers['verif-hash'];
        const payload = req.body;

        // Verify webhook signature
        if (!FlutterwaveService.verifyWebhookSignature(payload, signature, process.env.FLW_SECRET_KEY)) {
            console.error('Invalid webhook signature');
            return res.status(401).send('Invalid signature');
        }

        const event = payload.event;
        const transactionId = payload.data.id;

        console.log(`Webhook received: ${event} for transaction ${transactionId}`);

        // Handle different events
        switch (event) {
            case 'charge.completed':
                await handleCompletedCharge(payload.data, req.db);
                break;
                
            case 'transfer.completed':
                await handleTransferCompleted(payload.data, req.db);
                break;
                
            case 'refund.completed':
                await handleRefundCompleted(payload.data, req.db);
                break;
                
            default:
                console.log(`Unhandled event: ${event}`);
        }

        res.status(200).send('Webhook received');

    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).send('Webhook error');
    }
});

// Get payment status
router.get('/status/:reference', async (req, res) => {
    try {
        const { reference } = req.params;

        const [payments] = await req.db.query(
            `SELECT p.*, b.reference as booking_reference, b.contact_name, b.contact_email
             FROM payments p
             JOIN bookings b ON p.booking_id = b.id
             WHERE p.reference = ?`,
            [reference]
        );

        if (payments.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Payment not found'
            });
        }

        const payment = payments[0];

        // If payment is pending, check with Flutterwave
        if (payment.status === 'pending' && payment.flutterwave_transaction_id) {
            const flutterwaveStatus = await FlutterwaveService.getTransaction(payment.flutterwave_transaction_id);
            
            if (flutterwaveStatus.success && flutterwaveStatus.data.status !== 'pending') {
                // Update local status
                await req.db.query(
                    `UPDATE payments SET status = ? WHERE id = ?`,
                    [flutterwaveStatus.data.status === 'successful' ? 'successful' : 'failed', payment.id]
                );
                
                payment.status = flutterwaveStatus.data.status;
            }
        }

        res.json({
            success: true,
            data: payment
        });

    } catch (error) {
        console.error('Payment status error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Helper functions for webhook
async function handleCompletedCharge(chargeData, db) {
    try {
        const { id, tx_ref, status, amount, currency, customer } = chargeData;

        if (status === 'successful') {
            // Update payment
            await db.query(
                `UPDATE payments 
                 SET status = 'successful',
                     flutterwave_transaction_id = ?,
                     verified_at = NOW(),
                     metadata = JSON_SET(metadata, '$.webhook', ?)
                 WHERE reference = ?`,
                [id, JSON.stringify(chargeData), tx_ref]
            );

            // Update booking
            await db.query(
                `UPDATE bookings 
                 SET payment_status = 'paid',
                     flutterwave_transaction_id = ?,
                     status = 'confirmed'
                 WHERE id = (SELECT booking_id FROM payments WHERE reference = ?)`,
                [id, tx_ref]
            );

            console.log(`Payment ${tx_ref} completed successfully`);
        }
    } catch (error) {
        console.error('Error handling completed charge:', error);
    }
}

async function handleTransferCompleted(transferData, db) {
    // Handle transfer completion (for refunds)
    console.log('Transfer completed:', transferData);
}

async function handleRefundCompleted(refundData, db) {
    // Handle refund completion
    console.log('Refund completed:', refundData);
}

module.exports = router;