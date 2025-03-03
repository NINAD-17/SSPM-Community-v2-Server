import Group from "../models/group.model.js";
import Membership from "../models/groupMembership.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import mongoose from "mongoose";
import {
    deleteFromCloudinary,
    uploadOnCloudinary,
} from "../utils/cloudinary.js";

const createGroup = asyncHandler(async (req, res, next) => {
    const {
        name,
        description,
        skills,
        visibility,
        avatarImg,
        coverImg,
        admins = [],
        members = [],
    } = req.body;
    const userId = req.user._id;

    try {
        const group = await Group.create({
            name,
            description,
            skills,
            visibility,
            avatarImg,
            coverImg,
            createdBy: userId,
        });

        // Create memberships array to add all members and admins and then store those documents in Membership in bulk
        // Add logged in user as admin
        const memberships = [
            {
                groupId: group._id,
                userId,
                role: "admin",
                status: "approved",
            },
        ];

        // Add selected admins and members
        admins.forEach((adminId) => {
            memberships.push({
                groupId: group._id,
                userId: adminId,
                role: "admin",
                status: "approved",
            });
        });

        members.forEach((memberId) => {
            memberships.push({
                groupId: group._id,
                userId: memberId,
                role: "member",
                status: "approved",
            });
        });

        // Insert all memberships
        let newMemberships = await Membership.insertMany(memberships);

        res.status(200).json(
            new ApiResponse(
                200,
                { group, newMemberships },
                "Group created successfully!"
            )
        );
    } catch (error) {
        console.log(error);
        if (error instanceof ApiError) {
            next(error);
        } else {
            next(new ApiError(500, "Failed to create group!"));
        }
    }
});

const uploadAvatarImg = asyncHandler(async (req, res, next) => {
    const { groupId } = req.params;
    const userId = req.user._id;

    try {
        const group = await Group.findById(groupId);

        if (!group) {
            throw new ApiError(404, "Group not found!");
        }

        const authorizedUser =
            req.user.isAdmin ||
            (await Membership.exists({ groupId, userId, role: "admin" }));

        if (!authorizedUser) {
            throw new ApiError(403, "Unauthorized to upload avatar image!");
        }

        const avatarLocalPath = req.file?.path;
        if (!avatarLocalPath) {
            throw new ApiError(400, "No avatar image uploaded!");
        }

        const oldGroupAvatar = group.avatarImg;
        const avatar = await uploadOnCloudinary(avatarLocalPath);
        if (!avatar) {
            throw new ApiError(400, "Error while uploading avatar!");
        }

        group.avatarImg = avatar.url;
        await group.save();

        if (oldGroupAvatar) {
            const publicId = oldGroupAvatar
                .split("/")
                .slice(-2)
                .join("/")
                .split(".")[0];

            await deleteFromCloudinary(publicId, oldGroupAvatar);
            console.log("Old group avatar deleted successfully (if any)");
        }

        res.status(200).json(
            new ApiResponse(
                200,
                { group },
                "Avatar image uploaded successfully!"
            )
        );
    } catch (error) {
        console.error("Error in uploadAvatarImg:", error);
        if (error instanceof ApiError) {
            next(error);
        } else {
            next(
                new ApiError(500, "Error while uploading group avatar image!")
            );
        }
    }
});

const uploadCoverImg = asyncHandler(async (req, res, next) => {
    const { groupId } = req.params;
    const userId = req.user._id;

    try {
        const group = await Group.findById(groupId);

        if (!group) {
            throw new ApiError(404, "Group not found!");
        }

        const authorizedUser =
            req.user.isAdmin ||
            (await Membership.exists({ groupId, userId, role: "admin" }));

        if (!authorizedUser) {
            throw new ApiError(403, "Unauthorized to upload cover image!");
        }

        const oldGroupCoverImg = group.coverImg;
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

        if (oldGroupCoverImg) {
            const publicId = oldGroupCoverImg
                .split("/")
                .slice(-2)
                .join("/")
                .split(".")[0];

            await deleteFromCloudinary(publicId, oldGroupCoverImg);
            console.log("Old group cover image deleted successfully (if any)");
        }

        res.status(200).json(
            new ApiResponse(
                200,
                { group },
                "Cover image uploaded successfully!"
            )
        );
    } catch (error) {
        if (error instanceof ApiError) {
            next(error);
        } else {
            next(new ApiError(500, "Error while uploading group cover image!"));
        }
    }
});

