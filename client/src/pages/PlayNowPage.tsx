import { useEffect, useRef, useState } from "react";
import {
    deletePlayNowTrack,
    getPlayNowTrackUrl,
    getPlayNowTracks,
    uploadPlayNowTrack,
    type PlayNowTrack,
} from "../services/playNowService";

export default function PlayNowPage() {
    const [tracks, setTracks] = useState<PlayNowTrack[]>([]);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [loopMode, setLoopMode] = useState<
        "off" | "track" | "playlist"
    >("off");
    const [volume, setVolume] = useState(() => {
        const savedVolume = Number(
            localStorage.getItem("schoolbell-playnow-volume")
        );

        return Number.isFinite(savedVolume) &&
            savedVolume >= 0 &&
            savedVolume <= 100
            ? savedVolume
            : 80;
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const [draggedFile, setDraggedFile] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const volumeRef = useRef(volume);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        getPlayNowTracks()
            .then((items) => {
                const savedOrder = JSON.parse(
                    localStorage.getItem("schoolbell-playnow-order") ?? "[]"
                ) as string[];
                const ordered = [...items].sort(
                    (a, b) =>
                        (savedOrder.indexOf(a.fileName) < 0 ? 9999 : savedOrder.indexOf(a.fileName)) -
                        (savedOrder.indexOf(b.fileName) < 0 ? 9999 : savedOrder.indexOf(b.fileName))
                );
                setTracks(ordered);
                setSelectedFile(ordered[0]?.fileName ?? null);
            })
            .catch((loadError) => {
                setError(
                    loadError instanceof Error
                        ? loadError.message
                        : "PlayNow laadimine ebaõnnestus"
                );
            })
            .finally(() => setLoading(false));
    }, []);

    function stop() {
        audioRef.current?.pause();
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
        }
        setPlaying(false);
        setCurrentTime(0);
    }

    function play(fileName = selectedFile) {
        if (!fileName) {
            return;
        }

        const trackIndex = tracks.findIndex(
            (track) => track.fileName === fileName
        );

        stop();
        const audio = new Audio(getPlayNowTrackUrl(fileName));
        audio.volume = volumeRef.current / 100;
        audio.loop = loopMode === "track";
        audio.onloadedmetadata = () => setDuration(audio.duration);
        audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
        audio.onended = () => {
            const nextTrack =
                tracks[trackIndex + 1] ??
                (loopMode === "playlist" ? tracks[0] : null);

            if (nextTrack) {
                play(nextTrack.fileName);
            } else {
                setPlaying(false);
            }
        };
        audio.onerror = () => {
            setError("PlayNow loo esitamine ebaõnnestus");
            setPlaying(false);
        };
        audioRef.current = audio;
        setSelectedFile(fileName);
        setPlaying(true);
        setCurrentTime(0);
        void audio.play();
    }

    function handleVolumeChange(nextVolume: number) {
        setVolume(nextVolume);
        volumeRef.current = nextVolume;
        localStorage.setItem(
            "schoolbell-playnow-volume",
            String(nextVolume)
        );
        if (audioRef.current) {
            audioRef.current.volume = nextVolume / 100;
        }
    }

    function formatTime(value: number) {
        const minutes = Math.floor(value / 60);
        const seconds = Math.floor(value % 60)
            .toString()
            .padStart(2, "0");

        return `${minutes}:${seconds}`;
    }

    async function uploadTrack(file: File) {
        if (!file) {
            return;
        }

        try {
            setError("");
            const track = await uploadPlayNowTrack(file);
            setTracks((current) => [...current, track]);
            setSelectedFile(track.fileName);
        } catch (uploadError) {
            setError(
                uploadError instanceof Error
                    ? uploadError.message
                    : "PlayNow üleslaadimine ebaõnnestus"
            );
        }
    }

    async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (file) {
            await uploadTrack(file);
        }
    }

    function openFilePicker() {
        fileInputRef.current?.click();
    }

    function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
        event.preventDefault();
        setIsDragging(true);
    }

    function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
        event.preventDefault();
        setIsDragging(false);
    }

    async function handleDrop(event: React.DragEvent<HTMLDivElement>) {
        event.preventDefault();
        setIsDragging(false);
        const file = event.dataTransfer.files[0];
        if (file) {
            await uploadTrack(file);
        }
    }

    async function openFolder() {
        if (!window.electronAPI) {
            setError("Kausta avamine töötab ainult Windowsi rakenduses.");
            return;
        }

        try {
            await window.electronAPI.openPlayNowFolder();
        } catch (folderError) {
            setError(
                folderError instanceof Error
                    ? folderError.message
                    : "PlayNow kausta avamine ebaõnnestus"
            );
        }
    }

    function handleTrackDrop(fileName: string) {
        if (!draggedFile || draggedFile === fileName) {
            return;
        }

        setTracks((current) => {
            const next = [...current];
            const from = next.findIndex((item) => item.fileName === draggedFile);
            const to = next.findIndex((item) => item.fileName === fileName);
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            localStorage.setItem(
                "schoolbell-playnow-order",
                JSON.stringify(next.map((item) => item.fileName))
            );
            return next;
        });
        setDraggedFile(null);
    }

    async function handleDelete(track: PlayNowTrack) {
        if (!window.confirm(`Kustuta „${track.name}“?`)) {
            return;
        }

        stop();
        await deletePlayNowTrack(track.fileName);
        setTracks((current) =>
            current.filter((item) => item.fileName !== track.fileName)
        );
        if (selectedFile === track.fileName) {
            setSelectedFile(null);
        }
    }

    function handleLoopChange(
        mode: "off" | "track" | "playlist"
    ) {
        setLoopMode(mode);
        if (audioRef.current) {
            audioRef.current.loop = mode === "track";
        }
    }

    const selectedTrack = tracks.find(
        (track) => track.fileName === selectedFile
    );

    return (
        <main className="ml-[240px] min-h-screen bg-[#f5f7fb] px-[clamp(24px,4vw,64px)] py-[56px] font-['Inter']">
            <header className="mb-[28px] flex w-full max-w-[960px] items-start justify-between gap-[20px]">
                <div>
                    <p className="mb-[8px] text-[12px] font-medium uppercase tracking-[0.08em] text-[#647085]">
                        MUUSIKA
                    </p>
                    <h1 className="m-0 text-[32px] font-semibold text-[#1b212d]">
                        PlayNow
                    </h1>
                    <p className="mt-[8px] text-[14px] text-[#647085]">
                        Esita eraldi muusikapleierist helifaile.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => void openFolder()}
                    className="rounded-[9px] border border-[#d9dee8] bg-white px-[14px] py-[10px] text-[13px] font-medium text-[#374151] hover:border-[#529eff]"
                >
                    Ava kaust
                </button>
            </header>

            {error && (
                <div className="mb-[16px] max-w-[960px] rounded-[9px] border border-[#f3b4b4] bg-[#fff5f5] px-[14px] py-[11px] text-[13px] text-[#b42318]">
                    {error}
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.ogg"
                onChange={handleUpload}
                className="hidden"
            />

            <div
                onClick={openFilePicker}
                onDragOver={handleDragOver}
                onDragEnter={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`mb-[20px] flex min-h-[170px] w-full max-w-[960px] cursor-pointer flex-col items-center justify-center rounded-[16px] border-2 border-dashed transition ${
                    isDragging
                        ? "border-[#529eff] bg-[#f5f9ff] text-[#438fea]"
                        : "border-[#d9dee8] bg-white text-[#7b8494] hover:border-[#9ca3af]"
                }`}
            >
                <div className="mb-[10px] text-[28px]">♫</div>
                <div className="text-[15px] font-medium">
                    {isDragging
                        ? "Laske fail siia"
                        : "Lohista muusikafail siia"}
                </div>
                <div className="mt-[5px] text-[13px] opacity-75">
                    või klõpsa faili valimiseks · MP3, WAV, OGG
                </div>
            </div>

            <section className="w-full max-w-[960px] rounded-[14px] border border-[#e5e9f0] bg-white p-[22px] shadow-[0_8px_24px_rgba(27,33,45,0.04)]">
                <div className="flex flex-wrap items-center gap-[10px] border-b border-[#eef1f5] pb-[18px]">
                    <button
                        type="button"
                        onClick={() => play()}
                        disabled={!selectedFile}
                        className="rounded-[8px] bg-[#529eff] px-[18px] py-[10px] text-[13px] font-medium text-white disabled:opacity-40"
                    >
                        ▶ Start
                    </button>
                    <button
                        type="button"
                        onClick={stop}
                        className="rounded-[8px] border border-[#d9dee8] bg-white px-[18px] py-[10px] text-[13px] font-medium text-[#374151]"
                    >
                        ■ Stop
                    </button>
                    <select
                        value={loopMode}
                        onChange={(event) =>
                            handleLoopChange(
                                event.target.value as
                                    | "off"
                                    | "track"
                                    | "playlist"
                            )
                        }
                        className="h-[38px] rounded-[8px] border border-[#d9dee8] bg-white px-[10px] text-[13px] text-[#374151] outline-none focus:border-[#529eff]"
                    >
                        <option value="off">Ilma korduseta</option>
                        <option value="track">Korda lugu</option>
                        <option value="playlist">Korda esitusloendit</option>
                    </select>
                    <label className="flex min-w-[190px] items-center gap-[8px] text-[13px] text-[#647085]">
                        <span>Helitugevus</span>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={volume}
                            onChange={(event) =>
                                handleVolumeChange(
                                    Number(event.target.value)
                                )
                            }
                            aria-label="Helitugevus"
                            className="min-w-0 flex-1 accent-[#529eff]"
                        />
                        <span className="w-[34px] text-right text-[12px]">
                            {volume}%
                        </span>
                    </label>
                    <span className="ml-auto text-[13px] text-[#647085]">
                        {playing ? "Esitab" : "Peatatud"}
                    </span>
                </div>

                <div className="mt-[16px] flex items-center gap-[10px]">
                    <span className="w-[38px] text-right text-[11px] text-[#7b8494]">
                        {formatTime(currentTime)}
                    </span>
                    <input
                        type="range"
                        min="0"
                        max={duration || 0}
                        step="0.1"
                        value={Math.min(currentTime, duration || 0)}
                        onChange={(event) => {
                            const value = Number(event.target.value);
                            setCurrentTime(value);
                            if (audioRef.current) {
                                audioRef.current.currentTime = value;
                            }
                        }}
                        disabled={!duration}
                        className="min-w-0 flex-1 accent-[#529eff]"
                    />
                    <span className="w-[38px] text-[11px] text-[#7b8494]">
                        {formatTime(duration)}
                    </span>
                </div>

                {loading ? (
                    <p className="m-0 py-[24px] text-[14px] text-[#7b8494]">
                        Laadimine...
                    </p>
                ) : tracks.length === 0 ? (
                    <p className="m-0 py-[24px] text-[14px] text-[#7b8494]">
                        PlayNow lugusid pole.
                    </p>
                ) : (
                    <div className="mt-[16px] space-y-[8px]">
                        {tracks.map((track, index) => (
                            <div
                                key={track.fileName}
                                onDragOver={(event) => event.preventDefault()}
                                onDrop={() => handleTrackDrop(track.fileName)}
                                className={`flex items-center gap-[12px] rounded-[9px] border px-[13px] py-[10px] ${
                                    selectedFile === track.fileName
                                        ? "border-[#529eff] bg-[#f5f9ff]"
                                        : "border-[#eef1f5] bg-white"
                                }`}
                            >
                                <span
                                    draggable
                                    onDragStart={() => setDraggedFile(track.fileName)}
                                    className="w-[36px] cursor-grab select-none text-center text-[13px] text-[#9aa3b2] active:cursor-grabbing"
                                    title="Lohista loo muutmiseks"
                                >
                                    ⋮⋮
                                </span>
                                <span className="w-[22px] text-center text-[11px] text-[#9aa3b2]">
                                    {String(index + 1).padStart(2, "0")}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => play(track.fileName)}
                                    className="h-[32px] w-[32px] rounded-[7px] bg-[#eef2ff] text-[13px] text-[#438fea]"
                                >
                                    ▶
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedFile(track.fileName)}
                                    className="min-w-0 flex-1 truncate text-left text-[13px] font-medium text-[#1b212d]"
                                >
                                    {track.name}
                                </button>
                                {selectedTrack?.fileName === track.fileName && playing && (
                                    <span className="text-[11px] text-[#438fea]">Esitab</span>
                                )}
                                <button
                                    type="button"
                                    onClick={() => void handleDelete(track)}
                                    className="text-[12px] text-[#c24141]"
                                >
                                    Kustuta
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}
