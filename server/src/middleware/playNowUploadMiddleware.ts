import multer from "multer";
import path from "path";
import fs from "fs";

const playNowDirectory = path.join(
    process.cwd(),
    "playnow"
);

if (!fs.existsSync(playNowDirectory)) {
    fs.mkdirSync(playNowDirectory, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req, _file, callback) => {
        callback(null, playNowDirectory);
    },
    filename: (_req, file, callback) => {
        const originalName = Buffer.from(
            file.originalname,
            "latin1"
        ).toString("utf8");
        const extension = path.extname(originalName).toLowerCase();
        const baseName = path
            .basename(originalName, extension)
            .replace(/[^a-zA-Z0-9а-яА-ЯёЁ_-]/g, "_");

        callback(
            null,
            `${baseName}_${Date.now()}${extension}`
        );
    },
});

const fileFilter: multer.Options["fileFilter"] = (
    _req,
    file,
    callback
) => {
    const originalName = Buffer.from(
        file.originalname,
        "latin1"
    ).toString("utf8");
    const extension = path.extname(originalName).toLowerCase();
    const allowedExtensions = [".mp3", ".wav", ".ogg"];

    if (!allowedExtensions.includes(extension)) {
        callback(
            new Error(
                "Ainult MP3-, WAV- ja OGG-failid on lubatud."
            )
        );
        return;
    }

    callback(null, true);
};

export const uploadPlayNow = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 200 * 1024 * 1024,
    },
});
