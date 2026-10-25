const { createClerkClient } = require("@clerk/backend");

const clerkClient = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
});
const {
    findUserByClerkId,
    createUser,
    updateUser,
} = require("../services/userService");

const syncUser = async (req, res) => {
    try {
        const { userId } = req.auth();

        if (!userId) {
            return res.status(401).json({
                message: "Unauthorized",
            });
        }

        const clerkUser = await clerkClient.users.getUser(userId);

        const email =
            clerkUser.emailAddresses.find(
                (email) =>
                    email.id === clerkUser.primaryEmailAddressId
            )?.emailAddress || "";

        let user = await findUserByClerkId(userId);

        const userData = {
            clerkId: userId,
            email,
            firstName: clerkUser.firstName || "",
            lastName: clerkUser.lastName || "",
            imageUrl: clerkUser.imageUrl || "",
        };

        if (!user) {
            user = await createUser(userData);
        } else {
            user = await updateUser(user._id, userData);
        }

        return res.status(200).json(user);
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Failed to sync user",
        });
    }
};

module.exports = {
    syncUser,
};