const updateGroupDetails = asyncHandler(async (req, res, next) => {
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

        // prepare update operations
        const updateOperations = { $set: {}, $addToSet: {} }; // $addToSet: Adds elements to the array only if they do not already exist

        // handle non-array fields
        const nonArrayFields = [
            "name",
            "description",
            "visibility",
            "avatarImg",
            "coverImg",
        ];
        nonArrayFields.forEach((field) => {
            if (updates[field] !== undefined) {
                updateOperations.$set[field] = updates[field];
            }
        });

        // handle array fields
        if (updates.skills) {
            updateOperations.$addToSet.skills = {
                $each: updates.skills,
            };
        }

        // Remove empty $addToSet if there are no updates to arrays
        if (Object.keys(updateOperations.$addToSet).length === 0) {
            delete updateOperations.$addToSet;
        }

        await Group.updateOne({ _id: groupId }, updateOperations);

        // Handle membership updates
        const memberships = [];

        if (updates.admins) {
            updates.admins.forEach((adminId) => {
                memberships.push({
                    groupId,
                    userId: adminId,
                    role: "admin",
                    status: "approved",
                });
            });
        }

        if (updates.members) {
            updates.members.forEach((memberId) => {
                memberships.push({
                    groupId,
                    userId: memberId,
                    role: "member",
                    status: "approved",
                });
            });
        }

        let newMemberships;
        if (memberships.length > 0) {
            newMemberships = await Membership.insertMany(memberships);
        }

        // fetch updated group
        const updatedGroup = await Group.findById(groupId);

        res.status(200).json(
            new ApiResponse(
                200,
                { updatedGroup, newMemberships },
                "Group details updated successfully!"
            )
        );
    } catch (error) {
        console.log(error);
        if (error instanceof ApiError) {
            next(error);
        } else {
            next(new ApiError(500, "Failed to update group details!"));
        }
    }
});

const joinGroup = asyncHandler(async (req, res, next) => {
    const { groupId } = req.params;
    const userId = req.user._id;

    try {
        const group = await Group.findById(groupId);
        if (!group) {
            throw new ApiError(404, "Group not found!");
        }

        const existingMembership = await Membership.findOne({
            userId,
            groupId,
        });

        if (existingMembership) {
            if (existingMembership.status === "pending") {
                throw new ApiError(
                    400,
                    "You have already requested to join this group!"
                );
            } else {
                throw new ApiError(
                    400,
                    "You're already a group member! No need to join again."
                );
            }
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
    } catch (error) {
        if (error instanceof ApiError) {
            next(error);
        } else {
            next(new ApiError(500, "Failed to join group!"));
        }
    }
});

const leaveGroup = asyncHandler(async (req, res, next) => {
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

        if (!membership) {
            throw new ApiError(404, "You're not a member of this group!");
        }

        res.status(200).json(
            new ApiResponse(200, membership, "Group left successfully!")
        );
    } catch (error) {
        if (error instanceof ApiError) {
            next(error);
        } else {
            next(new ApiError(500, "Failed to leave group!"));
        }
    }
});

const approveMembership = asyncHandler(async (req, res, next) => {
    const { groupId, userId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) {
        throw new ApiError(404, "Group not found");
    }

    try {
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
            new ApiResponse(
                200,
                membership,
                "Membership approved successfully!"
            )
        );
    } catch (error) {
        if (error instanceof ApiError) {
            next(error);
        } else {
            next(new ApiError(500, "Failed to approve membership!"));
        }
    }
});

