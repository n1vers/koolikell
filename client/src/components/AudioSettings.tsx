import { useEffect, useState } from "react";

import {
    getAudioOutputDevices,
    getSavedAudioDevice,
    saveAudioDevice,
    getVolume,
    saveVolume,
    type AudioOutputDevice,
} from "../services/audioService";
import { getSyncedSettings, updateSyncedSettings } from "../api/api";

export default function AudioSettings() {
    const [devices, setDevices] = useState<AudioOutputDevice[]>([]);

    const [selectedDevice, setSelectedDevice] = useState(
        getSavedAudioDevice()
    );

    const [volume, setVolume] = useState(getVolume());

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        void loadDevices();
        const syncVolume = () =>
            getSyncedSettings()
                .then((settings) => {
                    setVolume(settings.volume);
                    saveVolume(settings.volume);
                })
                .catch((error) => console.error("Failed to load synced audio settings:", error));
        void syncVolume();
        const timer = window.setInterval(() => void syncVolume(), 3000);
        return () => window.clearInterval(timer);
    }, []);

    async function loadDevices() {
        try {
            setLoading(true);

            const result = await getAudioOutputDevices();

            setDevices(result);
        } catch (error) {
            console.error("Failed to load audio devices:", error);
        } finally {
            setLoading(false);
        }
    }

    function handleDeviceChange(deviceId: string) {
        setSelectedDevice(deviceId);

        saveAudioDevice(deviceId);
    }

    function handleVolumeChange(value: number) {
        setVolume(value);

        saveVolume(value);
        void updateSyncedSettings({ volume: value }).catch((error) =>
            console.error("Failed to save synced audio volume:", error)
        );
    }

    const otherDevices = devices.filter(
        (device) => device.deviceId !== "default"
    );

    return (
        <div className="space-y-[28px] font-['Inter']">
            {/* AUDIO DEVICE */}

            <div>
                <label
                    htmlFor="audio-output-device"
                    className="mb-[6px] block text-[14px] font-medium text-[#1f2937]"
                >
                    Heliväljund
                </label>

                <p className="m-0 mb-[10px] text-[13px] text-[#8792a5]">
                    Vali seade, mille kaudu koolikell ja muusika kõlavad.
                </p>

                <select
                    id="audio-output-device"
                    value={selectedDevice}
                    onChange={(event) => handleDeviceChange(event.target.value)}
                    disabled={loading}
                    className="h-[44px] w-full rounded-[10px] border border-[#d9dee8] bg-white px-[14px] text-[14px] text-[#1f2937] outline-none transition focus:border-[#5798f5] focus:ring-2 focus:ring-[#5798f5]/20 disabled:cursor-not-allowed disabled:bg-[#f5f7fb] disabled:text-[#a3adbd]"
                >
                    <option value="default">Süsteemi vaikeseade</option>

                    {otherDevices.map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>
                            {device.label}
                        </option>
                    ))}
                </select>

                {loading && (
                    <p className="m-0 mt-[8px] text-[12px] text-[#8792a5]">
                        Seadmete laadimine...
                    </p>
                )}
            </div>

            {/* VOLUME */}

            <div>
                <div className="mb-[10px] flex items-center justify-between">
                    <label
                        htmlFor="audio-volume"
                        className="text-[14px] font-medium text-[#1f2937]"
                    >
                        Helitugevus
                    </label>

                    <span className="rounded-full bg-[#eaf2ff] px-[10px] py-[2px] text-[13px] font-medium tabular-nums text-[#3f82df]">
                        {volume}%
                    </span>
                </div>

                <input
                    id="audio-volume"
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={volume}
                    onChange={(event) =>
                        handleVolumeChange(Number(event.target.value))
                    }
                    className="w-full cursor-pointer accent-[#5798f5]"
                />

                <div className="mt-[4px] flex justify-between text-[11px] text-[#a3adbd]">
                    <span>0%</span>
                    <span>100%</span>
                </div>
            </div>
        </div>
    );
}