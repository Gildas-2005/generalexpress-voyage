const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Create booking
router.post('/', [
    body('tripId').isInt().withMessage('Valid trip ID required'),
    body('contactName').notEmpty().trim().withMessage('Contact name required'),
    body('contactEmail').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('contactPhone').isMobilePhone().withMessage('Valid phone number required'),
    body('passengers').isArray({ min: 1 }).withMessage('At least one passenger required'),
    body('passengers.*.fullName').notEmpty().trim(),
    body('passengers.*.idNumber').notEmpty().trim(),
    body('seatNumbers').optional().isArray(),
    body('notes').optional().trim()
], async (req, res) => {
    try {
        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const {
            tripId,
            contactName,
            contactEmail,
            contactPhone,
            passengers,
            seatNumbers,
            notes
        } = req.body;

        // Start transaction
        const connection = await req.db.getConnection();
        await connection.beginTransaction();

        try {
            // Check trip availability
            const [trips] = await connection.query(
                `SELECT id, available_seats, price, price_vip, type, reference 
                 FROM trips 
                 WHERE id = ? AND status = 'scheduled' AND available_seats >= ? 
                 FOR UPDATE`,
                [tripId, passengers.length]
            );

            if (trips.length === 0) {
                await connection.rollback();
                connection.release();
                return res.status(400).json({
                    success: false,
                    error: 'Trip not available or insufficient seats'
                });
            }

            const trip = trips[0];
            const totalAmount = trip.type === 'vip' && trip.price_vip 
                ? trip.price_vip * passengers.length 
                : trip.price * passengers.length;

            // Generate booking reference
            const bookingReference = `BOOK-${uuidv4().substring(0, 8).toUpperCase()}`;
            const userId = req.user?.id || null;

            // Create booking
            const [bookingResult] = await connection.query(
                `INSERT INTO bookings (
                    reference, user_id, trip_id, contact_name, contact_email, 
                    contact_phone, total_amount, passenger_count, seat_numbers,
                    notes, status, payment_status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending')`,
                [
                    bookingReference,
                    userId,
                    tripId,
                    contactName,
                    contactEmail,
                    contactPhone,
                    totalAmount,
                    passengers.length,
                    seatNumbers ? JSON.stringify(seatNumbers) : null,
                    notes
                ]
            );

            const bookingId = bookingResult.insertId;

            // Add passengers
            for (const passenger of passengers) {
                await connection.query(
                    `INSERT INTO passengers (booking_id, full_name, id_type, id_number)
                     VALUES (?, ?, ?, ?)`,
                    [bookingId, passenger.fullName, passenger.idType || 'cni', passenger.idNumber]
                );
            }

            // Update available seats
            await connection.query(
                `UPDATE trips 
                 SET available_seats = available_seats - ?,
                     updated_at = NOW()
                 WHERE id = ?`,
                [passengers.length, tripId]
            );

            // Commit transaction
            await connection.commit();
            connection.release();

            // Get booking details
            const [bookings] = await req.db.query(
                `SELECT b.*, t.origin, t.destination, t.departure, t.arrival,
                        t.bus_number, t.driver_name, t.driver_phone
                 FROM bookings b
                 JOIN trips t ON b.trip_id = t.id
                 WHERE b.id = ?`,
                [bookingId]
            );

            res.status(201).json({
                success: true,
                message: 'Booking created successfully',
                data: {
                    booking: bookings[0],
                    passengers: passengers,
                    totalAmount,
                    paymentRequired: true
                }
            });

        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }

    } catch (error) {
        console.error('Booking creation error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Get user bookings
router.get('/my-bookings', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { status, limit = 10, page = 1 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT b.*, t.origin, t.destination, t.departure, t.arrival,
                   t.bus_number, t.status as trip_status
            FROM bookings b
            JOIN trips t ON b.trip_id = t.id
            WHERE b.user_id = ?
        `;
        
        const params = [userId];

        if (status) {
            query += ' AND b.status = ?';
            params.push(status);
        }

        query += ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [bookings] = await req.db.query(query, params);

        // Get total count
        const [countResult] = await req.db.query(
            `SELECT COUNT(*) as total 
             FROM bookings 
             WHERE user_id = ? ${status ? 'AND status = ?' : ''}`,
            status ? [userId, status] : [userId]
        );

        res.json({
            success: true,
            data: bookings,
            pagination: {
                total: countResult[0].total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(countResult[0].total / limit)
            }
        });

    } catch (error) {
        console.error('Get bookings error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Get booking by reference
router.get('/:reference', async (req, res) => {
    try {
        const { reference } = req.params;

        const [bookings] = await req.db.query(
            `SELECT b.*, t.*, 
                    GROUP_CONCAT(CONCAT(p.full_name, '|', p.id_number) SEPARATOR ';') as passengers_info
             FROM bookings b
             JOIN trips t ON b.trip_id = t.id
             LEFT JOIN passengers p ON b.id = p.booking_id
             WHERE b.reference = ?
             GROUP BY b.id`,
            [reference]
        );

        if (bookings.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Booking not found'
            });
        }

        const booking = bookings[0];
        
        // Parse passengers
        const passengers = booking.passengers_info ? booking.passengers_info.split(';').map(p => {
            const [name, idNumber] = p.split('|');
            return { fullName: name, idNumber };
        }) : [];

        delete booking.passengers_info;

        res.json({
            success: true,
            data: {
                booking,
                passengers
            }
        });

    } catch (error) {
        console.error('Get booking error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Cancel booking
router.put('/:reference/cancel', authMiddleware, async (req, res) => {
    try {
        const { reference } = req.params;
        const userId = req.user.id;

        // Start transaction
        const connection = await req.db.getConnection();
        await connection.beginTransaction();

        try {
            // Get booking with trip details
            const [bookings] = await connection.query(
                `SELECT b.*, t.id as trip_id, t.available_seats, b.passenger_count
                 FROM bookings b
                 JOIN trips t ON b.trip_id = t.id
                 WHERE b.reference = ? AND b.user_id = ? AND b.status = 'confirmed'
                 FOR UPDATE`,
                [reference, userId]
            );

            if (bookings.length === 0) {
                await connection.rollback();
                connection.release();
                return res.status(404).json({
                    success: false,
                    error: 'Booking not found or cannot be cancelled'
                });
            }

            const booking = bookings[0];

            // Check if cancellation is allowed (24 hours before departure)
            const [trips] = await connection.query(
                `SELECT TIMESTAMPDIFF(HOUR, NOW(), departure) as hours_until_departure
                 FROM trips 
                 WHERE id = ?`,
                [booking.trip_id]
            );

            if (trips[0].hours_until_departure < 24) {
                await connection.rollback();
                connection.release();
                return res.status(400).json({
                    success: false,
                    error: 'Cancellation not allowed within 24 hours of departure'
                });
            }

            // Update booking status
            await connection.query(
                `UPDATE bookings 
                 SET status = 'cancelled',
                     updated_at = NOW()
                 WHERE reference = ?`,
                [reference]
            );

            // Restore seats
            await connection.query(
                `UPDATE trips 
                 SET available_seats = available_seats + ?,
                     updated_at = NOW()
                 WHERE id = ?`,
                [booking.passenger_count, booking.trip_id]
            );

            // If payment was made, initiate refund
            if (booking.payment_status === 'paid' && booking.flutterwave_transaction_id) {
                // Mark payment for refund
                await connection.query(
                    `UPDATE payments 
                     SET status = 'refund_pending',
                         updated_at = NOW()
                     WHERE flutterwave_transaction_id = ?`,
                    [booking.flutterwave_transaction_id]
                );
            }

            await connection.commit();
            connection.release();

            res.json({
                success: true,
                message: 'Booking cancelled successfully',
                refundEligible: booking.payment_status === 'paid'
            });

        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }

    } catch (error) {
        console.error('Cancel booking error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Download ticket
router.get('/:reference/ticket', async (req, res) => {
    try {
        const { reference } = req.params;

        const [bookings] = await req.db.query(
            `SELECT b.*, t.*,
                    GROUP_CONCAT(CONCAT(p.full_name, ' - Siège: ', COALESCE(p.seat_number, 'À assigner')) SEPARATOR '\n') as passengers_list
             FROM bookings b
             JOIN trips t ON b.trip_id = t.id
             LEFT JOIN passengers p ON b.id = p.booking_id
             WHERE b.reference = ? AND b.payment_status = 'paid'
             GROUP BY b.id`,
            [reference]
        );

        if (bookings.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Ticket not found or payment not completed'
            });
        }

        const booking = bookings[0];

        // Generate PDF ticket (simplified version - in production, use a PDF library)
        const ticketContent = `
            ====================================
                    GÉNÉRAL EXPRESS
            ====================================
            E-BILLET - ${booking.reference}
            Date d'émission: ${new Date().toLocaleDateString('fr-FR')}
            
            INFORMATIONS DU VOYAGE:
            --------------------------
            Itinéraire: ${booking.origin} → ${booking.destination}
            Date: ${new Date(booking.departure).toLocaleDateString('fr-FR')}
            Heure: ${new Date(booking.departure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            Bus: ${booking.bus_number}
            Sièges: ${booking.seat_numbers || 'À assigner'}
            
            PASSAGERS:
            --------------------------
            ${booking.passengers_list}
            
            INFORMATIONS DE CONTACT:
            --------------------------
            Nom: ${booking.contact_name}
            Email: ${booking.contact_email}
            Téléphone: ${booking.contact_phone}
            
            PAIEMENT:
            --------------------------
            Montant: ${booking.total_amount.toLocaleString()} FCFA
            Statut: ${booking.payment_status === 'paid' ? 'PAYÉ' : 'EN ATTENTE'}
            
            IMPORTANT:
            --------------------------
            1. Présentez ce billet à l'embarquement
            2. Arrivez 30 minutes avant le départ
            3. Pièce d'identité obligatoire
            4. Bagage max: 20kg (Classique) / 30kg (VIP)
            
            Service Client: +237 6 99 99 99 99
            ====================================
        `;

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="ticket-${reference}.txt"`);
        res.send(ticketContent);

    } catch (error) {
        console.error('Ticket download error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

module.exports = router;