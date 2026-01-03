const db = require('../config/db');

exports.getAllVoyages = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM voyages ORDER BY heure_depart ASC");
        
        // Si la base est vide, on envoie des données de démonstration (Innovant pour les tests)
        if (rows.length === 0) {
            return res.json([{
                id: 0,
                depart: "Douala",
                arrivee: "Yaoundé",
                heure_depart: "07:00:00",
                prix: 6000,
                classe: "VIP",
                image_url: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600"
            }]);
        }

        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la récupération des voyages" });
    }
};