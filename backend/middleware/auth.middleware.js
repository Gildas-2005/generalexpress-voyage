const jwt = require('jsonwebtoken');

exports.isAdmin = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ message: "Accès refusé" });

    try {
        const decoded = jwt.verify(token, 'SECRET_GENERAL_EXPRESS_2026');
        if (decoded.role !== 'admin') {
            return res.status(403).json({ message: "Droits insuffisants" });
        }
        next(); // Autorisé à passer !
    } catch (error) {
        res.status(401).json({ message: "Session expirée" });
    }
};