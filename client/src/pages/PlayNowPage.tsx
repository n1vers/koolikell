import { useEffect, useRef, useState } from "react";
import {
    deletePlayNowTrack,
    getPlayNowTrackUrl,
    getPlayNowTracks,
    uploadPlayNowTrack,
    type PlayNowTrack,
} from "../services/playNowService";
import {
    getPlayNowState,
    updatePlayNowState,
    type PlayNowLoopMode,
} from "../services/playNowStateService";

// ============================================
// ICONS
// ============================================

function PlayIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-[14px] w-[14px]" aria-hidden="true">
            <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5Z" />
        </svg>
    );
}

function StopIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-[14px] w-[14px]" aria-hidden="true">
            <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
    );
}

function UploadIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-[22px] w-[22px]"
            aria-hidden="true"
        >
            <path d="M12 16V4" />
            <path d="m7 9 5-5 5 5" />
            <path d="M5 20h14" />
        </svg>
    );
}

function GripIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-[16px] w-[16px]" aria-hidden="true">
            <circle cx="9" cy="6" r="1.6" />
            <circle cx="15" cy="6" r="1.6" />
            <circle cx="9" cy="12" r="1.6" />
            <circle cx="15" cy="12" r="1.6" />
            <circle cx="9" cy="18" r="1.6" />
            <circle cx="15" cy="18" r="1.6" />
        </svg>
    );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
    return (
        <div className="mb-[6px] text-[11px] font-medium uppercase tracking-wide text-[#8490a3]">
            {children}
        </div>
    );
}

