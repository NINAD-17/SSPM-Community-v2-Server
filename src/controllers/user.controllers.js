import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import xss from "xss";

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

const registerUser = asyncHandler(async(req, res) => {
    const { email, password, firstName, lastName, role, branch, graduationYear } = req.body;

    const sanitizedEmail = xss(email);
    const sanitizedFirstName = xss(firstName);
    const sanitizedLastName = xss(lastName);
    const sanitizedRole = xss(role);
    const sanitizedBranch = xss(branch);
    const sanitizedGraduationYear = xss(graduationYear);

    // validation -> not empty
    if (
        [email, password, firstName, lastName, role, branch, graduationYear].some((field) => {
            return field?.trim() === ""; // here, we're checking if the field has some value or not, if it has then remove the whitespaces. After removing whitespaces, if there's no value then false. "    " => ""
        })
    ) {
        throw new ApiError(400, "All fields are required!");
    }

    // check if user already exists
    const existedUser = await User.findOne(email);

    if(existedUser) {
        throw new ApiError(400, "Email already exists!");
    }

    const user = await User.create({
        email: sanitizedEmail,
        password,
        firstName: sanitizedFirstName,
        lastName: sanitizedLastName,
        role: sanitizedRole,
        branch: sanitizedBranch,
        graduationYear: sanitizedGraduationYear,
    });

    if (!user) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    // generate access and refresh tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    const options = {
        httpOnly: true, 
        secure: true
    }

    const createdUser = { email, firstName, lastName, role, branch, graduationYear} = user;

    return res.status(201)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(201, { user: createdUser, accessToken, refreshToken }, "User registered successfully!")
        )
});

export { registerUser };