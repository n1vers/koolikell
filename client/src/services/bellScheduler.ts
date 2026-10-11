import { playBell, stopBell } from "./bellAudio";
import { writeAppLog } from "./logService";
import { API_URL } from "../api/apiBase";

let timer: ReturnType<typeof setInterval> | null = null;

let lastEventKey = "";
let lastProfileSelectionKey = "";
const SCHEDULER_DISABLED_AT_KEY = "schoolbell-scheduler-disabled-at";
const MISSING_PROFILE_WARNING_KEY = "schoolbell-missing-profile-warning-date";
let schedulerStartedAt = 0;


/**
 * Получает следующее событие звонка
 * с backend.
 */
async function getNextBell() {
    const day = new Date().getDay() || 7;

    const assignmentsResponse = await fetch(
        `${API_URL}/api/settings/profile-assignments`
    );
    if (!assignmentsResponse.ok) {
        throw new Error("Failed to load profile assignments");
    }
    const assignmentsData = (await assignmentsResponse.json()) as {
        profileByDay: Record<string, number | null>;
        profileByDate: Record<string, number | null>;
    };
    const assignments = assignmentsData.profileByDay;
    const date = new Date();
    const dateKey = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
    ].join("-");
    const dateAssignments = assignmentsData.profileByDate;
    const dateProfileId = Number(dateAssignments[dateKey]);
    const weeklyProfileId = Number(assignments[String(day)]);
    const profileId = Number.isInteger(dateProfileId) && dateProfileId > 0
        ? dateProfileId
        : Number.isInteger(weeklyProfileId) && weeklyProfileId > 0
            ? weeklyProfileId
            : null;

    if (profileId === null) {
        if (day > 5) {
            return null;
        }

        if (localStorage.getItem(MISSING_PROFILE_WARNING_KEY) !== dateKey) {
            localStorage.setItem(MISSING_PROFILE_WARNING_KEY, dateKey);
            writeAppLog("warn", `Profiili pole määratud: ${dateKey}`);
        }
        return null;
    }

    localStorage.removeItem(MISSING_PROFILE_WARNING_KEY);

    const profileSelectionKey = `${dateKey}:${profileId}`;
    if (profileSelectionKey !== lastProfileSelectionKey) {
        lastProfileSelectionKey = profileSelectionKey;
        writeAppLog(
            "info",
            `Kasutusel profiil ${profileId}`,
            dateAssignments[dateKey] !== undefined
                ? "Kalendri erand"
                : "Nädala ajakava"
        );
    }
    const response = await fetch(
        `${API_URL}/api/profiles/${profileId}/next-event`
    );

    if (!response.ok) {
        throw new Error(
            "Failed to load next bell"
        );
    }

    return response.json();
}


/**
 * Переводит HH:MM в минуты
 */
function timeToMinutes(
    time: string
): number {

    const [
        hours,
        minutes,
    ] = time
        .split(":")
        .map(Number);

    return (
        hours * 60 +
        minutes
    );
}


/**
 * Проверяет, нужно ли сейчас
 * проиграть звонок.
 */
async function checkBell() {

    try {

        if (!window.electronAPI) {
            return;
        }

        const event =
            await getNextBell();

        if (!event) {
            stopBell();
            return;
        }


        const now =
            new Date();


        const currentDay =
            now.getDay() === 0
                ? 7
                : now.getDay();


        /*
         * Событие должно быть
         * сегодня.
         */

        if (
            event.dayOfWeek !==
            currentDay
        ) {
            return;
        }


        /*
         * Текущее время.
         */

        const currentMinutes =
            now.getHours() * 60 +
            now.getMinutes();


        /*
         * Время события.
         */

        const eventMinutes =
            timeToMinutes(
                event.eventTime
            );


        /*
         * Если сейчас не минута
         * события — ничего не делаем.
         */

        if (
            currentMinutes !==
            eventMinutes
        ) {
            return;
        }


        /*
         * Защита от повторного
         * проигрывания каждую секунду.
         */

        const eventKey =
            [
                event.scheduleId,
                event.eventType,
                event.eventTime,
                now.toDateString(),
            ].join("-");

        const disabledAt = Number(
            localStorage.getItem(SCHEDULER_DISABLED_AT_KEY) ?? "0"
        );
        if (
            disabledAt > 0 &&
            disabledAt < now.getTime() &&
            now.getTime() - disabledAt <= 24 * 60 * 60 * 1000 &&
            schedulerStartedAt > disabledAt
        ) {
            lastEventKey = eventKey;
            localStorage.removeItem(SCHEDULER_DISABLED_AT_KEY);
            writeAppLog(
                "info",
                `Kell jäeti vahele ${event.eventType} ${event.eventTime}`,
                `Automaatika oli sündmuse hetkel välja lülitatud`
            );
            return;
        }


        if (
            lastEventKey ===
            eventKey
        ) {
            return;
        }


        lastEventKey =
            eventKey;

        writeAppLog(
            "info",
            `Kell ${event.eventType} ${event.eventTime}`,
            `Profiil ${event.profileId}`
        );


        console.log(
            "[BELL]",
            event.eventType,
            event.eventTime
        );


        /*
         * Нет звука —
         * ничего не проигрываем.
         */

        if (
            !event.sound ||
            !event.sound.fileName
        ) {

            console.warn(
                "[BELL] No sound assigned"
            );

            return;
        }


        const soundUrl =
            `${API_URL}/sounds/${encodeURIComponent(
                event.sound.fileName
            )}`;


        await playBell(
            soundUrl
        );


    } catch (error) {

        writeAppLog("error", "Scheduler error", error);

    }
}


/**
 * Запускает проверку звонков.
 */
export function startBellScheduler() {

    if (timer !== null) {
        return;
    }

    schedulerStartedAt = Date.now();

    console.log(
        "[BELL] Scheduler started"
    );


    /*
     * Проверяем сразу.
     */

    void checkBell();


    /*
     * Затем каждую секунду.
     */

    timer =
        setInterval(
            () => {
                void checkBell();
            },
            1000
        );
}


/**
 * Останавливает scheduler.
 */
export function stopBellScheduler() {

    if (timer === null) {
        return;
    }

    localStorage.setItem(
        SCHEDULER_DISABLED_AT_KEY,
        String(Date.now())
    );

    clearInterval(timer);

    timer = null;


    console.log(
        "[BELL] Scheduler stopped"
    );
}