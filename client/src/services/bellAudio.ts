import {
    getSavedAudioDevice,
    getVolume,
} from "./audioService";

let currentAudio:
    HTMLAudioElement | null = null;

export async function playBell(
    url: string
): Promise<void> {

    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }

    const audio =
        new Audio(url);

    currentAudio = audio;

    audio.volume =
        getVolume() / 100;

    const deviceId =
        getSavedAudioDevice();

    /*
     * Electron / Chromium поддерживает
     * выбор конкретного output device.
     */
    if (
        "setSinkId" in audio &&
        typeof (
            audio as HTMLAudioElement & {
                setSinkId?: (
                    id: string
                ) => Promise<void>;
            }
        ).setSinkId === "function"
    ) {

        try {

            await (
                audio as HTMLAudioElement & {
                    setSinkId: (
                        id: string
                    ) => Promise<void>;
                }
            ).setSinkId(
                deviceId
            );

        } catch (error) {

            console.error(
                "Failed to select audio device:",
                error
            );

        }
    }

    audio.addEventListener(
        "ended",
        () => {

            if (
                currentAudio === audio
            ) {
                currentAudio = null;
            }

        }
    );

    await audio.play();
}

export function stopBell() {

    if (!currentAudio) {
        return;
    }

    currentAudio.pause();

    currentAudio.currentTime = 0;

    currentAudio = null;
}