const db = require('../config/db');

exports.getStats = async (req, res) => {
    try {
        // Innovation : Récupérer plusieurs stats en une seule fois
        const [usersCount] = await db.query("SELECT COUNT(*) as total FROM users");
        const [voyagesCount] = await db.query("SELECT COUNT(*) as total FROM voyages");
        
        res.json({
            utilisateurs: usersCount[0].total,
            voyages: voyagesCount[0].total,
            status: "Système Optimal"
        });
    } catch (error) {
        res.status(500).json({ message: "Erreur de chargement des statistiques" });
    }
};