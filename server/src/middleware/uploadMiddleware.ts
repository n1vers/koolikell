import multer from "multer";
import path from "path";
import fs from "fs";


// ============================================
// SOUNDS DIRECTORY
// ============================================

const soundsDirectory = path.join(
    process.cwd(),
    "sounds"
);


// Создаём папку автоматически,
// если её ещё нет.

if (!fs.existsSync(soundsDirectory)) {

    fs.mkdirSync(
        soundsDirectory,
        {
            recursive: true,
        }
    );

}


// ============================================
// STORAGE
// ============================================

const storage =
    multer.diskStorage({

        destination: (
            req,
            file,
            callback
        ) => {

            callback(
                null,
                soundsDirectory
            );

        },


        filename: (
            req,
            file,
            callback
        ) => {

            const extension =
                path.extname(
                    file.originalname
                ).toLowerCase();


            const baseName =
                path.basename(
                    file.originalname,
                    extension
                )
                    .replace(
                        /[^a-zA-Z0-9а-яА-ЯёЁ_-]/g,
                        "_"
                    );


            const uniqueName =
                `${baseName}_${Date.now()}${extension}`;


            callback(
                null,
                uniqueName
            );

        },

    });


// ============================================
// FILE FILTER
// ============================================

const fileFilter: multer.Options["fileFilter"] =
    (
        req,
        file,
        callback
    ) => {

        const extension =
            path.extname(
                file.originalname
            ).toLowerCase();


        const allowedExtensions = [
            ".mp3",
            ".wav",
            ".ogg",
        ];


        if (
            !allowedExtensions.includes(
                extension
            )
        ) {

            return callback(
                new Error(
                    "Ainult MP3, WAV ja OGG failid on lubatud."
                )
            );

        }


        callback(
            null,
            true
        );

    };


// ============================================
// UPLOAD
// ============================================

export const uploadSound =
    multer({

        storage,

        fileFilter,

        limits: {

            fileSize:
                50 * 1024 * 1024,

        },

    });