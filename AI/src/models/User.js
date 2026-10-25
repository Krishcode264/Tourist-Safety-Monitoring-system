const mongoose = require( "mongoose" )

const userSchema = new mongoose.Schema( {
    clerkId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
    },
    firstName: {
        type: String,
        default: "",
        trim: true,
    },
    lastName: {
        type: String,
        default: "",
        trim: true,
    },
    imageUrl: {
        type: String,
        default: "",
    },
}, {
    timestamps: true,
} )

module.exports = mongoose.model("User", userSchema);
