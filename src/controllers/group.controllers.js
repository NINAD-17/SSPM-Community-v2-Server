import Group from "../models/group.model.js";
import Membership from "../models/groupMembership.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createGroup = asyncHandler(async (req, res) => {
    const { name, description, visibility } = req.body;
    const userId = req.user._id;

    try {
        const group = new Group.create({
            name,
            description,
            visibility,
            createdBy: userId,
        });

        res.status(200).json(
            new ApiResponse(200, group, "Group created successfully!")
        );
    } catch (error) {
        throw new ApiError(500, "Failed to create group!");
    }
});

const uploadAvatarImg = asyncHandler(async (req, res) => {
    const { groupId } = req.params;
    const userId = req.user._id;

    try {
        const group = await Group.findById(groupId);

        if (!group) {
            throw new ApiError(404, "Group not found!");
        }

        let authorizedUser = false;
        if (req.user.isAdmin) {
            authorizedUser = true;
        } else {
            const memberAdmin = await Membership.find({
                groupId,
                userId,
                role: "admin",
            });

            memberAdmin ? (authorizedUser = true) : false;
        }

        if (!authorizedUser) {
            throw new ApiError(403, "Unauthorized to upload avatar image!");
        }

        const avatarLocalPath = req.file?.path;
        if (!avatarLocalPath) {
            throw new ApiError(400, "No avatar image uploaded!");
        }

        const avatar = await uploadOnCloudinary(avatarLocalPath);
        if (!avatar) {
            throw new ApiError(400, "Error while uploading avatar!");
        }

        group.avatarImg = avatar.url;
        await group.save();

        res.status(200).json(
            new ApiResponse(200, group, "Avatar image uploaded successfully!")
        );
    } catch (error) {
        throw new ApiError(500, "Error while uploading group avatar image!");
    }
});

const uploadCoverImg = asyncHandler(async (req, res) => {
    const { groupId } = req.params;
    const userId = req.user._id;

    try {
        const group = await Group.findById(groupId);

        if (!group) {
            throw new ApiError(404, "Group not found!");
        }

        let authorizedUser = false;
        if (req.user.isAdmin) {
            authorizedUser = true;
        } else {
            const memberAdmin = await Membership.find({
                groupId,
                userId,
                role: "admin",
            });

            memberAdmin ? (authorizedUser = true) : false;
        }

        if (!authorizedUser) {
            throw new ApiError(403, "Unauthorized to upload cover image!");
        }

        const coverImgLocalPath = req.file?.path;
        if (!coverImgLocalPath) {
            throw new ApiError(400, "No cover image uploaded!");
        }

        const coverImg = await uploadOnCloudinary(coverImgLocalPath);
        if (!coverImg) {
            throw new ApiError(400, "Error while uploading Cover Image!");
        }

        group.coverImg = coverImg.url;
        await group.save();

        res.status(200).json(
            new ApiResponse(200, group, "Cover image uploaded successfully!")
        );
    } catch (error) {
        throw new ApiError(500, "Error while uploading group cover image!");
    }
});

const updateGroupDetails = asyncHandler(async (req, res) => {
    const { groupId } = req.params;
    const updates = req.body;
    const userId = req.user._id;

    try {
        const group = await Group.findById(groupId);
        if (!group) {
            throw new ApiError(404, "Group not found!");
        }

        // Check if user is authorized
        let authorizedUser =
            req.user.isAdmin ||
            (await Membership.exists({ groupId, userId, role: "admin" }));

        if (!authorizedUser) {
            throw new ApiError(403, "Unauthorized to update group details!");
        }

        // Filter out undefined values from updates
        Object.keys(updates).forEach((key) => {
            if (updates[key] !== undefined) {
                group[key] = updates[key];
            }
        });
        await group.save();

        res.status(200).json(
            new ApiResponse(200, group, "Group details updated successfully!")
        );
    } catch (error) {
        throw new ApiError(500, "Failed to update group details!");
    }
});

