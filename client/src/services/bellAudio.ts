import {
    getSavedAudioDevice,
    getVolume,
    onAudioDeviceChange,
} from "./audioService";

let currentAudio:
    HTMLAudioElement | null = null;

onAudioDeviceChange(() => {
    if (currentAudio) {
        void setAudioOutputDevice(currentAudio).catch((error) => {
            console.error("Failed to switch active audio device:", error);
        });
    }
});

export async function setAudioOutputDevice(
    audio: HTMLAudioElement
): Promise<void> {
    const setSinkId = (
        audio as HTMLAudioElement & {
            setSinkId?: (id: string) => Promise<void>;
        }
    ).setSinkId;
    if (typeof setSinkId !== "function") {
        return;
    }

    await setSinkId.call(audio, getSavedAudioDevice());
}

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

    /*
     * Electron / Chromium поддерживает
     * выбор конкретного output device.
     */
    try {
        await setAudioOutputDevice(audio);
    } catch (error) {
        console.error("Failed to select audio device:", error);
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