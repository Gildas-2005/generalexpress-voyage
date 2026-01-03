const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "mysql-a86aa83-ngoumkwegildas-e93f.l.aivencloud.com
",
  user: "avnadmin",
  password: "AVNS_QtIeBUwEr-rsW9higU4",
  database: "generalexpress"
});

db.connect(err => {
  if (err) throw err;
  console.log("Base de données connectée");
});

module.exports = db;
