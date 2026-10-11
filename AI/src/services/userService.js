const User = require("../models/User");

async function findUserByClerkId(clerkId) {
    return await User.findOne({ clerkId });
}

async function createUser(userData) {
    return await User.create(userData);
}

async function updateUser(userId, updates) {
    return await User.findByIdAndUpdate(
        userId,
        updates,
        {
            new: true,
            runValidators: true,
        }
    );
}

module.exports = {
    findUserByClerkId,
    createUser,
    updateUser,
};