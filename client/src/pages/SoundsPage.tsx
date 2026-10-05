import {
    useEffect,
    useRef,
    useState,
} from "react";

import {
    getSounds,
    uploadSound,
    updateSound,
    deleteSound,
    getSoundUrl,
    type Sound,
} from "../services/soundService";


export default function SoundsPage() {

    const [
        sounds,
        setSounds,
    ] = useState<Sound[]>([]);

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        uploading,
        setUploading,
    ] = useState(false);

    const [
        playingId,
        setPlayingId,
    ] = useState<number | null>(null);

    const [
        editingId,
        setEditingId,
    ] = useState<number | null>(null);

    const [
        editingName,
        setEditingName,
    ] = useState("");

    const [
        isDragging,
        setIsDragging,
    ] = useState(false);

    const [uploadError, setUploadError] =
        useState("");

    const fileInputRef =
        useRef<HTMLInputElement | null>(
            null
        );

    const audioRef =
        useRef<HTMLAudioElement | null>(
            null
        );


    // ============================================
    // LOAD SOUNDS
    // ============================================

    useEffect(() => {

        loadSounds();

    }, []);


    async function loadSounds() {

        try {

            setLoading(true);

            const data =
                await getSounds();

            setSounds(data);

        } catch (error) {

            console.error(
                error
            );

        } finally {

            setLoading(false);

        }
    }

    async function openSoundsFolder() {
        if (!window.electronAPI) {
            setUploadError(
                "See funktsioon töötab ainult Windowsi rakenduses."
            );
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


    async function handleFile(
        event: React.ChangeEvent<HTMLInputElement>
    ) {

        const file =
            event.target.files?.[0];

        if (!file) {
            return;
        }

        await uploadSelectedFile(file);

        event.target.value = "";

    }


    // ============================================
    // DRAG & DROP
    // ============================================

    function handleDragOver(
        event: React.DragEvent<HTMLDivElement>
    ) {

        event.preventDefault();

        event.stopPropagation();

        if (!uploading) {
            setIsDragging(true);
        }

    }


    function handleDragEnter(
        event: React.DragEvent<HTMLDivElement>
    ) {

        event.preventDefault();

        event.stopPropagation();

        if (!uploading) {
            setIsDragging(true);
        }

    }


    function handleDragLeave(
        event: React.DragEvent<HTMLDivElement>
    ) {

        event.preventDefault();

        event.stopPropagation();

        setIsDragging(false);

    }


    async function handleDrop(
        event: React.DragEvent<HTMLDivElement>
    ) {

        event.preventDefault();

        event.stopPropagation();

        setIsDragging(false);


        if (uploading) {
            return;
        }


        const files =
            event.dataTransfer.files;


        if (
            !files ||
            files.length === 0
        ) {
            return;
        }


        const file =
            files[0];


        await uploadSelectedFile(file);

    }


    // ============================================
    // UPLOAD
    // ============================================

    async function uploadSelectedFile(
        file: File
    ) {

        setUploadError("");

        const defaultName =
            file.name.replace(
                /\.[^/.]+$/,
                ""
            );


        try {

            setUploading(true);


            const sound =
                await uploadSound(
                    defaultName || "Koolikell",
                    file
                );


            setSounds(
                (current) => [
                    ...current,
                    sound,
                ]
            );


        } catch (error) {

            console.error(
                error
            );

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

        if (
            audioRef.current
        ) {

            audioRef.current.pause();

            audioRef.current.currentTime =
                0;

            audioRef.current =
                null;

        }


        setPlayingId(null);

    }


    function playSound(
        sound: Sound
    ) {

        stopAudio();


        const audio =
            new Audio(
                getSoundUrl(
                    sound.fileName
                )
            );


        audioRef.current =
            audio;


        setPlayingId(
            sound.id
        );


        audio.onended = () => {

            setPlayingId(null);

            audioRef.current =
                null;

        };


        audio.onerror = () => {

            console.error(
                "Audio playback error"
            );

            setPlayingId(null);

            audioRef.current =
                null;

        };


        void audio.play();

    }


    // ============================================
    // EDIT
    // ============================================

    function startEditing(
        sound: Sound
    ) {

        setEditingId(
            sound.id
        );

        setEditingName(
            sound.name
        );

    }


    function cancelEditing() {

        setEditingId(null);

        setEditingName("");

    }


    async function saveEditing(
        sound: Sound
    ) {

        const name =
            editingName.trim();


        if (!name) {
            return;
        }


        try {

            const updated =
                await updateSound(
                    sound.id,
                    name,
                    sound.fileName
                );


            setSounds(
                (current) =>
                    current.map(
                        (item) =>
                            item.id ===
                            sound.id
                                ? updated
                                : item
                    )
            );


            cancelEditing();

        } catch (error) {

            console.error(
                error
            );

            alert(
                "Heli nime muutmine ebaõnnestus."
            );

        }

    }


    // ============================================
    // DELETE
    // ============================================

    async function handleDelete(
        sound: Sound
    ) {

        const confirmed =
            window.confirm(
                `Kas kustutada heli „${sound.name}“?`
            );


        if (!confirmed) {
            return;
        }


        stopAudio();


        try {

            await deleteSound(
                sound.id
            );


            setSounds(
                (current) =>
                    current.filter(
                        (item) =>
                            item.id !==
                            sound.id
                    )
            );

        } catch (error) {

            console.error(
                error
            );

            alert(
                "Heli kustutamine ebaõnnestus."
            );

        }

    }


    // ============================================
    // UI
    // ============================================

    return (

        <div
            className="
                ml-[240px]
                box-border
                w-[calc(100%_-_240px)]
                min-h-screen
                bg-[#f6f7fb]
                px-[clamp(24px,4vw,64px)]
                py-[40px]
                font-['Inter']
            "
        >

            {/* ================================= */}
            {/* HEADER */}
            {/* ================================= */}

            <div
                className="
                    mb-[30px]
                    flex
                    items-start
                    justify-between
                    gap-[24px]
                    w-full
                    max-w-[1040px]
                "
            >

                <h1
                    className="
                        text-[28px]
                        font-semibold
                        text-[#1f2937]
                    "
                >
                    Helid
                </h1>


                <p
                    className="
                        mt-[6px]
                        text-[14px]
                        text-[#7b8494]
                    "
                >
                    Koolikellade helide
                    haldamine
                </p>

                <button
                    type="button"
                    onClick={() => void openSoundsFolder()}
                    className="rounded-[9px] border border-[#d9dee8] bg-white px-[14px] py-[10px] text-[13px] font-medium text-[#374151] transition hover:border-[#529eff] hover:text-[#438fea]"
                >
                    Ava helide kaust
                </button>

            </div>


            {/* ================================= */}
            {/* DROP ZONE */}
            {/* ================================= */}

            <div
                onDragOver={
                    handleDragOver
                }

                onDragEnter={
                    handleDragEnter
                }

                onDragLeave={
                    handleDragLeave
                }

                onDrop={
                    handleDrop
                }

                onClick={
                    openFilePicker
                }

                className={`
                    mb-[28px]
                    flex
                    min-h-[170px]
                    w-full
                    max-w-[1040px]
                    box-border
                    cursor-pointer
                    flex-col
                    items-center
                    justify-center
                    rounded-[16px]
                    border-2
                    border-dashed
                    transition-all
                    duration-200

                    ${
                        isDragging
                            ? `
                                border-[#2563eb]
                                bg-[#eff6ff]
                                scale-[1.01]
                              `
                            : `
                                border-[#d9dee8]
                                bg-white
                                hover:border-[#9ca3af]
                                hover:bg-[#fafbfc]
                              `
                    }

                    ${
                        uploading
                            ? `
                                pointer-events-none
                                opacity-60
                              `
                            : ""
                    }
                `}
            >

                <div
                    className="
                        mb-[12px]
                        flex
                        h-[52px]
                        w-[52px]
                        items-center
                        justify-center
                        rounded-[14px]
                        bg-[#eef2ff]
                        text-[25px]
                    "
                >
                    🔊
                </div>


                {uploading ? (

                    <>

                        <div
                            className="
                                text-[15px]
                                font-medium
                                text-[#374151]
                            "
                        >
                            Laadimine...
                        </div>

                        <div
                            className="
                                mt-[5px]
                                text-[13px]
                                text-[#8a93a3]
                            "
                        >
                            Palun oodake
                        </div>

                    </>

                ) : isDragging ? (

                    <>

                        <div
                            className="
                                text-[16px]
                                font-semibold
                                text-[#2563eb]
                            "
                        >
                            Laske fail siin lahti
                        </div>

                        <div
                            className="
                                mt-[5px]
                                text-[13px]
                                text-[#64748b]
                            "
                        >
                            Fail laaditakse
                                SchoolBelli üles
                        </div>

                    </>

                ) : (

                    <>

                        <div
                            className="
                                text-[15px]
                                font-medium
                                text-[#374151]
                            "
                        >
                            Lohistage helifail siia
                        </div>


                        <div
                            className="
                                mt-[5px]
                                text-[13px]
                                text-[#8a93a3]
                            "
                        >
                            või klõpsake faili
                            valimiseks
                        </div>


                        <div
                            className="
                                mt-[8px]
                                text-[12px]
                                text-[#a0a7b4]
                            "
                        >
                            MP3, WAV, OGG
                        </div>

                    </>

                )}

            </div>


            {/* ================================= */}
            {/* HIDDEN FILE INPUT */}
            {/* ================================= */}

            {uploadError && (
                <div className="mb-[20px] w-full max-w-[1040px] rounded-[10px] border border-[#f3b4b4] bg-[#fff5f5] px-[16px] py-[12px] text-[14px] text-[#b42318]">
                    {uploadError}
                </div>
            )}

            <input
                ref={
                    fileInputRef
                }

                type="file"

                accept="audio/*,.mp3,.wav,.ogg"

                className="
                    hidden
                "

                onChange={
                    handleFile
                }
            />


            {/* ================================= */}
            {/* SOUNDS */}
            {/* ================================= */}

            {loading ? (

                <div
                    className="
                        rounded-[14px]
                        bg-white
                        p-[30px]
                        text-[14px]
                        text-[#7b8494]
                    "
                >
                    Laadimine...
                </div>

            ) : sounds.length === 0 ? (

                <div
                    className="
                        rounded-[14px]
                        bg-white
                        p-[50px]
                        text-center
                    "
                >

                    <div
                        className="
                            mb-[10px]
                            text-[40px]
                        "
                    >
                        🔊
                    </div>


                    <div
                        className="
                            text-[16px]
                            font-medium
                            text-[#374151]
                        "
                    >
                        Helisid veel pole
                    </div>


                    <div
                        className="
                            mt-[6px]
                            text-[14px]
                            text-[#7b8494]
                        "
                    >
                        Lohistage esimene
                        helifail ülalolevasse alasse
                    </div>

                </div>

            ) : (

                <div
                    className="
                        w-full
                        max-w-[1040px]
                        space-y-[12px]
                    "
                >

                    {sounds.map(
                        (sound) => (

                            <div
                                key={
                                    sound.id
                                }

                                className="
                                    flex
                                    items-center
                                    rounded-[14px]
                                    bg-white
                                    px-[20px]
                                    py-[16px]
                                    shadow-sm
                                "
                            >

                                {/* ICON */}

                                <div
                                    className="
                                        mr-[16px]
                                        flex
                                        h-[44px]
                                        w-[44px]
                                        shrink-0
                                        items-center
                                        justify-center
                                        rounded-[10px]
                                        bg-[#eef2ff]
                                        text-[20px]
                                    "
                                >
                                    🔊
                                </div>


                                {/* NAME */}

                                <div
                                    className="
                                        min-w-0
                                        flex-1
                                    "
                                >

                                    {editingId ===
                                    sound.id ? (

                                        <input
                                            autoFocus

                                            value={
                                                editingName
                                            }

                                            onChange={
                                                (event) =>
                                                    setEditingName(
                                                        event.target.value
                                                    )
                                            }

                                            onKeyDown={
                                                (event) => {

                                                    if (
                                                        event.key ===
                                                        "Enter"
                                                    ) {

                                                        void saveEditing(
                                                            sound
                                                        );

                                                    }


                                                    if (
                                                        event.key ===
                                                        "Escape"
                                                    ) {

                                                        cancelEditing();

                                                    }

                                                }
                                            }

                                            className="
                                                w-full
                                                rounded-[7px]
                                                border
                                                border-[#d9dee8]
                                                px-[10px]
                                                py-[7px]
                                                text-[14px]
                                                outline-none
                                                focus:border-[#2563eb]
                                            "
                                        />

                                    ) : (

                                        <>

                                            <div
                                                className="
                                                    truncate
                                                    text-[15px]
                                                    font-medium
                                                    text-[#1f2937]
                                                "
                                            >
                                                {
                                                    sound.name
                                                }
                                            </div>


                                            <div
                                                className="
                                                    mt-[3px]
                                                    truncate
                                                    text-[12px]
                                                    text-[#8a93a3]
                                                "
                                            >
                                                {
                                                    sound.fileName
                                                }
                                            </div>

                                        </>

                                    )}

                                </div>


                                {/* ACTIONS */}

                                <div
                                    className="
                                        ml-[20px]
                                        flex
                                        shrink-0
                                        items-center
                                        gap-[8px]
                                    "
                                >

                                    {editingId ===
                                    sound.id ? (

                                        <>

                                            <button
                                                type="button"

                                                onClick={() =>
                                                    void saveEditing(
                                                        sound
                                                    )
                                                }

                                                className="
                                                    rounded-[8px]
                                                    px-[10px]
                                                    py-[7px]
                                                    text-[13px]
                                                    text-[#2563eb]
                                                    hover:bg-[#eff6ff]
                                                "
                                            >
                                                Salvesta
                                            </button>


                                            <button
                                                type="button"

                                                onClick={
                                                    cancelEditing
                                                }

                                                className="
                                                    rounded-[8px]
                                                    px-[10px]
                                                    py-[7px]
                                                    text-[13px]
                                                    text-[#6b7280]
                                                    hover:bg-[#f3f4f6]
                                                "
                                            >
                                                Tühista
                                            </button>

                                        </>

                                    ) : (

                                        <>

                                            {/* PLAY */}

                                            <button
                                                type="button"

                                                onClick={() => {

                                                    if (
                                                        playingId ===
                                                        sound.id
                                                    ) {

                                                        stopAudio();

                                                    } else {

                                                        playSound(
                                                            sound
                                                        );

                                                    }

                                                }}

                                                className="
                                                    flex
                                                    h-[36px]
                                                    w-[36px]
                                                    items-center
                                                    justify-center
                                                    rounded-[8px]
                                                    bg-[#f1f5f9]
                                                    text-[15px]
                                                    hover:bg-[#e2e8f0]
                                                "

                                                title={
                                                    playingId ===
                                                    sound.id
                                                        ? "Peata"
                                                        : "Kuula"
                                                }
                                            >
                                                {
                                                    playingId ===
                                                    sound.id
                                                        ? "■"
                                                        : "▶"
                                                }
                                            </button>


                                            {/* EDIT */}

                                            <button
                                                type="button"

                                                onClick={() =>
                                                    startEditing(
                                                        sound
                                                    )
                                                }

                                                className="
                                                    rounded-[8px]
                                                    px-[10px]
                                                    py-[7px]
                                                    text-[13px]
                                                    text-[#64748b]
                                                    hover:bg-[#f3f4f6]
                                                "
                                            >
                                                Muuda
                                            </button>


                                            {/* DELETE */}

                                            <button
                                                type="button"

                                                onClick={() =>
                                                    void handleDelete(
                                                        sound
                                                    )
                                                }

                                                className="
                                                    rounded-[8px]
                                                    px-[10px]
                                                    py-[7px]
                                                    text-[13px]
                                                    text-[#dc2626]
                                                    hover:bg-[#fef2f2]
                                                "
                                            >
                                                Kustuta
                                            </button>

                                        </>

                                    )}

                                </div>

                            </div>

                        )
                    )}

                </div>

            )}

        </div>

    );
}