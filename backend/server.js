require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 3000;

// MySQL Connection Pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'general_express',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Test database connection
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ MySQL Database Connected');
        connection.release();
        
        // Create tables if they don't exist
        await createTables();
    } catch (error) {
        console.error('❌ MySQL Connection Error:', error.message);
        process.exit(1);
    }
}

// Middleware
app.use(helmet());
app.use(cors({
    origin: [
        'https://general-express.vercel.app',
        'http://localhost:3000',
        'http://localhost:5500'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        success: false,
        error: 'Too many requests from this IP, please try again after 15 minutes'
    }
});
app.use('/api/', limiter);

// Make database pool available in all routes
app.use((req, res, next) => {
    req.db = pool;
    next();
});

// Routes
app.use('/api/trips', require('./routes/trips'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/schedules', require('./routes/schedules'));
app.use('/api/agencies', require('./routes/agencies'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/contact', require('./routes/contact'));

// Health check
app.get('/api/health', async (req, res) => {
    try {
        const [rows] = await req.db.query('SELECT 1 as health');
        res.json({
            success: true,
            status: 'healthy',
            database: rows[0].health === 1 ? 'connected' : 'disconnected',
            timestamp: new Date().toISOString(),
            service: 'General Express API',
            version: '2.0.0'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            status: 'unhealthy',
            error: error.message
        });
    }
});

// Root route
app.get('/', (req, res) => {
    res.json({
        message: 'General Express API v2.0',
        endpoints: {
            trips: '/api/trips',
            bookings: '/api/bookings',
            payments: '/api/payments',
            schedules: '/api/schedules',
            agencies: '/api/agencies',
            auth: '/api/auth',
            health: '/api/health'
        },
        documentation: 'https://generalexpress-voyage-api.onrender.com/api-docs'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        path: req.originalUrl
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server Error:', err.stack);
    
    const statusCode = err.statusCode || 500;
    const message = process.env.NODE_ENV === 'development' 
        ? err.message 
        : 'Internal server error';
    
    res.status(statusCode).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Create tables function
async function createTables() {
    const createTripsTable = `
        CREATE TABLE IF NOT EXISTS trips (
            id INT AUTO_INCREMENT PRIMARY KEY,
            reference VARCHAR(50) UNIQUE NOT NULL,
            origin VARCHAR(100) NOT NULL,
            destination VARCHAR(100) NOT NULL,
            departure DATETIME NOT NULL,
            arrival DATETIME NOT NULL,
            duration VARCHAR(20) NOT NULL,
            distance DECIMAL(8,2) DEFAULT 0,
            bus_type ENUM('standard', 'premium', 'vip') DEFAULT 'standard',
            type ENUM('classique', 'vip') DEFAULT 'classique',
            price DECIMAL(10,2) NOT NULL,
            price_vip DECIMAL(10,2),
            available_seats INT DEFAULT 50,
            total_seats INT DEFAULT 50,
            air_conditioned BOOLEAN DEFAULT TRUE,
            wifi BOOLEAN DEFAULT TRUE,
            usb_ports BOOLEAN DEFAULT TRUE,
            status ENUM('scheduled', 'boarding', 'departed', 'arrived', 'cancelled') DEFAULT 'scheduled',
            bus_number VARCHAR(50),
            driver_name VARCHAR(100),
            driver_license VARCHAR(50),
            driver_phone VARCHAR(20),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_origin_destination (origin, destination),
            INDEX idx_departure (departure),
            INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

    const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            phone VARCHAR(20) UNIQUE,
            full_name VARCHAR(100) NOT NULL,
            password VARCHAR(255),
            role ENUM('user', 'admin') DEFAULT 'user',
            is_active BOOLEAN DEFAULT TRUE,
            email_verified BOOLEAN DEFAULT FALSE,
            phone_verified BOOLEAN DEFAULT FALSE,
            verification_token VARCHAR(100),
            reset_token VARCHAR(100),
            reset_token_expires DATETIME,
            last_login DATETIME,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_email (email),
            INDEX idx_phone (phone)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

    const createBookingsTable = `
        CREATE TABLE IF NOT EXISTS bookings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            reference VARCHAR(50) UNIQUE NOT NULL,
            user_id INT,
            trip_id INT NOT NULL,
            contact_name VARCHAR(100) NOT NULL,
            contact_email VARCHAR(255) NOT NULL,
            contact_phone VARCHAR(20) NOT NULL,
            total_amount DECIMAL(10,2) NOT NULL,
            seat_numbers VARCHAR(255),
            passenger_count INT DEFAULT 1,
            status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending',
            payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
            payment_method ENUM('card', 'mobile_money', 'cash'),
            payment_reference VARCHAR(100),
            flutterwave_transaction_id VARCHAR(100),
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
            FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
            INDEX idx_reference (reference),
            INDEX idx_user_id (user_id),
            INDEX idx_payment_status (payment_status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

    const createPassengersTable = `
        CREATE TABLE IF NOT EXISTS passengers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            booking_id INT NOT NULL,
            full_name VARCHAR(100) NOT NULL,
            id_type ENUM('cni', 'passport', 'driving_license') DEFAULT 'cni',
            id_number VARCHAR(50) NOT NULL,
            seat_number VARCHAR(10),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
            INDEX idx_booking_id (booking_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

    const createPaymentsTable = `
        CREATE TABLE IF NOT EXISTS payments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            booking_id INT NOT NULL,
            reference VARCHAR(100) UNIQUE NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            currency VARCHAR(3) DEFAULT 'XAF',
            method ENUM('card', 'mobile_money', 'cash') NOT NULL,
            status ENUM('pending', 'successful', 'failed', 'cancelled') DEFAULT 'pending',
            flutterwave_transaction_id VARCHAR(100),
            customer_email VARCHAR(255),
            customer_phone VARCHAR(20),
            metadata JSON,
            verified_at DATETIME,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
            INDEX idx_reference (reference),
            INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

    const createAgenciesTable = `
        CREATE TABLE IF NOT EXISTS agencies (
            id INT AUTO_INCREMENT PRIMARY KEY,
            city VARCHAR(100) NOT NULL,
            address TEXT NOT NULL,
            phone VARCHAR(20) NOT NULL,
            email VARCHAR(255),
            manager_name VARCHAR(100),
            opening_time TIME DEFAULT '06:00:00',
            closing_time TIME DEFAULT '22:00:00',
            latitude DECIMAL(10,8),
            longitude DECIMAL(11,8),
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_city (city),
            INDEX idx_is_active (is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

    const createSchedulesTable = `
        CREATE TABLE IF NOT EXISTS schedules (
            id INT AUTO_INCREMENT PRIMARY KEY,
            origin VARCHAR(100) NOT NULL,
            destination VARCHAR(100) NOT NULL,
            departure_time TIME NOT NULL,
            arrival_time TIME NOT NULL,
            duration VARCHAR(20) NOT NULL,
            frequency ENUM('daily', 'weekdays', 'weekends', 'specific') DEFAULT 'daily',
            bus_type VARCHAR(50),
            price_classic DECIMAL(10,2) NOT NULL,
            price_vip DECIMAL(10,2),
            available_days VARCHAR(50) DEFAULT '1,2,3,4,5,6,7',
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_route (origin, destination)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

    try {
        const tables = [
            createTripsTable,
            createUsersTable,
            createBookingsTable,
            createPassengersTable,
            createPaymentsTable,
            createAgenciesTable,
            createSchedulesTable
        ];

        for (const tableQuery of tables) {
            await pool.query(tableQuery);
        }
        
        console.log('✅ Database tables created/verified');
        
        // Insert sample data if tables are empty
        await insertSampleData();
        
    } catch (error) {
        console.error('❌ Error creating tables:', error.message);
    }
}

async function insertSampleData() {
    try {
        // Check if agencies table is empty
        const [agencies] = await pool.query('SELECT COUNT(*) as count FROM agencies');
        if (agencies[0].count === 0) {
            const sampleAgencies = [
                ['Yaoundé', 'Carrefour Ngoa-Ekelle', '+237 6 99 88 77 66', 'yaounde@generalexpress.cm', 'Jean Dupont', '06:00:00', '22:00:00', 3.8480, 11.5021, 1],
                ['Douala', 'Boulevard de la Liberté', '+237 6 99 88 77 55', 'douala@generalexpress.cm', 'Marie Ngo', '05:30:00', '23:00:00', 4.0511, 9.7679, 1],
                ['Bafoussam', 'Marché Central', '+237 6 99 88 77 44', 'bafoussam@generalexpress.cm', 'Paul Fotso', '06:30:00', '21:00:00', 5.4778, 10.4176, 1],
                ['Garoua', 'Avenue des Combattants', '+237 6 99 88 77 33', 'garoua@generalexpress.cm', 'Ahmed Oumarou', '07:00:00', '20:00:00', 9.3018, 13.3727, 1]
            ];

            for (const agency of sampleAgencies) {
                await pool.query(
                    'INSERT INTO agencies (city, address, phone, email, manager_name, opening_time, closing_time, latitude, longitude, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    agency
                );
            }
            console.log('✅ Sample agencies inserted');
        }

        // Check if trips table is empty
        const [trips] = await pool.query('SELECT COUNT(*) as count FROM trips');
        if (trips[0].count === 0) {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            const sampleTrips = [
                ['GE-' + Date.now(), 'Yaoundé', 'Douala', 
                 tomorrow.toISOString().split('T')[0] + ' 06:00:00',
                 tomorrow.toISOString().split('T')[0] + ' 11:00:00',
                 '5h', 250.00, 'premium', 'classique', 13000.00, 20000.00, 
                 45, 50, 1, 1, 1, 'scheduled', 'GE-001', 'Martin Ngo', 'DL-001', '+237 6 77 77 77 77'],
                
                ['GE-' + (Date.now() + 1), 'Douala', 'Yaoundé',
                 tomorrow.toISOString().split('T')[0] + ' 08:00:00',
                 tomorrow.toISOString().split('T')[0] + ' 13:00:00',
                 '5h', 250.00, 'vip', 'vip', 20000.00, 20000.00,
                 25, 30, 1, 1, 1, 'scheduled', 'GE-VIP1', 'Eric Mbappe', 'DL-002', '+237 6 77 77 77 78']
            ];

            for (const trip of sampleTrips) {
                await pool.query(
                    `INSERT INTO trips (
                        reference, origin, destination, departure, arrival, 
                        duration, distance, bus_type, type, price, price_vip,
                        available_seats, total_seats, air_conditioned, wifi, usb_ports,
                        status, bus_number, driver_name, driver_license, driver_phone
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    trip
                );
            }
            console.log('✅ Sample trips inserted');
        }

    } catch (error) {
        console.error('❌ Error inserting sample data:', error.message);
    }
}

// Start server
async function startServer() {
    await testConnection();
    
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔗 API URL: http://localhost:${PORT}`);
        console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
    });
}

startServer();

module.exports = app;