export default function PlayNowPage() {
    const [tracks, setTracks] = useState<PlayNowTrack[]>([]);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [playing, setPlaying] = useState(false);
    const [paused, setPaused] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [loopMode, setLoopMode] = useState<PlayNowLoopMode>("off");
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
    const lastStateRevision = useRef(0);
    const playbackGeneration = useRef(0);
    const commandQueue = useRef(Promise.resolve());
    const positionUpdateInFlight = useRef(false);
    const latestPositionRequest = useRef<Promise<unknown> | null>(null);
    const tracksRefreshInFlight = useRef(false);
    const loopModeRef = useRef(loopMode);
    const playlistRef = useRef<string[]>([]);
    const playingRef = useRef(playing);
    const remoteClockRef = useRef({
        position: 0,
        updatedAt: Date.now(),
        playing: false,
        selectedFile: null as string | null,
    });
    const isLocalPlayer = Boolean(window.electronAPI);

    useEffect(() => {
        playingRef.current = playing;
    }, [playing]);

    function orderTracks(items: PlayNowTrack[], order: string[]) {
        if (order.length === 0) {
            return items;
        }
        const byName = new Map(items.map((item) => [item.fileName, item]));
        return order
            .map((fileName) => byName.get(fileName))
            .filter((item): item is PlayNowTrack => item !== undefined)
            .concat(items.filter((item) => !order.includes(item.fileName)));
    }

    function sendState(
        state: Parameters<typeof updatePlayNowState>[0]
    ) {
        if (state.action === "position") {
            if (latestPositionRequest.current) {
                return latestPositionRequest.current;
            }
            const request = updatePlayNowState(state)
                .then((nextState) => {
                    lastStateRevision.current = Math.max(
                        lastStateRevision.current,
                        nextState.revision
                    );
                    return nextState;
                })
                .catch((commandError: unknown) => {
                    setError(
                        commandError instanceof Error
                            ? commandError.message
                            : "PlayNow käsu saatmine ebaõnnestus"
                    );
                })
                .finally(() => {
                    latestPositionRequest.current = null;
                });
            latestPositionRequest.current = request;
            return request;
        }

        commandQueue.current = commandQueue.current
            .catch(() => undefined)
            .then(async () => {
                const nextState = await updatePlayNowState(state);
                lastStateRevision.current = Math.max(
                    lastStateRevision.current,
                    nextState.revision
                );
            })
            .catch((commandError: unknown) => {
                setError(
                    commandError instanceof Error
                        ? commandError.message
                        : "PlayNow käsu saatmine ebaõnnestus"
                );
            });
        return commandQueue.current;
    }

    useEffect(() => {
        void refreshTracks(true);
        const timer = window.setInterval(() => {
            void refreshTracks();
        }, 2000);

        return () => window.clearInterval(timer);
    }, []);

    async function refreshTracks(initialLoad = false) {
        if (tracksRefreshInFlight.current) {
            return;
        }
        tracksRefreshInFlight.current = true;

        try {
            const items = await getPlayNowTracks();
            const savedOrder = JSON.parse(
                localStorage.getItem("schoolbell-playnow-order") ?? "[]"
            ) as string[];
            const order = playlistRef.current.length > 0
                ? playlistRef.current
                : savedOrder;
            const ordered = orderTracks(items, order);
            playlistRef.current = ordered.map((item) => item.fileName);
            setTracks(ordered);
            setSelectedFile((current) =>
                current && ordered.some((track) => track.fileName === current)
                    ? current
                    : ordered[0]?.fileName ?? null
            );
            if (initialLoad) {
                setLoading(false);
            }
        } catch (loadError) {
            setError(
                loadError instanceof Error
                    ? loadError.message
                    : "PlayNow laadimine ebaõnnestus"
            );
            if (initialLoad) {
                setLoading(false);
            }
        } finally {
            tracksRefreshInFlight.current = false;
        }
    }

    function startSelectedTrack() {
        if (!selectedFile) {
            return;
        }

        play(selectedFile, true, 0);
    }

    function continueTrack() {
        if (!audioRef.current || audioRef.current.dataset.fileName !== selectedFile) {
            if (selectedFile) {
                play(selectedFile, true, currentTime);
            }
            return;
        }

        void audioRef.current.play();
        setPlaying(true);
        playingRef.current = true;
        setPaused(false);
        void sendState({
            action: "play",
            selectedFile,
            playing: true,
            position: currentTime,
            startedAt: Date.now() - currentTime * 1000,
        });
    }

    useEffect(() => {
        const syncState = async () => {
            try {
                const state = await getPlayNowState();
                if (state.playlist.length > 0) {
                    playlistRef.current = state.playlist;
                    setTracks((current) => orderTracks(current, state.playlist));
                }
                if (state.selectedFile) {
                    setSelectedFile(state.selectedFile);
                }
                setLoopMode(state.loopMode);
                loopModeRef.current = state.loopMode;
                setVolume(state.volume);
                volumeRef.current = state.volume;
                if (!isLocalPlayer) {
                    const wasPlaying = remoteClockRef.current.playing;
                    const wasSelectedFile = remoteClockRef.current.selectedFile;
                    const nextUpdatedAt = Number.isFinite(state.updatedAt)
                        ? state.updatedAt
                        : Date.now();
                    const nextPosition = state.position;
                    const shouldResetClock =
                        !wasPlaying ||
                        !state.playing ||
                        wasSelectedFile !== state.selectedFile ||
                        state.action === "play" ||
                        state.action === "stop" ||
                        state.action === "position";
                    if (shouldResetClock) {
                        remoteClockRef.current = {
                            position: nextPosition,
                            updatedAt: nextUpdatedAt,
                            playing: state.playing,
                            selectedFile: state.selectedFile,
                        };
                        setCurrentTime(Math.max(0, nextPosition));
                    } else {
                        remoteClockRef.current.playing = state.playing;
                        remoteClockRef.current.selectedFile = state.selectedFile;
                    }
                    setPlaying(state.playing);
                    setPaused(!state.playing);
                }
                if (state.revision <= lastStateRevision.current) {
                    return;
                }
                lastStateRevision.current = state.revision;
                if (isLocalPlayer) {
                    if (state.action === "play" && state.selectedFile) {
                        if (
                            audioRef.current &&
                            audioRef.current.dataset.fileName === state.selectedFile
                        ) {
                            audioRef.current.currentTime = state.position;
                            void audioRef.current.play();
                            setPlaying(true);
                            setPaused(false);
                        } else {
                            play(state.selectedFile, false, state.position);
                        }
                    } else if (state.action === "stop") {
                        if (audioRef.current) {
                            audioRef.current.currentTime = state.position;
                        }
                        stop(false);
                        setPaused(true);
                    } else if (state.action === "loop" && audioRef.current) {
                        audioRef.current.loop = false;
                    } else if (state.action === "volume" && audioRef.current) {
                        audioRef.current.volume = state.volume / 100;
                    } else if (state.action === "position" && audioRef.current) {
                        if (state.playing) {
                            audioRef.current.currentTime = state.position;
                        } else {
                            stop(false);
                            audioRef.current.currentTime = state.position;
                        }
                    }
                }
                if (state.action === "play" || state.action === "stop") {
                    setPlaying(state.playing);
                    setPaused(!state.playing);
                }
            } catch (syncError) {
                if (
                    !(syncError instanceof Error) ||
                    !syncError.message.includes("(HTTP 404)")
                ) {
                    setError(
                        syncError instanceof Error
                            ? syncError.message
                            : "PlayNow sünkroonimine ebaõnnestus"
                    );
                }
            }
        };
        void syncState();
        const timer = window.setInterval(() => void syncState(), 1000);
        return () => window.clearInterval(timer);
    }, [duration, isLocalPlayer]);

    useEffect(() => {
        if (isLocalPlayer) {
            return;
        }

        const timer = window.setInterval(() => {
            const clock = remoteClockRef.current;
            const elapsed = clock.playing
                ? Math.max(0, (Date.now() - clock.updatedAt) / 1000)
                : 0;
            const nextTime = Math.max(0, clock.position + elapsed);
            setCurrentTime(duration > 0 ? Math.min(nextTime, duration) : nextTime);
        }, 100);

        return () => window.clearInterval(timer);
    }, [duration, isLocalPlayer]);

    useEffect(() => {
        if (!isLocalPlayer) {
            return;
        }

        const timer = window.setInterval(() => {
            const audio = audioRef.current;
            if (
                !audio ||
                !audio.dataset.fileName ||
                audio.paused ||
                !playingRef.current
            ) {
                return;
            }
            if (positionUpdateInFlight.current) {
                return;
            }
            positionUpdateInFlight.current = true;
            void sendState({
                action: "position",
                selectedFile: audio.dataset.fileName,
                playing: true,
                position: audio.currentTime,
                startedAt: Date.now() - audio.currentTime * 1000,
                baseRevision: lastStateRevision.current,
            }).finally(() => {
                positionUpdateInFlight.current = false;
            });
        }, 1000);

        return () => window.clearInterval(timer);
    }, [isLocalPlayer]);

    useEffect(() => {
        if (isLocalPlayer || !selectedFile) {
            return;
        }

        const metadataAudio = new Audio(getPlayNowTrackUrl(selectedFile));
        metadataAudio.preload = "metadata";
        metadataAudio.onloadedmetadata = () => setDuration(metadataAudio.duration);
        return () => {
            metadataAudio.onloadedmetadata = null;
            metadataAudio.src = "";
        };
    }, [isLocalPlayer, selectedFile]);

    function stop(sync = true) {
        playbackGeneration.current += 1;
        playingRef.current = false;
        const stoppedAt = audioRef.current?.currentTime ?? currentTime;
        audioRef.current?.pause();
        setPlaying(false);
        setPaused(true);
        setCurrentTime(stoppedAt);
        if (sync) {
            void sendState({
                action: "stop",
                playing: false,
                position: stoppedAt,
                startedAt: null,
            });
        }
    }

    function play(
        fileName = selectedFile,
        sync = true,
        startTime = 0
    ) {
        if (!fileName) {
            return;
        }
        if (sync) {
            void sendState({
                action: "play",
                selectedFile: fileName,
                playing: true,
                position: startTime,
                startedAt: Date.now() - startTime * 1000,
                playlist: playlistRef.current,
            });
        }
        if (!isLocalPlayer) {
            setSelectedFile(fileName);
            setPlaying(true);
            setCurrentTime(startTime);
            return;
        }

        const trackIndex = playlistRef.current.indexOf(fileName);

        stop(false);
        const audio = new Audio(getPlayNowTrackUrl(fileName));
        const generation = ++playbackGeneration.current;
        audio.dataset.fileName = fileName;
        audio.currentTime = startTime;
        audio.volume = volumeRef.current / 100;
        audio.loop = false;
        audio.onloadedmetadata = () => setDuration(audio.duration);
        audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
        audio.onended = () => {
            if (generation !== playbackGeneration.current) {
                return;
            }
            const nextFile =
                loopModeRef.current === "track"
                    ? fileName
                    : loopModeRef.current === "playlist"
                    ? playlistRef.current[trackIndex + 1] ?? playlistRef.current[0]
                    : null;

            if (nextFile) {
                play(nextFile, true, 0);
            } else {
                setPlaying(false);
                playingRef.current = false;
                setPaused(false);
                setCurrentTime(0);
                void sendState({
                    action: "stop",
                    playing: false,
                    position: 0,
                    startedAt: null,
                });
            }
        };
        audio.onerror = () => {
            if (generation !== playbackGeneration.current) {
                return;
            }
            setError("PlayNow loo esitamine ebaõnnestus");
            setPlaying(false);
            playingRef.current = false;
        };
        audioRef.current = audio;
        setSelectedFile(fileName);
        setPlaying(true);
        playingRef.current = true;
        setPaused(false);
        setCurrentTime(startTime);
        void audio.play().catch(() => {
            if (generation === playbackGeneration.current) {
                setPlaying(false);
                playingRef.current = false;
            }
        });
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
        void sendState({
            action: "volume",
            volume: nextVolume,
        });
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

        // Не сбрасываем подсветку, если курсор перешёл на вложенный элемент (убирает мерцание)
        if (
            event.relatedTarget instanceof Node &&
            event.currentTarget.contains(event.relatedTarget)
        ) {
            return;
        }

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
            playlistRef.current = next.map((item) => item.fileName);
            void sendState({
                action: "select",
                selectedFile,
                playing,
                position: currentTime,
                startedAt: playing ? Date.now() - currentTime * 1000 : null,
                playlist: playlistRef.current,
            });
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

    function handleLoopChange(mode: PlayNowLoopMode) {
        setLoopMode(mode);
        loopModeRef.current = mode;
        if (audioRef.current) {
            audioRef.current.loop = false;
        }
        void sendState({
            action: "loop",
            loopMode: mode,
        });
    }

    const selectedTrack = tracks.find(
        (track) => track.fileName === selectedFile
    );

    return (
        <main className="ml-[240px] box-border min-h-screen w-[calc(100%_-_240px)] bg-[#f5f7fb] px-[clamp(24px,4vw,64px)] py-[36px] font-['Inter']">
            <div className="mx-auto w-full max-w-[1040px]">
                {/* HEADER */}

                <header className="mb-[28px] flex items-start justify-between gap-[24px]">
                    <div>
                        <p className="mb-[8px] text-[12px] font-medium uppercase tracking-[0.08em] text-[#8490a3]">
                            Muusika
                        </p>

                        <h1 className="m-0 text-[28px] font-semibold leading-tight text-[#202633]">
                            PlayNow
                        </h1>

                        <p className="mt-[6px] text-[14px] text-[#7d899d]">
                            Esita eraldi muusikapleierist helifaile.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => void openFolder()}
                        className="h-[40px] rounded-[8px] border border-[#d9dee8] bg-white px-[16px] text-[13px] font-medium text-[#374151] shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition hover:border-[#5798f5] hover:text-[#3f82df]"
                    >
                        Ava kaust
                    </button>
                </header>

                {/* ERROR */}

                {error && (
                    <div
                        role="alert"
                        className="mb-[20px] flex items-start justify-between gap-[12px] rounded-[10px] border border-[#f3b4b4] bg-[#fff5f5] px-[16px] py-[12px] text-[14px] text-[#b42318]"
                    >
                        <span>{error}</span>

                        <button
                            type="button"
                            onClick={() => setError("")}
                            className="shrink-0 text-[18px] leading-none text-[#b42318]/70 transition hover:text-[#b42318]"
                            aria-label="Sulge"
                        >
                            ×
                        </button>
                    </div>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*,.mp3,.wav,.ogg"
                    onChange={handleUpload}
                    className="hidden"
                />

                {/* DROP ZONE */}

                <div
                    role="button"
                    tabIndex={0}
                    onClick={openFilePicker}
                    onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openFilePicker();
                        }
                    }}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`mb-[20px] box-border flex min-h-[132px] w-full cursor-pointer flex-col items-center justify-center rounded-[14px] border-2 border-dashed px-[24px] py-[20px] text-center outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#5798f5]/40 ${
                        isDragging
                            ? "border-[#5798f5] bg-[#eef5ff]"
                            : "border-[#d3d9e4] bg-white hover:border-[#5798f5] hover:bg-[#fafcff]"
                    }`}
                >
                    <div
                        className={`mb-[10px] flex h-[44px] w-[44px] items-center justify-center rounded-[12px] transition ${
                            isDragging
                                ? "bg-[#5798f5] text-white"
                                : "bg-[#eaf2ff] text-[#5798f5]"
                        }`}
                    >
                        <UploadIcon />
                    </div>

                    <div
                        className={`text-[15px] font-medium ${
                            isDragging ? "text-[#3f82df]" : "text-[#374151]"
                        }`}
                    >
                        {isDragging ? "Laske fail siia" : "Lohista muusikafail siia"}
                    </div>

                    <div className="mt-[4px] text-[13px] text-[#8a93a3]">
                        või klõpsa faili valimiseks · MP3, WAV, OGG
                    </div>
                </div>

                {/* PLAYER */}

                <section className="w-full rounded-[14px] bg-white p-[22px] shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                    {/* NOW PLAYING */}

                    <div className="mb-[18px] flex items-center justify-between gap-[16px]">
                        <div className="min-w-0">
                            <div className="text-[11px] font-medium uppercase tracking-wide text-[#8490a3]">
                                {playing ? "Esitab" : "Valitud lugu"}
                            </div>

                            <div className="mt-[4px] truncate text-[18px] font-semibold text-[#202633]">
                                {selectedTrack?.name ?? "Lugu pole valitud"}
                            </div>
                        </div>

                        <span
                            className={`shrink-0 rounded-full px-[10px] py-[4px] text-[12px] font-medium ${
                                playing
                                    ? "bg-[#e6f6ec] text-[#1f8a4c]"
                                    : "bg-[#f1f4f8] text-[#7d899d]"
                            }`}
                        >
                            {playing ? "Esitab" : "Peatatud"}
                        </span>
                    </div>

                    {/* PROGRESS */}

                    <div className="flex items-center gap-[12px]">
                        <span className="w-[40px] text-right text-[12px] tabular-nums text-[#7d899d]">
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
                                if (!isLocalPlayer && selectedFile) {
                                    void sendState({
                                        action: "position",
                                        selectedFile,
                                        playing,
                                        position: value,
                                        startedAt: playing ? Date.now() - value * 1000 : null,
                                        baseRevision: lastStateRevision.current,
                                    });
                                }
                            }}
                            disabled={!duration}
                            aria-label="Asukoht"
                            className="min-w-0 flex-1 accent-[#5798f5] disabled:opacity-50"
                        />

                        <span className="w-[40px] text-[12px] tabular-nums text-[#7d899d]">
                            {formatTime(duration)}
                        </span>
                    </div>

                    {/* CONTROLS */}

                    <div className="mt-[18px] flex flex-wrap items-end gap-[16px] border-b border-[#eef1f5] pb-[20px]">
                        <div className="flex items-center gap-[8px]">
                            <button
                                type="button"
                                onClick={startSelectedTrack}
                                disabled={!selectedFile}
                                className="flex h-[40px] items-center gap-[8px] rounded-[8px] bg-[#5798f5] px-[18px] text-[13px] font-medium text-white shadow-[0_1px_3px_rgba(87,152,245,0.35)] transition hover:bg-[#4688e7] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <PlayIcon />
                                Start
                            </button>

                            <button
                                type="button"
                                onClick={paused ? continueTrack : () => stop()}
                                className="flex h-[40px] items-center gap-[8px] rounded-[8px] border border-[#d9dee8] bg-white px-[18px] text-[13px] font-medium text-[#374151] transition hover:border-[#5798f5] hover:text-[#3f82df]"
                            >
                                {paused ? <PlayIcon /> : <StopIcon />}
                                {paused ? "Jätka" : "Stop"}
                            </button>
                        </div>

                        <div>
                            <FieldLabel>Kordus</FieldLabel>

                            <select
                                value={loopMode}
                                onChange={(event) =>
                                    handleLoopChange(
                                        event.target.value as PlayNowLoopMode
                                    )
                                }
                                className="h-[40px] rounded-[8px] border border-[#d9dee8] bg-white px-[12px] text-[13px] text-[#374151] outline-none transition focus:border-[#5798f5] focus:ring-2 focus:ring-[#5798f5]/20"
                            >
                                <option value="off">Ilma korduseta</option>
                                <option value="track">Korda lugu</option>
                                <option value="playlist">Korda esitusloendit</option>
                            </select>
                        </div>

                        <div className="ml-auto min-w-[220px]">
                            <FieldLabel>Helitugevus</FieldLabel>

                            <div className="flex h-[40px] items-center gap-[10px]">
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
                                    className="min-w-0 flex-1 accent-[#5798f5]"
                                />

                                <span className="w-[40px] text-right text-[12px] tabular-nums text-[#647085]">
                                    {volume}%
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* TRACKS */}

                    {loading ? (
                        <p className="m-0 py-[28px] text-[14px] text-[#7d899d]">
                            Laadimine...
                        </p>
                    ) : tracks.length === 0 ? (
                        <p className="m-0 py-[28px] text-center text-[14px] text-[#7d899d]">
                            PlayNow lugusid pole.
                        </p>
                    ) : (
                        <>
                            <div className="mb-[10px] mt-[18px] text-[11px] font-medium uppercase tracking-wide text-[#8490a3]">
                                Esitusloend · {tracks.length}
                            </div>

                            <div className="space-y-[6px]">
                                {tracks.map((track, index) => {
                                    const isSelected = selectedFile === track.fileName;
                                    const isActive = isSelected && playing;

                                    return (
                                        <div
                                            key={track.fileName}
                                            onDragOver={(event) => event.preventDefault()}
                                            onDrop={() => handleTrackDrop(track.fileName)}
                                            className={`flex items-center gap-[12px] rounded-[10px] border px-[12px] py-[8px] transition ${
                                                isSelected
                                                    ? "border-[#5798f5]/60 bg-[#f3f8ff]"
                                                    : "border-[#eef1f5] bg-white hover:bg-[#fafbfd]"
                                            } ${
                                                draggedFile === track.fileName
                                                    ? "opacity-50"
                                                    : ""
                                            }`}
                                        >
                                            <span
                                                draggable
                                                onDragStart={() => setDraggedFile(track.fileName)}
                                                onDragEnd={() => setDraggedFile(null)}
                                                className="flex h-[28px] w-[24px] cursor-grab select-none items-center justify-center text-[#b0b8c6] transition hover:text-[#6d788b] active:cursor-grabbing"
                                                title="Lohista loo muutmiseks"
                                            >
                                                <GripIcon />
                                            </span>

                                            <span className="w-[22px] text-center text-[12px] tabular-nums text-[#9aa3b2]">
                                                {String(index + 1).padStart(2, "0")}
                                            </span>

                                            <button
                                                type="button"
                                                onClick={() => play(track.fileName)}
                                                className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[8px] transition ${
                                                    isActive
                                                        ? "bg-[#5798f5] text-white"
                                                        : "bg-[#eaf2ff] text-[#5798f5] hover:bg-[#dbe9ff]"
                                                }`}
                                                title="Esita"
                                                aria-label="Esita"
                                            >
                                                <PlayIcon />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setSelectedFile(track.fileName)}
                                                className="min-w-0 flex-1 truncate text-left text-[14px] font-medium text-[#1b212d]"
                                            >
                                                {track.name}
                                            </button>

                                            {isActive && (
                                                <span className="rounded-full bg-[#e6f6ec] px-[8px] py-[2px] text-[11px] font-medium text-[#1f8a4c]">
                                                    Esitab
                                                </span>
                                            )}

                                            <button
                                                type="button"
                                                onClick={() => void handleDelete(track)}
                                                className="rounded-[8px] px-[10px] py-[6px] text-[13px] font-medium text-[#8994a6] transition hover:bg-[#fef2f2] hover:text-[#dc2626]"
                                            >
                                                Kustuta
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </section>
            </div>
        </main>
    );
}