const joinGroup = asyncHandler(async (req, res) => {
    const { groupId } = req.params;
    const userId = req.user._id;

    try {
        const group = await Group.findById(groupId);
        if (!group) {
            throw new ApiError(404, "Group not found!");
        }

        if (group.visibility === "public") {
            const membership = await Membership.create({
                userId,
                groupId,
                status: "approved",
            });

            res.status(200).json(
                new ApiResponse(200, membership, "Group joined successfully!")
            );
        } else {
            // private group
            const existingRequest = await Membership.findOne({
                groupId,
                userId,
            });

            if (existingRequest) {
                if (existingRequest.status === "approved") {
                    throw new ApiError(
                        400,
                        "You're already a group member! No need to request for joining."
                    );
                } else if (existingRequest.status === "pending") {
                    throw new ApiError(
                        400,
                        "You have already requested to join this group!"
                    );
                }
            } else {
                const membership = await Membership.create({
                    userId,
                    groupId,
                    status: "pending",
                });
                res.status(200).json(
                    new ApiResponse(
                        200,
                        membership,
                        "Join Group request sent successfully!"
                    )
                );
            }
        }
    } catch (error) {
        throw new ApiError(500, "Failed to join group!");
    }
});

const leaveGroup = asyncHandler(async (req, res) => {
    const { groupId } = req.params;
    const userId = req.user._id;

    try {
        const group = await Group.findById(groupId);
        if (!group) {
            throw new ApiError(404, "Group not found!");
        }

        const membership = await Membership.findOneAndDelete({
            userId,
            groupId,
        });

        res.status(200).json(
            new ApiResponse(200, membership, "Group left successfully!")
        );
    } catch (error) {
        throw new ApiError(500, "Failed to leave group!");
    }
});

const approveMembership = asyncHandler(async (req, res) => {
    const { groupId, userId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) {
        throw new ApiError(404, "Group not found");
    }

    const membership = await Membership.findOne({
        groupId,
        userId,
        status: "pending",
    });
    if (!membership) {
        throw new ApiError(404, "Pending membership not found");
    }

    if (
        !(await Membership.exists({
            groupId,
            userId: req.user._id,
            role: "admin",
        })) &&
        !req.user.isAdmin
    ) {
        throw new ApiError(403, "Unauthorized to approve members");
    }

    membership.status = "approved";
    await membership.save();

    res.status(200).json(
        new ApiResponse(200, membership, "Membership approved successfully!")
    );
});

const rejectMembership = asyncHandler(async (req, res) => {
    const { groupId, userId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) {
        throw new ApiError(404, "Group not found");
    }

    const membership = await Membership.findOne({
        groupId,
        userId,
        status: "pending",
    });
    if (!membership) {
        throw new ApiError(404, "Pending membership not found");
    }

    if (
        !(await Membership.exists({
            groupId,
            userId: req.user._id,
            role: "admin",
        })) &&
        !req.user.isAdmin
    ) {
        throw new ApiError(403, "Unauthorized to approve members");
    }

    await membership.remove();

    res.status(200).json(
        new ApiResponse(
            200,
            membership,
            "Membership request rejected successfully!"
        )
    );
});

const makeAdmin = asyncHandler(async (req, res) => {
    const { groupId, memberId } = req.params;
    const userId = req.user._id;

    try {
        const group = await Group.findById(groupId);
        if (!group) {
            throw new ApiError(404, "Group not found");
        }

        const member = await Membership.find({ userId: memberId, groupId });
        if (!member) {
            throw new ApiError(404, "Member not found");
        }

        const isAuthorized =
            req.user.isAdmin ||
            (await Membership.findOne({ userId, groupId, role: "admin" }));
        if (!isAuthorized) {
            throw new ApiError(403, "Unauthorized to make new admin");
        }

        member.role = "admin";
        await member.save();

        res.status(200).json(
            new ApiResponse(200, member, "Member made admin successfully!")
        );
    } catch (error) {
        throw new ApiError(500, "Failed to make new admin!");
    }
});

