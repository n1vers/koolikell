import { useEffect, useRef, useState } from "react";

import {
    getSounds,
    uploadSound,
    updateSound,
    deleteSound,
    getSoundUrl,
    type Sound,
} from "../services/soundService";
import { setAudioOutputDevice } from "../services/bellAudio";
import { onAudioDeviceChange } from "../services/audioService";
import {
    getPlayNowState,
    updatePlayNowState,
    type PlayNowPlaybackTarget,
} from "../services/playNowStateService";

// ============================================
// ICONS
// ============================================

function SpeakerIcon({ className = "h-[20px] w-[20px]" }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            <path d="M11 5 6 9H3v6h3l5 4V5Z" />
            <path d="M15.5 8.5a5 5 0 0 1 0 7" />
            <path d="M18.5 5.5a9 9 0 0 1 0 13" />
        </svg>
    );
}

function PlayIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]" aria-hidden="true">
            <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5Z" />
        </svg>
    );
}

function StopIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]" aria-hidden="true">
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
            className="h-[42px] w-[42px]"
            aria-hidden="true"
        >
            <path d="M12 16V4" />
            <path d="m7 9 5-5 5 5" />
            <path d="M5 20h14" />
        </svg>
    );
}

// ============================================
// STYLES
// ============================================

const GHOST_BTN =
    "h-[44px] rounded-[10px] px-[16px] text-[15px] font-medium transition";

const FREE_SOUND_SITES: [string, string][] = [
    ["Freesound", "https://freesound.org/"],
    ["Pixabay", "https://pixabay.com/sound-effects/"],
    ["Mixkit", "https://mixkit.co/free-sound-effects/"],
];

// Куда играет звук (переключатель)
const PLAYBACK_TARGETS: {
    id: PlayNowPlaybackTarget;
    label: string;
    title: string;
}[] = [
    { id: "server", label: "Serveris", title: "Serveris" },
    { id: "remote", label: "Selles arvutis", title: "Selles arvutis (eemalt)" },
];

