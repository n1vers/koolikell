import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "sounds/");
    },

    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname);

        const fileName =
            `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;

        cb(null, fileName);
    },
});

const fileFilter = (
    req: Express.Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
) => {
    const extension = path.extname(file.originalname).toLowerCase();

    if (extension === ".mp3") {
        cb(null, true);
    } else {
        cb(new Error("Only MP3 files are allowed"));
    }
};

export const uploadSound = multer({
    storage,
    fileFilter,
});