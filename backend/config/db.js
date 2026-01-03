const mysql = require('mysql2');

// On utilise l'URL que vous avez mise dans Render
const pool = mysql.createPool(process.env.DATABASE_URL + "?ssl-mode=REQUIRED");

// Test de connexion immédiat au démarrage
pool.getConnection((err, connection) => {
    if (err) {
        console.error("❌ Erreur de connexion Aiven :", err.message);
    } else {
        console.log("✅ Connecté avec succès à la base de données Aiven (Cameroun Sector)");
        connection.release();
    }
});

module.exports = pool.promise(); // Permet d'utiliser async/await (plus moderne)