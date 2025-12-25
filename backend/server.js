const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cors = require("cors");

// Import routes
const adminRoutes = require("./routes/adminRoutes");
const tokenRoutes = require("./routes/tokenRoutes");
const billingRoutes = require("./routes/billingRoutes");

const app = express();

app.use(cors());
app.use(express.json());
dotenv.config();

// Routes
app.get("/", (req, res) => {
    res.send("Hello World");
});

// Routes
app.use("/api/admin", adminRoutes);
app.use("/api/tokens", tokenRoutes);
app.use("/api/billing", billingRoutes);

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB connected");
    } catch (error) {
        console.log(error);
    }
}
connectDB();

const PORT = process.env.PORT;

app.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
});
