import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        password: {
            type: String,
            required: true,
        },
        firstName: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        lastName: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        avatar: {
            type: String,
        }, // URL or path to avatar image
        headline: {
            type: String,
            trim: true,
        },
        about: {
            type: String,
            trim: true,
        },
        socialHandles: {
            type: Object,
            of: String,
        },
        role: {
            type: String,
            enum: ["student", "faculty"],
            required: true,
            default: "student",
        },
        isAlumni: {
            type: Boolean,
            default: false,
        },
        isAdmin: {
            type: Boolean,
            default: false,
        },
        enrollmentYear: {
            type: Number,
        },
        // expectedGraduationYear: {
        //     type: Number,
        // },
        graduationYear: {
            type: Number,
            required: true,
        },
        branch: {
            type: String,
            required: true,
            trim: true,
        },
        currentlyWorkingAt: {
            type: String,
        },
        skills: {
            type: [String],
        },
        refreshToken: {
            type: String,
        },
        lastActive: {
            type: Date,
            default: Date.now
        },
        // Track email notifications to avoid spamming users
        lastNotificationSent: {
            type: Date,
            default: null
        },
    },
    { timestamps: true }
);

userSchema.pre("save", async function (next) {
    // Update isAlumni status based on graduation year
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // getMonth() returns 0-11

    // Determine the threshold year for alumni status
    const yearThreshold = currentMonth >= 5 ? currentYear : currentYear - 1;

    if (this.graduationYear <= yearThreshold) {
        this.isAlumni = true;
    }

    // Hash the password before saving the user model
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

userSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password); // It'll return true or false
};

userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            firstName: this.firstName,
            lastName: this.lastName,
            role: this.role,
            isAlumni: this.isAlumni,
            isAdmin: this.isAdmin,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
        }
    );
};

userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
        }
    );
};

export const User = mongoose.model("User", userSchema);
