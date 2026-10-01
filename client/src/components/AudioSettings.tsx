import {
    useEffect,
    useState,
} from "react";

import {
    getAudioOutputDevices,
    getSavedAudioDevice,
    saveAudioDevice,
    getVolume,
    saveVolume,
    type AudioOutputDevice,
} from "../services/audioService";

export default function AudioSettings() {

    const [
        devices,
        setDevices,
    ] =
        useState<AudioOutputDevice[]>(
            []
        );

    const [
        selectedDevice,
        setSelectedDevice,
    ] =
        useState(
            getSavedAudioDevice()
        );

    const [
        volume,
        setVolume,
    ] =
        useState(
            getVolume()
        );

    const [
        loading,
        setLoading,
    ] =
        useState(true);


    useEffect(() => {

        loadDevices();

    }, []);


    async function loadDevices() {

        try {

            setLoading(true);

            const result =
                await getAudioOutputDevices();

            setDevices(result);

        } catch (error) {

            console.error(
                "Failed to load audio devices:",
                error
            );

        } finally {

            setLoading(false);

        }
    }


    function handleDeviceChange(
        deviceId: string
    ) {

        setSelectedDevice(
            deviceId
        );

        saveAudioDevice(
            deviceId
        );
    }


    function handleVolumeChange(
        value: number
    ) {

        setVolume(value);

        saveVolume(value);
    }


    return (
        <div className="space-y-[24px]">

            {/* AUDIO DEVICE */}

            <div>

                <label
                    className="
                        mb-[8px]
                        block
                        text-[14px]
                        font-medium
                        text-[#1f2937]
                    "
                >
                    Heliväljund
                </label>


                <select
                    value={
                        selectedDevice
                    }
                    onChange={(event) =>
                        handleDeviceChange(
                            event.target.value
                        )
                    }
                    disabled={loading}
                    className="
                        w-full
                        rounded-[10px]
                        border
                        border-[#d9dee8]
                        bg-white
                        px-[14px]
                        py-[11px]
                        text-[14px]
                        text-[#1f2937]
                        outline-none
                    "
                >

                    <option value="default">
                        Süsteemi vaikeseade
                    </option>


                    {devices
                        .filter(
                            (device) =>
                                device.deviceId !==
                                "default"
                        )
                        .map(
                            (device) => (
                                <option
                                    key={
                                        device.deviceId
                                    }
                                    value={
                                        device.deviceId
                                    }
                                >
                                    {
                                        device.label
                                    }
                                </option>
                            )
                        )}

                </select>

            </div>


            {/* VOLUME */}

            <div>

                <div
                    className="
                        mb-[8px]
                        flex
                        items-center
                        justify-between
                    "
                >

                    <label
                        className="
                            text-[14px]
                            font-medium
                            text-[#1f2937]
                        "
                    >
                        Helitugevus
                    </label>


                    <span
                        className="
                            text-[14px]
                            text-[#647085]
                        "
                    >
                        {volume}%
                    </span>

                </div>


                <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={volume}
                    onChange={(event) =>
                        handleVolumeChange(
                            Number(
                                event.target.value
                            )
                        )
                    }
                    className="
                        w-full
                    "
                />

            </div>


            {/* REFRESH */}

            <button
                type="button"
                onClick={
                    loadDevices
                }
                className="
                    rounded-[8px]
                    border
                    border-[#d9dee8]
                    bg-white
                    px-[14px]
                    py-[9px]
                    text-[14px]
                    text-[#374151]
                "
            >
                Värskenda seadmeid
            </button>

        </div>
    );
}