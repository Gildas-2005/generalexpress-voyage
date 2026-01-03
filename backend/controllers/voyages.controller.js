const db = require("../config/db");

exports.getAll = (req, res) => {
  db.query("SELECT * FROM voyages", (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
};