const rejectMembership = asyncHandler(async (req, res, next) => {
    const { groupId, userId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) {
        throw new ApiError(404, "Group not found");
    }

    try {
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
    } catch (error) {
        if (error instanceof ApiError) {
            next(error);
        } else {
            next(new ApiError(500, "Failed to reject membership"));
        }
    }
});

const makeAdmin = asyncHandler(async (req, res, next) => {
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
        if (error instanceof ApiError) {
            next(error);
        } else {
            next(new ApiError(500, "Failed to make new admin!"));
        }
    }
});

const removeAdmin = asyncHandler(async (req, res, next) => {
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
        if (error instanceof ApiError) {
            next(error);
        } else {
            next(new ApiError(500, "Failed to remove admin!"));
        }
    }
});

const getGroup = asyncHandler(async (req, res) => {
    const { groupId } = req.params;
    const userId = req.user._id;

    const groupInfo = await Group.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(groupId)
            }
        }, 
        {
            $lookup: {
                from: "memberships",
                localField: "_id",
                foreignField: "groupId",
                as: "members",
                pipeline: [
                    {
                        $match: {
                            status: "approved"
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            count: { $sum: 1 }
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                totalMembers: { $arrayElemAt: ["$members.count", 0] }
            }
        }, 
        {
            $lookup: {
                from: "memberships",
                let: { groupId: "$_id", userId: new mongoose.Types.ObjectId(userId) },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ["$groupId", "$$groupId"] },
                                    { $eq: ["$userId", "$$userId"] },
                                    { $eq: ["$status", "approved"]}
                                ]
                            }
                        }
                    }
                ],
                as: "userMembership"
            }
        },
        {
            $addFields: {
                isMember: { $gt: [{$size: "$userMembership"}, 0]}
            }
        },
        {
            $project: {
                members: 0,
                userMembership: 0
            }
        }
    ]);

    if(groupInfo.length === 0) {
        throw new ApiError(404, "Group not found!")
    }

    res.status(200).json(
        new ApiResponse(
            200,
            { group: groupInfo[0] },
            "Group retrieved successfully!"
        )
    );
});

