const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const voyageRoutes = require("./routes/voyages.routes");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/voyages", voyageRoutes);

app.listen(3000, () => {
    console.log("API Général Express en ligne");
});
