const app = require("../src/app.js");
const connectDB = require("../src/config/db.js");

let isConnected = false;

module.exports = async (req, res) => {
  try {
    if (!isConnected) {
      await connectDB();
      isConnected = true;
      console.log("MongoDB Connected");
    }

    return app(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Internal Server Error",
    });
  }
};