export interface AudioOutputDevice {
    deviceId: string;
    label: string;
}

export interface ServerAudioDevices {
    devices: AudioOutputDevice[];
    selectedDeviceId: string;
}

const STORAGE_DEVICE =
    "schoolbell.audio.device";

const STORAGE_VOLUME =
    "schoolbell.audio.volume";
const AUDIO_DEVICE_CHANGED_EVENT = "schoolbell-audio-device-changed";

export function getSavedAudioDevice(): string {
    return (
        localStorage.getItem(
            STORAGE_DEVICE
        ) ?? "default"
    );
}

export async function getAudioOutputDevices(): Promise<
    AudioOutputDevice[]
> {
    const devices =
        await navigator.mediaDevices.enumerateDevices();

    return devices
        .filter(
            (device) =>
                device.kind === "audiooutput"
        )
        .map((device) => ({
            deviceId: device.deviceId,
            label:
                device.label ||
                "Heliseade",
        }));
}

export function saveAudioDevice(
    deviceId: string
) {
    localStorage.setItem(
        STORAGE_DEVICE,
        deviceId
    );
    window.dispatchEvent(
        new CustomEvent(AUDIO_DEVICE_CHANGED_EVENT, {
            detail: deviceId,
        })
    );
}

export async function getServerAudioDevices(): Promise<ServerAudioDevices> {
    const response = await fetch("/api/audio/server-devices");
    if (!response.ok) {
        throw new Error("Serveri heliväljundite lugemine ebaõnnestus");
    }
    return response.json() as Promise<ServerAudioDevices>;
}

export async function publishServerAudioDevices(
    devices: AudioOutputDevice[]
): Promise<ServerAudioDevices> {
    const response = await fetch("/api/audio/server-devices", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ devices }),
    });
    if (!response.ok) {
        throw new Error("Serveri heliväljundite avaldamine ebaõnnestus");
    }
    return response.json() as Promise<ServerAudioDevices>;
}

export async function saveServerAudioDevice(deviceId: string): Promise<void> {
    const response = await fetch("/api/audio/server-device", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId }),
    });
    if (!response.ok) {
        throw new Error("Serveri heliväljundi salvestamine ebaõnnestus");
    }
}

export function onAudioDeviceChange(
    callback: () => void
): () => void {
    window.addEventListener(AUDIO_DEVICE_CHANGED_EVENT, callback);
    return () => window.removeEventListener(AUDIO_DEVICE_CHANGED_EVENT, callback);
}

export function getVolume(): number {
    const value =
        localStorage.getItem(
            STORAGE_VOLUME
        );

    if (value === null) {
        return 80;
    }

    const volume =
        Number(value);

    if (
        Number.isNaN(volume) ||
        volume < 0 ||
        volume > 100
    ) {
        return 80;
    }

    return volume;
}

export function saveVolume(
    volume: number
) {
    const normalized =
        Math.max(
            0,
            Math.min(
                100,
                volume
            )
        );

    localStorage.setItem(
        STORAGE_VOLUME,
        String(normalized)
    );
}