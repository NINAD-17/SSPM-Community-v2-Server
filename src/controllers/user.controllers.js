import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(
            500,
            "Something went wrong while generating tokens."
        );
    }
};

const registerUser = asyncHandler(async (req, res) => {
    const {
        email,
        password,
        firstName,
        lastName,
        role,
        branch,
        graduationYear,
    } = req.body;

    // validation -> not empty
    if (
        [
            email,
            password,
            firstName,
            lastName,
            role,
            branch,
            graduationYear,
        ].some((field) => {
            return field?.trim() === ""; // here, we're checking if the field has some value or not, if it has then remove the whitespaces. After removing whitespaces, if there's no value then false. "    " => ""
        })
    ) {
        throw new ApiError(400, "All fields are required!");
    }

    // check if user already exists
    const existedUser = await User.findOne({ email });

    if (existedUser) {
        throw new ApiError(400, "Email already exists!");
    }

    const user = await User.create({
        email,
        password,
        firstName,
        lastName,
        role,
        branch,
        graduationYear,
    });

    if (!user) {
        throw new ApiError(
            500,
            "Something went wrong while registering the user"
        );
    }

    // generate access and refresh tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        user._id
    );

    const options = {
        httpOnly: true,
        secure: true,
    };

    const createdUser = ({
        email,
        firstName,
        lastName,
        role,
        branch,
        graduationYear,
    } = user);

    return res
        .status(201)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                201,
                { user: createdUser, accessToken, refreshToken },
                "User registered successfully!"
            )
        );
});

const userLogin = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !email.trim()) throw new ApiError(400, "Email is required!");
    if (!password || !password.trim())
        throw new ApiError(400, "Password is required!");

    const user = await User.findOne({ email });

    if (!user) {
        throw new ApiError(404, "User not found!");
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
        throw new ApiError(401, "Invalid credentials!");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        user._id
    );
    const options = {
        httpOnly: true,
        secure: true,
    };

    const updatedUser = ({
        email,
        firstName,
        lastName,
        role,
        branch,
        graduationYear,
    } = user);

    return res
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                { user: updatedUser, accessToken, refreshToken },
                "User logged in successfully!"
            )
        );
});

const updateProfile = asyncHandler(async (req, res) => {
    const updates = req.body;

    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            throw new ApiError(404, "User not found!");
        }

        Object.keys(updates).forEach((key) => {
            user[key] = updates[key];
        });

        await user.save();

        res.status(200).json(
            new ApiResponse(200, {}, "Profile updated successfully!")
        );
    } catch (error) {
        throw new ApiError(
            500,
            "Something went wrong while updating the profile!"
        );
    }
});

const updateAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;

    if(!avatarLocalPath) {
        throw new ApiError(400, "No avatar image uploaded!");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if(!avatar) {
        throw new ApiError(400, "Error while uploading avatar!");
    }

    const user = await findByIdAndUpdate(
        req.user?._id,
        { 
            $set: {
                avatar: avatar.url
            }
         },
        { new: true }
    ).select("-password -refreshToken");

    if(!user) {
        throw new ApiError(404, "User not found!");
    }

    res.status(200).json(
        new ApiResponse(200, { user }, "Avatar updated successfully!")
    );
});

export { registerUser, userLogin, updateProfile, updateAvatar };
