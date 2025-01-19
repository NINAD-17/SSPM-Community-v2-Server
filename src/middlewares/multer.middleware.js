import multer from "multer";

const getMulterMiddleware = (options) => {
    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, options.destination || "./public/temp");
        },
        filename: function (req, file, cb) {
            const uniqueSuffix =
                Date.now() + "-" + Math.round(Math.random() * 1e9);
            cb(null, file.fieldname + "-" + uniqueSuffix);
        },
    });

    const fileFilter = (req, file, cb) => {
        if(!options.allowedTypes) return cb(null, true); // accept the file (all file types are allowed)

        const allowedTypes = options.allowedTypes;

        if(allowedTypes.includes(file.mimeType)) {
            cb(null, true); // accept the file
        } else {
            cb(
                new Error(
                    "Invalid file type. Only specific types are allowed."
                )
            );
        }
    }

    const upload = multer({
        storage,
        fileFilter,
        limits: {
            fileSize: options.fileSizeLimit || 50 * 1024 * 1024, // default is 50 MB
        }
    })

    if(options.fields) {
        return upload.fields(options.fields);
    } else if (options.arrayName) {
        return upload.array(options.arrayName, options.maxCount || 5);
    } else if(options.singleName) {
        return upload.single(options.singleName);
    } else {
        return upload;
    }
};

export default getMulterMiddleware;