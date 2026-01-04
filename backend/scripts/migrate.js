require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

async function runMigrations() {
    let connection;
    
    try {
        // Create database if not exists
        const dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            port: process.env.DB_PORT || 3306
        };

        connection = await mysql.createConnection(dbConfig);
        
        // Create database
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'general_express'}`);
        await connection.query(`USE ${process.env.DB_NAME || 'general_express'}`);
        
        console.log(`✅ Database ${process.env.DB_NAME || 'general_express'} ready`);
        
        // Read migration files
        const migrationsDir = path.join(__dirname, '../migrations');
        let migrationFiles;
        
        try {
            migrationFiles = await fs.readdir(migrationsDir);
        } catch (error) {
            console.log('No migrations directory, creating initial schema...');
            await createInitialSchema(connection);
            return;
        }
        
        // Create migrations table if not exists
        await connection.query(`
            CREATE TABLE IF NOT EXISTS migrations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Get executed migrations
        const [executedMigrations] = await connection.query('SELECT name FROM migrations');
        const executedNames = executedMigrations.map(m => m.name);
        
        // Run pending migrations
        for (const file of migrationFiles.sort()) {
            if (!executedNames.includes(file) && file.endsWith('.sql')) {
                console.log(`Running migration: ${file}`);
                
                const migrationPath = path.join(migrationsDir, file);
                const sql = await fs.readFile(migrationPath, 'utf8');
                
                // Split by semicolon and execute each statement
                const statements = sql.split(';').filter(s => s.trim());
                
                for (const statement of statements) {
                    if (statement.trim()) {
                        await connection.query(statement);
                    }
                }
                
                // Record migration
                await connection.query('INSERT INTO migrations (name) VALUES (?)', [file]);
                console.log(`✅ Migration ${file} completed`);
            }
        }
        
        console.log('✅ All migrations completed successfully');
        
    } catch (error) {
        console.error('❌ Migration error:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

async function createInitialSchema(connection) {
    const schema = `
        -- Initial schema for General Express
        
        -- Trips table
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

        -- Users table
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

        -- Bookings table
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

        -- Passengers table
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

        -- Payments table
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

        -- Agencies table
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

        -- Schedules table
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

        -- Insert sample agencies
        INSERT IGNORE INTO agencies (city, address, phone, email, manager_name, opening_time, closing_time, latitude, longitude) VALUES
        ('Yaoundé', 'Carrefour Ngoa-Ekelle', '+237 6 99 88 77 66', 'yaounde@generalexpress.cm', 'Jean Dupont', '06:00:00', '22:00:00', 3.8480, 11.5021),
        ('Douala', 'Boulevard de la Liberté', '+237 6 99 88 77 55', 'douala@generalexpress.cm', 'Marie Ngo', '05:30:00', '23:00:00', 4.0511, 9.7679),
        ('Bafoussam', 'Marché Central', '+237 6 99 88 77 44', 'bafoussam@generalexpress.cm', 'Paul Fotso', '06:30:00', '21:00:00', 5.4778, 10.4176);

        -- Insert sample trips
        INSERT IGNORE INTO trips (reference, origin, destination, departure, arrival, duration, distance, bus_type, type, price, price_vip, available_seats, total_seats) VALUES
        ('GE-001', 'Yaoundé', 'Douala', DATE_ADD(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 1 DAY) + INTERVAL 5 HOUR, '5h', 250.00, 'premium', 'classique', 13000.00, 20000.00, 45, 50),
        ('GE-002', 'Douala', 'Yaoundé', DATE_ADD(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 1 DAY) + INTERVAL 5 HOUR, '5h', 250.00, 'vip', 'vip', 20000.00, 20000.00, 25, 30),
        ('GE-003', 'Yaoundé', 'Bafoussam', DATE_ADD(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 1 DAY) + INTERVAL 4 HOUR, '4h', 200.00, 'standard', 'classique', 15000.00, 22000.00, 40, 50);

        -- Create admin user (password: Admin123!)
        INSERT IGNORE INTO users (email, phone, full_name, password, role) VALUES
        ('admin@generalexpress.cm', '+237 6 00 00 00 00', 'Administrator', '$2a$10$YourHashedPasswordHere', 'admin');

        CREATE TABLE IF NOT EXISTS migrations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) UNIQUE NOT NULL,
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        INSERT IGNORE INTO migrations (name) VALUES ('001_initial_schema.sql');
    `;

    // Split and execute
    const statements = schema.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
        if (statement.trim()) {
            await connection.query(statement);
        }
    }
    
    console.log('✅ Initial schema created successfully');
}

runMigrations();