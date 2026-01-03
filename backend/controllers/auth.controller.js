const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.login = (req, res) => {
  const { email, password } = req.body;

  db.query("SELECT * FROM users WHERE email = ?", [email], (err, result) => {
    if (err || result.length === 0)
      return res.status(401).json({ message: "Utilisateur non trouvé" });

    const user = result[0];
    if (!bcrypt.compareSync(password, user.password))
      return res.status(401).json({ message: "Mot de passe incorrect" });

    const token = jwt.sign({ id: user.id, role: user.role }, "SECRET_KEY", {
      expiresIn: "1d"
    });

    res.json({ token });
  });
};
