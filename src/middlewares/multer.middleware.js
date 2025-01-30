import multer from "multer";
import fs from "fs";
import path from "path";

const getMulterMiddleware = (options = {}) => {
    // Create temp directory if it doesn't exist
    const tempDir = "./public/temp";
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

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

    return (req, res, next) => {
        multerMiddleware(req, res, (err) => {
            if (err) {
                return next(err);
            }

            const totalFiles = req.files
                ? Object.values(req.files).reduce(
                      (total, field) => total + field.length,
                      0
                  )
                : 0;

            if (totalFiles > (options.maxCount || 5)) {
                return next(new Error("Exceeded maximum number of files."));
            }

            next();
        });
    };
};

export default getMulterMiddleware;
