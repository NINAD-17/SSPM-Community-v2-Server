import { ApiError } from "../utils/apiError.js";
import { decodeAndVerifyToken } from "../middlewares/auth.middleware.js";
import cookieParser from "cookie-parser";

export const handleSocketAuth = async (socket, next) => {
    try {
        // Get token from handshake auth or cookies
        let token;
        
        // Parse cookies if available
        cookieParser()(socket.request, socket.request.res, (err) => {
            if(err) return next(err);
            
            // Try to get token from cookies first, then from auth object
            token = socket.request.cookies?.accessToken || socket.handshake.auth?.token;
        });
        
        if(!token) {
            return next(new Error("Authentication failed: No token provided"));
        }

        // Verify token and get user
        const user = await decodeAndVerifyToken(token);
        
        // Attach user data to socket
        socket.user = user;
        next();
    } catch (error) {
        next(new Error("Authentication failed: " + error.message));
    }
};



