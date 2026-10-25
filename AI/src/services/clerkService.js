const { createClerkClient } = require("@clerk/backend");

const clerkClient = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
});

async function getClerkUser(userId) {
    return await clerkClient.users.getUser(userId);
}

module.exports = {
    getClerkUser,
};