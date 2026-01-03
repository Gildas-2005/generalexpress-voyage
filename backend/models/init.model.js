const db = require('../config/db');

const initDatabase = async () => {
    try {
        // Table des Utilisateurs (Innovant : gère les rôles Admin/Client)
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nom VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role ENUM('client', 'admin') DEFAULT 'client',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Table des Voyages (Évolutif : permet d'ajouter des bus et des places)
        await db.query(`
            CREATE TABLE IF NOT EXISTS voyages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                depart VARCHAR(100) NOT NULL,
                arrivee VARCHAR(100) NOT NULL,
                heure_depart TIME NOT NULL,
                prix DECIMAL(10, 2) NOT NULL,
                places_disponibles INT DEFAULT 70,
                classe ENUM('Classique', 'VIP') DEFAULT 'Classique',
                image_url VARCHAR(255)
            )
        `);

        console.log("🚀 [Database] Tables synchronisées et prêtes.");
    } catch (error) {
        console.error("❌ [Database] Erreur d'initialisation :", error);
    }
};

module.exports = initDatabase;