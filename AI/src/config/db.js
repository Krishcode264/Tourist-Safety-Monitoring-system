const mongoose = require("mongoose")

async function connectDB() {
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    if (mongoose.connection.readyState === 2) {
        await new Promise((resolve, reject) => {
            mongoose.connection.once("open", resolve);
            mongoose.connection.once("error", reject);
        });
        return mongoose.connection;
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB Connected");
        return mongoose.connection;
    } catch (error) {
        console.error("❌ MongoDB Connection Failed");
        console.error(error.message);

        if (process.env.NODE_ENV !== "production") {
            process.exit(1);
        }

        throw error;
    }
}

module.exports = connectDB;