import { required } from "joi";
import mongoose, { Schema } from "mongoose";

const opportunitySchema = new Schema(
    {
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        category: {
            type: String,
            enum: [
                "Job",
                "Internship",
                "Competition",
                "Program",
                "Event",
                "Workshop",
            ],
            required: true,
        },
        date: {
            type: Date,
            required: false,
        },
        location: {
            type: String,
            required: false,
        },
        applicationLink: {
            type: String,
            required: false,
        },
        contactInfo: {
            type: String,
            required: false,
        },
        tags: {
            type: [String],
            required: false,
            validate: [arrayLimit, "{PATH} exceeds the limit of 5"],
        },
        postedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        status: {
            type: String,
            enum: ["Active", "Under Review", "Deleted"],
            default: "Active",
        },
        deletedReason: {
            type: String,
            required: false,
        },
    },
    { timestamps: true }
);

function arrayLimit(val) {
    return val.length <= 5;
}

const Opportunity = mongoose.model("Opportunity", opportunitySchema);
export default Opportunity;
