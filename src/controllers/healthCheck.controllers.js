import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const healthcheck = asyncHandler(async (req, res) => {
    res.status(200).json(
        new ApiResponse(
            200,
            { status: "OK" },
            "Hi there! I'm your server, fully operational and ready to rock! 🤘💻"
        )
    );
});

export { healthcheck };
