const mysql = require('mysql2');

/**
 * Configuration de la connexion à la base de données
 * Utilise la variable d'environnement DATABASE_URL fournie par Render/Aiven
 */
const dbUrl = process.env.DATABASE_URL;

const pool = mysql.createPool(dbUrl ? dbUrl : {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'general_express_local' // Nom pour votre usage local
});

// On exporte le pool en version "promise" pour pouvoir utiliser async/await dans vos controllers
module.exports = pool.promise();