const getGroupMembers = asyncHandler(async (req, res, next) => {
    const { groupId } = req.params;
    const {
        lastMemberId,
        fetchCount = 0,
        limit = 10,
        sortBy = "createdAt",
        sortType = "desc",
    } = req.query;

    const limitInt = parseInt(limit, 10);
    let fetchCountInt = parseInt(fetchCount, 10);

    const matchStage = {
        groupId: new mongoose.Types.ObjectId(groupId),
        status: "approved",
    };

    if (lastMemberId) {
        matchStage._id = {
            [sortType === "desc" ? "$lt" : "$gt"]: new mongoose.Types.ObjectId(
                lastMemberId
            ),
        };
    }

    try {
        const group = await Group.findById(groupId);
        if (!group) {
            throw new ApiError(404, "Group not found!");
        }

        const groupMembers = await Membership.aggregate([
            {
                $match: matchStage,
            },
            {
                $sort: {
                    [sortBy]: sortType === "desc" ? -1 : 1,
                },
            },
            {
                $limit: limitInt,
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
                                _id: 1,
                                firstName: 1,
                                lastName: 1,
                                avatar: 1,
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
            {
                $project: {
                    _id: 1,
                    userId: 1,
                    role: 1,
                    status: 1,
                    createdAt: 1,
                    firstName: "$user.firstName",
                    lastName: "$user.lastName",
                    avatar: "$user.avatar",
                },
            },
        ]);

        const totalGroupMembers = await Membership.countDocuments({
            groupId: new mongoose.Types.ObjectId(groupId),
        });
        const totalFetchedMembers = lastMemberId
            ? groupMembers.length + fetchCountInt * limitInt
            : groupMembers.length;
        const allMembersFetched = totalFetchedMembers >= totalGroupMembers;

        res.status(200).json(
            new ApiResponse(
                200,
                {
                    members: groupMembers,
                    totalMembers: totalGroupMembers,
                    totalFetchedMembers,
                    allMembersFetched,
                    lastMemberId: groupMembers[groupMembers.length - 1]._id,
                    fetchCount: fetchCountInt
                },
                "Group members retrieved successfully!"
            )
        );
    } catch (error) {
        console.log(error);
        if (error instanceof ApiError) {
            next(error);
        } else {
            next(new ApiError(500, "Failed to get group members!"));
        }
    }
});

const getGroupAdmins = asyncHandler(async (req, res, next) => {
    const { groupId } = req.params;
    const {
        lastAdminId,
        fetchCount = 0,
        limit = 10,
        sortBy = "createdAt",
        sortType = "desc",
    } = req.query;

    const limitInt = parseInt(limit, 10);
    let fetchCountInt = parseInt(fetchCount, 10);

    const matchStage = {
        groupId: new mongoose.Types.ObjectId(groupId),
        status: "approved",
        role: "admin"
    };

    if (lastAdminId) {
        matchStage._id = {
            [sortType === "desc" ? "$lt" : "$gt"]: new mongoose.Types.ObjectId(
                lastAdminId
            ),
        };
    }

    try {
        const group = await Group.findById(groupId);
        if (!group) {
            throw new ApiError(404, "Group not found!");
        }

        const groupAdmins = await Membership.aggregate([
            {
                $match: matchStage
            },
            {
                $sort: {
                    [sortBy]: sortType === "desc" ? -1 : 1,
                },
            },
            {
                $limit: limitInt,
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
                                _id: 1,
                                firstName: 1,
                                lastName: 1,
                                avatar: 1,
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
            {
                $project: {
                    _id: 1,
                    userId: 1,
                    role: 1,
                    status: 1,
                    createdAt: 1,
                    firstName: "$user.firstName",
                    lastName: "$user.lastName",
                    avatar: "$user.avatar",
                },
            },
        ]);

        const totalGroupAdmins = await Membership.countDocuments({
            groupId: new mongoose.Types.ObjectId(groupId),
            role: "admin"
        });
        const totalFetchedAdmins = lastAdminId
            ? groupAdmins.length + fetchCountInt * limitInt
            : groupAdmins.length;
        const allAdminsFetched = totalFetchedAdmins >= totalGroupAdmins;

        res.status(200).json(
            new ApiResponse(
                200,
                { admins: groupAdmins, 
                    totalAdmins: totalGroupAdmins,
                    totalFetchedAdmins,
                    allAdminsFetched,
                    lastAdminId: groupAdmins[groupAdmins.length - 1]._id,
                    fetchCount: fetchCountInt
                 },
                "Group admins retrieved successfully!"
            )
        );
    } catch (error) {
        console.log(error)
        if (error instanceof ApiError) {
            next(error);
        } else {
            next(new ApiError(500, "Failed to get group admins!"));
        }
    }
});

const getAllGroups = asyncHandler(async (req, res, next) => {
    try {
        const allGroups = await Group.find();

        if (allGroups.length === 0) {
            res.status(200).json(new ApiResponse(200, [], "No groups found!"));
        }

        res.status(200).json(
            new ApiResponse(
                200,
                { allGroups, totalGroups: allGroups.length },
                "All groups retrieved successfully!"
            )
        );
    } catch (error) {
        if (error instanceof ApiError) {
            next(error);
        } else {
            next(new ApiError(500, "Failed to get all groups!"));
        }
    }
});

const getAllUserJoinedGroups = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;

    try {
        const result = await Membership.aggregate([
            {
                $match: {
                    userId: new mongoose.Types.ObjectId(userId),
                    status: "approved",
                },
            },
            {
                $lookup: {
                    from: "groups",
                    localField: "groupId",
                    foreignField: "_id",
                    as: "group",
                    pipeline: [
                        {
                            $project: {
                                _id: 1,
                                name: 1,
                                description: 1,
                                avatarImg: 1,
                                visibility: 1,
                            },
                        },
                    ],
                },
            },
            {
                $addFields: {
                    group: {
                        $arrayElemAt: ["$group", 0],
                    },
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "userDetails",
                    pipeline: [
                        {
                            $project: {
                                _id: 1,
                                firstName: 1,
                                lastName: 1,
                                email: 1,
                                avatar: 1,
                            },
                        },
                    ],
                },
            },
            {
                $unwind: "$userDetails",
            },
            {
                $group: {
                    _id: "$userId",
                    userDetails: { $first: "$userDetails" },
                    groups: { $push: "$group" },
                    totalJoinedGroups: { $sum: 1 },
                },
            },
        ]);

        if (result.length === 0) {
            res.status(200).json(
                new ApiResponse(200, [], "No user joined groups found!")
            );
        } else {
            const data = result[0];
            res.status(200).json(
                new ApiResponse(
                    200,
                    {
                        userDetails: data.userDetails,
                        groups: data.groups,
                        totalJoinedGroups: data.totalJoinedGroups,
                    },
                    "All user joined groups retrieved successfully!"
                )
            );
        }
    } catch (error) {
        console.log(error);
        if (error instanceof ApiError) {
            next(error);
        } else {
            next(new ApiError(500, "Failed to get all user joined groups!"));
        }
    }
});