export default function SoundsPage() {
    const [sounds, setSounds] = useState<Sound[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [playingId, setPlayingId] = useState<number | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editingName, setEditingName] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const [uploadError, setUploadError] = useState("");
    const [playbackTarget, setPlaybackTarget] =
        useState<PlayNowPlaybackTarget>("server");

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const soundsRefreshInFlight = useRef(false);
    const playbackGeneration = useRef(0);
    const soundNameSaveInFlight = useRef(new Set<number>());

    useEffect(() => {
        void loadPlaybackSettings();
    }, []);

    async function loadPlaybackSettings() {
        try {
            const state = await getPlayNowState();
            setPlaybackTarget(state.playbackTarget);
        } catch (error) {
            console.error("Failed to load playback settings:", error);
        }
    }

    function handlePlaybackTargetChange(target: PlayNowPlaybackTarget) {
        setPlaybackTarget(target);
        void updatePlayNowState({
            action: "select",
            playbackTarget: target,
        }).catch((error) => console.error("Failed to save playback target:", error));
    }

    useEffect(() => {
        const unsubscribe = onAudioDeviceChange(() => {
            if (audioRef.current) {
                void setAudioOutputDevice(audioRef.current).catch((error) => {
                    console.error("Failed to switch active sound preview device:", error);
                });
            }
        });
        return unsubscribe;
    }, []);

    // ============================================
    // LOAD SOUNDS
    // ============================================

    useEffect(() => {
        void loadSounds(true);

        const timer = window.setInterval(() => {
            void loadSounds();
        }, 2000);

        return () => window.clearInterval(timer);
    }, []);

    async function loadSounds(initialLoad = false) {
        if (soundsRefreshInFlight.current) {
            return;
        }
        soundsRefreshInFlight.current = true;

        try {
            if (initialLoad) {
                setLoading(true);
            }

            const data = await getSounds();

            setSounds(data);
        } catch (error) {
            console.error(error);
        } finally {
            soundsRefreshInFlight.current = false;
            if (initialLoad) {
                setLoading(false);
            }
        }
    }

    async function openSoundsFolder() {
        if (!window.electronAPI) {
            setUploadError("See funktsioon töötab ainult Windowsi rakenduses.");
            return;
        }

        try {
            await window.electronAPI.openSoundsFolder();
        } catch (error) {
            setUploadError(
                error instanceof Error
                    ? error.message
                    : "Helide kausta avamine ebaõnnestus."
            );
        }
    }

    // ============================================
    // FILE PICKER
    // ============================================

    function openFilePicker() {
        if (uploading) {
            return;
        }

        fileInputRef.current?.click();
    }

    async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        await uploadSelectedFile(file);

        event.target.value = "";
    }

    // ============================================
    // DRAG & DROP
    // ============================================

    function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
        event.preventDefault();
        event.stopPropagation();

        if (!uploading) {
            setIsDragging(true);
        }
    }

    function handleDragEnter(event: React.DragEvent<HTMLDivElement>) {
        event.preventDefault();
        event.stopPropagation();

        if (!uploading) {
            setIsDragging(true);
        }
    }

    function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
        event.preventDefault();
        event.stopPropagation();

        // Не сбрасываем состояние, если курсор просто перешёл на вложенный элемент (убирает мерцание)
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
        event.stopPropagation();

        setIsDragging(false);

        if (uploading) {
            return;
        }

        const files = event.dataTransfer.files;

        if (!files || files.length === 0) {
            return;
        }

        await uploadSelectedFile(files[0]);
    }

    // ============================================
    // UPLOAD
    // ============================================

    async function uploadSelectedFile(file: File) {
        setUploadError("");

        const defaultName = file.name.replace(/\.[^/.]+$/, "");

        try {
            setUploading(true);

            const sound = await uploadSound(defaultName || "Koolikell", file);

            setSounds((current) => [...current, sound]);
        } catch (error) {
            console.error(error);

            setUploadError(
                error instanceof Error
                    ? error.message
                    : "Heli üleslaadimine ebaõnnestus."
            );
        } finally {
            setUploading(false);
        }
    }

    // ============================================
    // AUDIO
    // ============================================

    function stopAudio() {
        playbackGeneration.current += 1;

        if (playbackTarget === "server") {
            void updatePlayNowState({
                action: "preview-stop",
                playing: false,
                previewSoundFile: null,
            }).catch((error) => {
                console.error("Failed to stop server sound preview:", error);
            });
        }

        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current = null;
        }

        setPlayingId(null);
    }

    async function playSound(sound: Sound) {
        stopAudio();
        const generation = ++playbackGeneration.current;

        if (playbackTarget === "server") {
            setPlayingId(sound.id);
            void updatePlayNowState({
                action: "preview",
                previewSoundFile: sound.fileName,
                playing: true,
            }).catch((error) => {
                console.error("Failed to start server sound preview:", error);
                if (generation === playbackGeneration.current) {
                    setPlayingId(null);
                }
            });
            return;
        }

        const audio = new Audio(getSoundUrl(sound.fileName));

        audioRef.current = audio;

        setPlayingId(sound.id);
        try {
            await setAudioOutputDevice(audio);
        } catch (error) {
            console.error("Failed to select audio device:", error);
        }

        audio.onended = () => {
            if (generation !== playbackGeneration.current) {
                return;
            }

            setPlayingId(null);
            audioRef.current = null;
        };

        audio.onerror = () => {
            if (generation !== playbackGeneration.current) {
                return;
            }

            console.error("Audio playback error");

            setPlayingId(null);
            audioRef.current = null;
        };

        void audio.play().catch(() => {
            if (generation === playbackGeneration.current) {
                stopAudio();
            }
        });
    }

    // ============================================
    // EDIT
    // ============================================

    function startEditing(sound: Sound) {
        setEditingId(sound.id);
        setEditingName(sound.name);
    }

    function cancelEditing() {
        setEditingId(null);
        setEditingName("");
    }

    async function saveEditing(sound: Sound) {
        if (soundNameSaveInFlight.current.has(sound.id)) {
            return;
        }

        const name = editingName.trim();

        if (!name) {
            setEditingName(sound.name);
            return;
        }

        if (name === sound.name) {
            cancelEditing();
            return;
        }

        soundNameSaveInFlight.current.add(sound.id);
        try {
            const updated = await updateSound(sound.id, name, sound.fileName);

            setSounds((current) =>
                current.map((item) => (item.id === sound.id ? updated : item))
            );

            cancelEditing();
        } catch (error) {
            console.error(error);

            alert("Heli nime muutmine ebaõnnestus.");
        } finally {
            soundNameSaveInFlight.current.delete(sound.id);
        }
    }

    // ============================================
    // DELETE
    // ============================================

    async function handleDelete(sound: Sound) {
        const confirmed = window.confirm(`Kas kustutada heli „${sound.name}“?`);

        if (!confirmed) {
            return;
        }

        stopAudio();

        try {
            await deleteSound(sound.id);

            setSounds((current) => current.filter((item) => item.id !== sound.id));
        } catch (error) {
            console.error(error);

            alert("Heli kustutamine ebaõnnestus.");
        }
    }

    // ============================================
    // UI
    // ============================================

    return (
        <div className="ml-[240px] box-border min-h-screen w-[calc(100%_-_240px)] bg-[#f5f7fb] px-[clamp(24px,4vw,64px)] py-[40px] font-['Inter']">
            <div className="mx-auto w-full max-w-[1040px]">
                {/* HEADER */}

                <div className="mb-[32px] flex flex-wrap items-end justify-between gap-[24px]">
                    <div>
                        <h1 className="m-0 text-[32px] font-semibold leading-tight text-[#1b212d]">
                            Helid
                        </h1>

                        <p className="m-0 mt-[8px] text-[16px] text-[#5b6678]">
                            Koolikellade helide haldamine
                            {!loading && sounds.length > 0 && ` · ${sounds.length}`}
                        </p>
                    </div>

                    <div className="flex items-end gap-[16px]">
                        {/* PLAYBACK TARGET SWITCH */}

                        <div>
                            <div
                                id="playback-target-label"
                                className="mb-[6px] text-[12px] font-medium uppercase tracking-wide text-[#647085]"
                            >
                                Esitamise koht
                            </div>

                            <div
                                role="radiogroup"
                                aria-labelledby="playback-target-label"
                                className="flex rounded-[12px] border border-[#cfd6e2] bg-white p-[4px]"
                            >
                                {PLAYBACK_TARGETS.map((target) => {
                                    const active = target.id === playbackTarget;

                                    return (
                                        <button
                                            key={target.id}
                                            type="button"
                                            role="radio"
                                            aria-checked={active}
                                            title={target.title}
                                            onClick={() =>
                                                handlePlaybackTargetChange(target.id)
                                            }
                                            className={`h-[40px] rounded-[9px] px-[18px] text-[15px] transition ${
                                                active
                                                    ? "bg-[#5798f5] font-semibold text-white shadow-[0_1px_3px_rgba(87,152,245,0.45)]"
                                                    : "font-medium text-[#5b6678] hover:bg-[#f1f4f8] hover:text-[#1b212d]"
                                            }`}
                                        >
                                            {target.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => void openSoundsFolder()}
                            className="h-[48px] rounded-[10px] border border-[#cfd6e2] bg-white px-[20px] text-[15px] font-medium text-[#1f2937] transition hover:border-[#5798f5] hover:text-[#3f82df]"
                        >
                            Ava helide kaust
                        </button>
                    </div>
                </div>

                {/* ERROR */}

                {uploadError && (
                    <div
                        role="alert"
                        className="mb-[20px] flex items-start justify-between gap-[12px] rounded-[12px] border border-[#f3b4b4] bg-[#fff5f5] px-[18px] py-[14px] text-[16px] text-[#b42318]"
                    >
                        <span>{uploadError}</span>

                        <button
                            type="button"
                            onClick={() => setUploadError("")}
                            className="shrink-0 text-[22px] leading-none text-[#b42318]/70 transition hover:text-[#b42318]"
                            aria-label="Sulge"
                        >
                            ×
                        </button>
                    </div>
                )}

                {/* DROP ZONE */}

                <div
                    role="button"
                    tabIndex={0}
                    aria-disabled={uploading}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={openFilePicker}
                    onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openFilePicker();
                        }
                    }}
                    className={`mb-[32px] box-border flex min-h-[260px] w-full cursor-pointer flex-col items-center justify-center gap-[18px] rounded-[20px] border-2 border-dashed px-[32px] py-[44px] text-center outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#5798f5]/40 ${
                        isDragging
                            ? "border-[#5798f5] bg-[#eef5ff]"
                            : "border-[#c3cbd9] bg-white hover:border-[#5798f5] hover:bg-[#fafcff]"
                    } ${uploading ? "pointer-events-none opacity-60" : ""}`}
                >
                    <div
                        className={`flex h-[84px] w-[84px] shrink-0 items-center justify-center rounded-[22px] transition ${
                            isDragging
                                ? "bg-[#5798f5] text-white"
                                : "bg-[#eaf2ff] text-[#3f82df]"
                        }`}
                    >
                        <UploadIcon />
                    </div>

                    <div className="[&>div:first-child]:text-[24px] [&>div:last-child]:text-[17px]">
                        {uploading ? (
                            <>
                                <div className="text-[18px] font-semibold text-[#1f2937]">
                                    Laadimine...
                                </div>
                                <div className="mt-[4px] text-[15px] text-[#5b6678]">
                                    Palun oodake
                                </div>
                            </>
                        ) : isDragging ? (
                            <>
                                <div className="text-[18px] font-semibold text-[#3f82df]">
                                    Laske fail siin lahti
                                </div>
                                <div className="mt-[4px] text-[15px] text-[#5b6678]">
                                    Fail laaditakse koolikella üles
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="text-[18px] font-semibold text-[#1f2937]">
                                    Lohistage helifail siia
                                </div>
                                <div className="mt-[4px] text-[15px] text-[#5b6678]">
                                    või klõpsake faili valimiseks · MP3, WAV, OGG
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*,.mp3,.wav,.ogg"
                    className="hidden"
                    onChange={handleFile}
                />

                {/* SOUNDS */}

                {loading ? (
                    <div className="rounded-[16px] bg-white p-[32px] text-[16px] text-[#5b6678] shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                        Laadimine...
                    </div>
                ) : sounds.length === 0 ? (
                    <div className="rounded-[16px] bg-white px-[24px] py-[56px] text-center shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                        <div className="mx-auto mb-[14px] flex h-[64px] w-[64px] items-center justify-center rounded-[16px] bg-[#f1f4f8] text-[#7d899d]">
                            <SpeakerIcon className="h-[30px] w-[30px]" />
                        </div>

                        <div className="text-[18px] font-semibold text-[#1f2937]">
                            Helisid veel pole
                        </div>

                        <div className="mt-[8px] text-[16px] text-[#5b6678]">
                            Lohistage esimene helifail ülalolevasse alasse
                        </div>
                    </div>
                ) : (
                    <div className="space-y-[12px]">
                        {sounds.map((sound) => {
                            const isPlaying = playingId === sound.id;
                            const isEditing = editingId === sound.id;

                            return (
                                <div
                                    key={sound.id}
                                    className={`flex min-h-[80px] items-center rounded-[16px] bg-white px-[20px] py-[14px] shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition ${
                                        isPlaying
                                            ? "ring-2 ring-[#5798f5]/60"
                                            : "hover:shadow-[0_2px_10px_rgba(0,0,0,0.07)]"
                                    }`}
                                >
                                    {/* PLAY */}

                                    <button
                                        type="button"
                                        onClick={() =>
                                            isPlaying
                                                ? stopAudio()
                                                : void playSound(sound)
                                        }
                                        className={`mr-[18px] flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[12px] transition ${
                                            isPlaying
                                                ? "bg-[#5798f5] text-white hover:bg-[#4688e7]"
                                                : "bg-[#eaf2ff] text-[#3f82df] hover:bg-[#dbe9ff]"
                                        }`}
                                        title={isPlaying ? "Peata" : "Kuula"}
                                        aria-label={isPlaying ? "Peata" : "Kuula"}
                                    >
                                        {isPlaying ? <StopIcon /> : <PlayIcon />}
                                    </button>

                                    {/* NAME */}

                                    <div className="min-w-0 flex-1">
                                        {isEditing ? (
                                            <input
                                                autoFocus
                                                value={editingName}
                                                onChange={(event) =>
                                                    setEditingName(event.target.value)
                                                }
                                                onKeyDown={(event) => {
                                                    if (event.key === "Enter") {
                                                        void saveEditing(sound);
                                                    }

                                                    if (event.key === "Escape") {
                                                        cancelEditing();
                                                    }
                                                }}
                                                onBlur={(event) => {
                                                    const nextElement =
                                                        event.relatedTarget instanceof HTMLElement
                                                            ? event.relatedTarget
                                                            : null;

                                                    if (
                                                        nextElement?.closest(
                                                            'button[data-edit-action="cancel"], button[data-edit-action="save"]'
                                                        )
                                                    ) {
                                                        return;
                                                    }

                                                    void saveEditing(sound);
                                                }}
                                                className="h-[48px] w-full rounded-[10px] border border-[#c3cbd9] bg-white px-[14px] text-[17px] text-[#1f2937] outline-none transition focus:border-[#5798f5] focus:ring-2 focus:ring-[#5798f5]/25"
                                            />
                                        ) : (
                                            <>
                                                <div className="truncate text-[18px] font-semibold text-[#1b212d]">
                                                    {sound.name}
                                                </div>

                                                <div className="mt-[3px] truncate text-[14px] text-[#647085]">
                                                    {sound.fileName}
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* ACTIONS */}

                                    <div className="ml-[20px] flex shrink-0 items-center gap-[8px]">
                                        {isEditing ? (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => void saveEditing(sound)}
                                                    data-edit-action="save"
                                                    className={`${GHOST_BTN} bg-[#5798f5] text-white hover:bg-[#4688e7]`}
                                                >
                                                    Salvesta
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={cancelEditing}
                                                    data-edit-action="cancel"
                                                    className={`${GHOST_BTN} text-[#4b5563] hover:bg-[#f1f4f8]`}
                                                >
                                                    Tühista
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => startEditing(sound)}
                                                    className={`${GHOST_BTN} text-[#374151] hover:bg-[#f1f4f8]`}
                                                >
                                                    Muuda
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => void handleDelete(sound)}
                                                    className={`${GHOST_BTN} text-[#b42318] hover:bg-[#fef2f2]`}
                                                >
                                                    Kustuta
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* FREE SOUNDS HINT */}

                <p className="m-0 mt-[28px] text-[15px] text-[#5b6678]">
                    Uusi helisid otsid? Tasuta helisid leiab saitidelt:{" "}
                    {FREE_SOUND_SITES.map(([name, url], index) => (
                        <span key={url}>
                            {index > 0 && " · "}
                            <button
                                type="button"
                                onClick={() => {
                                    if (window.electronAPI?.openExternal) {
                                        void window.electronAPI.openExternal(url);
                                    } else {
                                        window.open(url, "_blank", "noopener,noreferrer");
                                    }
                                }}
                                className="border-0 bg-transparent p-0 text-[15px] font-medium text-[#3f82df] underline-offset-[3px] hover:underline"
                            >
                                {name}
                            </button>
                        </span>
                    ))}
                </p>
            </div>
        </div>
    );
}