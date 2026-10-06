export interface PlayNowTrack {
    fileName: string;
    name: string;
}
import { API_URL } from "../api/apiBase";

export async function getPlayNowTracks(): Promise<PlayNowTrack[]> {
    const response = await fetch(`${API_URL}/api/playnow`);

    if (!response.ok) {
        throw new Error("PlayNow lugemine ebaõnnestus");
    }

    return response.json();
}

export async function uploadPlayNowTrack(
    file: File
): Promise<PlayNowTrack> {
    const formData = new FormData();
    formData.append("track", file);

    const response = await fetch(
        `${API_URL}/api/playnow/upload`,
        {
            method: "POST",
            body: formData,
        }
    );

    if (!response.ok) {
        throw new Error("PlayNow üleslaadimine ebaõnnestus");
    }

    return response.json();
}

export async function deletePlayNowTrack(
    fileName: string
): Promise<void> {
    const response = await fetch(
        `${API_URL}/api/playnow/${encodeURIComponent(fileName)}`,
        { method: "DELETE" }
    );

    if (!response.ok) {
        throw new Error("PlayNow loo kustutamine ebaõnnestus");
    }
}

export function getPlayNowTrackUrl(fileName: string) {
    return `${API_URL}/playnow/${encodeURIComponent(fileName)}`;
}