const getRecommendedGroups = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;

        // Get user's joined groups
        const userGroups = await Group.find({ members: userId }).select("_id");
        const userGroupIds = userGroups.map((g) => g._id);

        // Get user's skills and interests
        const user = await User.findById(userId).select("skills interests");

        // Find groups user hasn't joined yet
        const recommendedGroups = await Group.aggregate([
            {
                $match: {
                    _id: { $nin: userGroupIds },
                    $or: [
                        { skills: { $in: user.skills || [] } },
                        { category: { $in: user.interests || [] } },
                    ],
                },
            },
            {
                $addFields: {
                    // Add default empty array if members doesn't exist
                    members: { $ifNull: ["$members", []] },
                    membersCount: {
                        $size: {
                            $ifNull: ["$members", []],
                        },
                    },
                },
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    avatarImg: 1,
                    category: 1,
                    membersCount: 1,
                },
            },
            {
                $sort: { membersCount: -1 },
            },
            {
                $limit: 5,
            },
        ]);

        // If not enough recommendations, add popular groups
        if (recommendedGroups.length < 5) {
            const remainingCount = 5 - recommendedGroups.length;
            const popularGroups = await Group.aggregate([
                {
                    $match: {
                        _id: {
                            $nin: [
                                ...userGroupIds,
                                ...recommendedGroups.map((g) => g._id),
                            ],
                        },
                    },
                },
                {
                    $addFields: {
                        // Add default empty array if members doesn't exist
                        members: { $ifNull: ["$members", []] },
                        membersCount: {
                            $size: {
                                $ifNull: ["$members", []],
                            },
                        },
                    },
                },
                {
                    $project: {
                        _id: 1,
                        name: 1,
                        avatarImg: 1,
                        category: 1,
                        membersCount: 1,
                    },
                },
                {
                    $sort: { membersCount: -1 },
                },
                {
                    $limit: remainingCount,
                },
            ]);

            recommendedGroups.push(...popularGroups);
        }

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    { recommendations: recommendedGroups },
                    "Group recommendations fetched successfully"
                )
            );
    } catch (error) {
        console.error("Error in getRecommendedGroups:", error);
        throw new ApiError(500, "Failed to get group recommendations");
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
    getAllUserJoinedGroups,
    getRecommendedGroups,
};
