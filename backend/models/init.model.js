const db = require('./config/db');
const bcrypt = require('bcryptjs');

async function initializeDatabase() {
    try {
        // --- Création de la table 'users' ---
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nom VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role ENUM('client', 'admin') DEFAULT 'client',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Table 'users' vérifiée/créée.");

        // --- Création de la table 'voyages' ---
        await db.query(`
            CREATE TABLE IF NOT EXISTS voyages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                depart VARCHAR(255) NOT NULL,
                arrivee VARCHAR(255) NOT NULL,
                heure_depart TIME NOT NULL,
                classe ENUM('VIP', 'Classique') NOT NULL,
                prix_classique DECIMAL(10, 2) NOT NULL,
                prix_vip DECIMAL(10, 2) NOT NULL,
                places_disponibles INT NOT NULL DEFAULT 50,
                image_url VARCHAR(255),
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Table 'voyages' vérifiée/créée.");

        // --- Insertion de données de test (TRÈS IMPORTANT !) ---
        // Vérifier si des utilisateurs existent déjà pour éviter les doublons
        const [existingUsers] = await db.query("SELECT COUNT(*) AS count FROM users");
        if (existingUsers[0].count === 0) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('admin123', salt); // Mot de passe admin

            await db.query(
                "INSERT INTO users (nom, email, password, role) VALUES (?, ?, ?, ?)",
                ['Super Admin', 'admin@generalexpress.com', hashedPassword, 'admin']
            );
            console.log("Compte admin par défaut créé.");
        }

        // Vérifier si des voyages existent déjà
        const [existingVoyages] = await db.query("SELECT COUNT(*) AS count FROM voyages");
        if (existingVoyages[0].count === 0) {
            await db.query(`
                INSERT INTO voyages (depart, arrivee, heure_depart, classe, prix_classique, prix_vip, places_disponibles, image_url, description) VALUES
                ('Yaoundé', 'Douala', '06:00:00', 'VIP', 6000, 10000, 45, 'https://images.unsplash.com/photo-1596707328108-e766b96e625a?q=80', 'Voyage rapide et confortable entre les deux capitales économiques.'),
                ('Douala', 'Yaoundé', '07:30:00', 'Classique', 6000, 10000, 50, 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80', 'Le choix économique pour un trajet sûr.'),
                ('Yaoundé', 'Bafoussam', '09:00:00', 'Classique', 5000, 8000, 30, 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80', 'Découvrez les hauts plateaux de l\'Ouest.'),
                ('Bafoussam', 'Yaoundé', '11:00:00', 'VIP', 5000, 8000, 28, 'https://images.unsplash.com/photo-1596707328108-e766b96e625a?q=80', 'Voyagez avec luxe vers la capitale.'),
                ('Douala', 'Bafoussam', '10:00:00', 'VIP', 5000, 8000, 40, 'https://images.unsplash.com/photo-1596707328108-e766b96e625a?q=80', 'Connexion rapide entre Douala et la région de l\'Ouest.'),
                ('Bafoussam', 'Douala', '13:00:00', 'Classique', 5000, 8000, 35, 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80', 'Le trajet régulier pour vos affaires ou loisirs.'),
                ('Yaoundé', 'Bamenda', '08:00:00', 'VIP', 8000, 15000, 20, 'https://images.unsplash.com/photo-1596707328108-e766b96e625a?q=80', 'Voyage express vers le Nord-Ouest.'),
                ('Douala', 'Kribi', '09:30:00', 'Classique', 7000, 12000, 48, 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80', 'Détendez-vous en allant vers les plages de Kribi.'),
                ('Kribi', 'Douala', '14:00:00', 'VIP', 7000, 12000, 40, 'https://images.unsplash.com/photo-1596707328108-e766b96e625a?q=80', 'Retour confortable de la côte vers la métropole.'),
                ('Yaoundé', 'Ebolowa', '10:30:00', 'Classique', 4000, 7000, 30, 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80', 'Explorez le Sud du Cameroun.'),
                ('Douala', 'Ngaoundéré', '18:00:00', 'VIP', 15000, 25000, 15, 'https://images.unsplash.com/photo-1596707328108-e766b96e625a?q=80', 'Long trajet de nuit vers la région de l\'Adamaoua.')
            `);
            console.log("Données de voyages de démonstration insérées.");
        }

    } catch (error) {
        console.error("Erreur lors de l'initialisation de la base de données:", error);
    }
}

module.exports = initializeDatabase;