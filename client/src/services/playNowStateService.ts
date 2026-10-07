import { API_URL } from "../api/apiBase";

export type PlayNowLoopMode = "off" | "track" | "playlist";
export interface PlayNowState {
    revision: number;
    action: "play" | "pause" | "stop" | "loop" | "volume" | "select" | "position";
    selectedFile: string | null;
    playing: boolean;
    loopMode: PlayNowLoopMode;
    volume: number;
    position: number;
    startedAt: number | null;
    playlist: string[];
    updatedAt: number;
}

export async function getPlayNowState(): Promise<PlayNowState> {
    const response = await fetch(`${API_URL}/api/playnow/state`);
    if (!response.ok) {
        throw new Error(
            `PlayNow oleku lugemine ebaõnnestus (HTTP ${response.status})`
        );
    }
    return response.json() as Promise<PlayNowState>;
}

export async function updatePlayNowState(
    state: Partial<Omit<PlayNowState, "revision">> & {
        baseRevision?: number;
    }
): Promise<PlayNowState> {
    const response = await fetch(`${API_URL}/api/playnow/state`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
    });
    if (!response.ok) {
        throw new Error("PlayNow oleku salvestamine ebaõnnestus");
    }
    return response.json() as Promise<PlayNowState>;
}
