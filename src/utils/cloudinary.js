import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from 'dotenv';

// Force reload environment variables
dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath, folder = '') => {
    try {
        if (!localFilePath) return null;

        // Get file extension and determine resource type
        const fileExtension = localFilePath.split('.').pop().toLowerCase();
        const resourceType = getResourceType(fileExtension);

        const uploadOptions = {
            resource_type: resourceType,
            ...(folder && { folder }),
            use_filename: true,
            unique_filename: true
        };

        const response = await cloudinary.uploader.upload(localFilePath, uploadOptions);

        // Clean up temp file
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }

        return response;
    } catch (error) {
        console.error("Cloudinary upload error:", error);
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
        return null;
    }
};

const deleteFromCloudinary = async (publicId, url) => {
    try {
        const resourceType = getResourceType(url.split(".").pop().toLowerCase());
        const response = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType
        });

        return response;
    } catch (error) {
        console.error("Cloudinary deletion error:", error);
        return null;
    }
};

// Helper function to determine resource type
const getResourceType = (fileExtension) => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    const videoExtensions = ['mp4', 'mov', 'avi', 'webm'];

    if (imageExtensions.includes(fileExtension)) return 'image';
    if (videoExtensions.includes(fileExtension)) return 'video';
    return 'auto'; // Changed from 'raw' to 'auto' for better handling
};

export { uploadOnCloudinary, deleteFromCloudinary };
