import multer from "multer";
import fs from "fs";

const getMulterMiddleware = (options = {}) => {
    // Create temp directory if it doesn't exist
    const tempDir = "./public/temp";
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true }); // recursive: true -> any missing parent directories are also created
    }

    // use disk storage
    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, tempDir);
        },
        filename: function (req, file, cb) {
            const uniqueSuffix =
                Date.now() + "-" + Math.round(Math.random() * 1e9);
            cb(null, file.fieldname + "-" + uniqueSuffix);
        },
    });

    // only allow certain file types
    const fileFilter = (req, file, cb) => {
        if (!options.allowedTypes) return cb(null, true);

        const allowedTypes = options.allowedTypes;
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(
                new Error("Invalid file type. Only specific types are allowed.")
            );
        }
    };

    // configure multer middleware
    const upload = multer({
        storage,
        fileFilter,
        limits: {
            fileSize: options.fileSizeLimit || 50 * 1024 * 1024, // default 50 MB
        },
    });

    let multerMiddleware;
    if (options.fields) {
        multerMiddleware = upload.fields(options.fields);
    } else if (options.arrayName) {
        multerMiddleware = upload.array(
            options.arrayName,
            options.maxCount || 5
        );
    } else if (options.singleName) {
        multerMiddleware = upload.single(options.singleName);
    } else {
        multerMiddleware = upload.fields([{ name: "media", maxCount: 5 }]);
    }

    // helper function to delete uploaded (saved) files
    const deleteUploadedFiles = (files) => {
        if (files) {
            Object.values(files).forEach((fileArray) => {
                fileArray.forEach((file) => {
                    fs.unlink(file.path, (err) => {
                        if (err)
                            console.error(
                                `Failed to delete file: ${file.path}`
                            );
                    });
                });
            });
        }
    };

    return (req, res, next) => {
        multerMiddleware(req, res, (err) => {
            if (err) {
                if (req.file) {
                    fs.unlink(req.file.path, (unlinkErr) => {
                        if (unlinkErr)
                            console.error(
                                `Failed to delete file: ${req.file.path}`
                            );
                    });
                    return next(err);
                }
                deleteUploadedFiles(req.files);
                return next(err);
            }

            // Destructure files from the request
            const { images, video, document } = req.files || {};

            // Create an array of images, video, document and clear any falsy (undefined or null) values from it.
            const fileFields = [images, video, document].filter(Boolean);

            // If number is greater than one means more than one type of files is present (Ex - images and pdf or videos)
            const numberOfFieldsWithFiles = fileFields.length;

            // Check if multiple fields have files
            if (numberOfFieldsWithFiles > 1) {
                // Delete files and return error
                deleteUploadedFiles(req.files);
                return next(
                    new Error(
                        "Please upload either images, video, or document, not multiple types."
                    )
                );
            }

            // Check file counts
            if (images && images.length > 5) {
                deleteUploadedFiles(req.files);
                return next(new Error("You can upload up to 5 images."));
            }

            if (
                (video && video.length > 1) ||
                (document && document.length > 1)
            ) {
                deleteUploadedFiles(req.files);
                return next(
                    new Error("You can upload only one video or document.")
                );
            }

            next();
        });
    };
};

export default getMulterMiddleware;
