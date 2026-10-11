const http = require("http");
const dotenv = require("dotenv");

dotenv.config();

const app = require("./src/app");
const connectDB = require("./src/config/db");

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
    await connectDB();

    const server = http.createServer(app);

    server.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

if (require.main === module) {
    startServer();
}

module.exports = startServer;