const removeAdmin = asyncHandler(async (req, res) => {
    const { groupId, adminId } = req.params;
    const userId = req.user._id;

    try {
        const group = await Group.findById(groupId);
        if (!group) {
            throw new ApiError(404, "Group not found");
        }

        const admin = await Membership.findOne({
            userId: adminId,
            groupId,
            role: "admin",
        });
        if (!admin) {
            throw new ApiError(404, "Admin not found");
        }

        const isAuthorized =
            req.user.isAdmin ||
            (await Membership.findOne({ userId, groupId, role: "admin" }));
        if (!isAuthorized) {
            throw new ApiError(403, "Unauthorized to make new admin");
        }

        admin.role = "member";
        await admin.save();

        res.status(200).json(
            new ApiResponse(200, admin, "Admin removed successfully!")
        );
    } catch (error) {
        throw new ApiError(500, "Failed to remove admin!");
    }
});

const getGroup = asyncHandler(async (req, res) => {
    const { groupId } = req.params;

    const group = await Group.findById(groupId);
    const groupMembers = await Membership.countDocuments({ groupId });

    if (!group) {
        throw new ApiError(404, "Group not found!");
    }

    res.status(200).json(
        new ApiResponse(
            200,
            { group, groupMembers },
            "Group retrieved successfully!"
        )
    );
});

const getGroupMembers = asyncHandler(async (req, res) => {
    const { groupId } = req.params;

    try {
        const group = await Group.findById(groupId);
        if (!group) {
            throw new ApiError(404, "Group not found!");
        }

        const groupMembers = await Membership.aggregate([
            {
                $match: {
                    groupId: mongoose.Types.ObjectId(groupId),
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "user",
                    pipeline: [
                        {
                            $project: {
                                _id,
                                firstName,
                                lastName,
                                avatar,
                            },
                        },
                    ],
                },
            },
            {
                $addFields: {
                    user: {
                        $arrayElemAt: ["$user", 0],
                    },
                },
            },
        ]);

        res.status(200).json(
            new ApiResponse(
                200,
                groupMembers,
                "Group members retrieved successfully!"
            )
        );
    } catch (error) {
        throw new ApiError(500, "Failed to get group members!");
    }
});

const getGroupAdmins = asyncHandler(async (req, res) => {
    const { groupId } = req.params;

    try {
        const group = await Group.findById(groupId);
        if (!group) {
            throw new ApiError(404, "Group not found!");
        }

        const groupAdmins = await Membership.aggregate([
            {
                $match: {
                    groupId: mongoose.Types.ObjectId(groupId),
                    role: "admin",
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "user",
                    pipeline: [
                        {
                            $project: {
                                _id,
                                firstName,
                                lastName,
                                avatar,
                            },
                        },
                    ],
                },
            },
            {
                $addFields: {
                    user: {
                        $arrayElemAt: ["$user", 0],
                    },
                },
            },
        ]);

        res.status(200).json(
            new ApiResponse(
                200,
                groupAdmins,
                "Group admins retrieved successfully!"
            )
        );
    } catch (error) {
        throw new ApiError(500, "Failed to get group admins!");
    }
});

const getAllGroups = asyncHandler(async (req, res) => {
    try {
        const groups = await Group.find();

        if (groups.length === 0) {
            res.status(200).json(new ApiResponse(200, [], "No groups found!"));
        }

        res.status(200).json(
            new ApiResponse(200, groups, "All groups retrieved successfully!")
        );
    } catch (error) {
        throw new ApiError(500, "Failed to get all groups!");
    }
});

export {
    createGroup,
    uploadAvatarImg,
    uploadCoverImg,
    updateGroupDetails,
    joinGroup,
    leaveGroup,
    approveMembership,
    rejectMembership,
    makeAdmin,
    removeAdmin,
    getGroup,
    getGroupMembers,
    getGroupAdmins,
    getAllGroups,
};
