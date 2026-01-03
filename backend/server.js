const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

// --- MIDDLEWARES INNOVANTS ---
app.use(cors()); // Autorise votre frontend à parler au backend
app.use(morgan('dev')); // Affiche chaque requête dans les logs Render pour le débogage
app.use(express.json()); // Permet de lire les données JSON envoyées par les formulaires
app.use(express.urlencoded({ extended: true }));

// --- ROUTE DE SANTÉ (Health Check) ---
// Très utile pour Render afin de vérifier que le serveur est "Live"
app.get('/status', (req, res) => {
    res.json({ status: 'Aérien', message: 'Le serveur Général Express est opérationnel' });
});

// --- IMPORTATION DES ROUTES (Architecture Évolutive) ---
// On sépare la logique pour pouvoir ajouter 1000 fonctionnalités sans désordre
const authRoutes = require('./routes/auth.routes');
const voyagesRoutes = require('./routes/voyages.routes');
app.use('/api/auth', authRoutes);
app.use('/api/voyages', voyagesRoutes);

const initDatabase = require('./models/init.model');
initDatabase(); // Se lance automatiquement au démarrage sur Render



// --- GESTION DES ERREURS (Le côté pro) ---
// Si une route n'existe pas, on renvoie une erreur propre au lieu d'un crash
app.use((req, res, next) => {
    res.status(404).json({ message: "Désolé, cette destination n'existe pas." });
});

// --- DÉMARRAGE DU SERVEUR ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`
    ===========================================
    🚀 SERVEUR GÉNÉRAL EXPRESS DÉMARRÉ
    📍 Port : ${PORT}
    📡 Environnement : Production (Render)
    ===========================================
    `);
});