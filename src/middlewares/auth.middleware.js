import jwt from "jsonwebtoken";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, _, next) => {
    try {
        const token =
            req.cookies?.accessToken ||
            req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            throw new ApiError(401, "Unauthorized Request!");
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        // check for access token expiration
        if (decodedToken.exp * 1000 < Date.now()) {
            return res
                .status(401)
                .json(
                    new ApiResponse(
                        401,
                        { expired: true },
                        "Access Token Expired!"
                    )
                );
        }

        const user = await User.findById(decodedToken?._id).select(
            "-password -refreshToken"
        );

        if (!user) {
            throw new ApiError(401, "Invalid Access Token");
        }

        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token");
    }
});

export const isAdmin = asyncHandler(async(req, _, next) => {
    if(!req.user) {
        throw new ApiError(401, "Access Denied!");
    }

    try {
        // const user = await User.findById(req.user._id);
        const user = req.user; // As the req.user already contain isAdmin we're not calling db again to fetch user.

        if(!user || !user.isAdmin) {
            throw new ApiError(403, "Access Denied! Admin Only!");
        }

        next();
    } catch(error) {
        throw new ApiError(401, "Unauthorized Request!");
    }
})