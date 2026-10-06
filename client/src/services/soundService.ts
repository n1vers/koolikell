export interface Sound {
    id: number;
    name: string;
    fileName: string;
    createdAt: string;
}
import { API_URL } from "../api/apiBase";

export async function getSounds(): Promise<Sound[]> {
    const response = await fetch(
        `${API_URL}/api/sounds`
    );

    if (!response.ok) {
        throw new Error(
            "Helide laadimine ebaõnnestus"
        );
    }

    return response.json();
}

export async function uploadSound(
    name: string,
    file: File
): Promise<Sound> {

    const formData =
        new FormData();

    formData.append(
        "name",
        name
    );

    formData.append(
        "sound",
        file
    );

    const response = await fetch(
        `${API_URL}/api/sounds/upload`,
        {
            method: "POST",
            body: formData,
        }
    );

    if (!response.ok) {
        let message = "Heli üleslaadimine ebaõnnestus";

        try {
            const errorData = await response.json() as {
                error?: string;
            };

            if (errorData.error) {
                message = errorData.error;
            }
        } catch {
            // The server may return a non-JSON error response.
        }

        throw new Error(
            message
        );
    }

    return response.json();
}

export async function updateSound(
    id: number,
    name: string,
    fileName: string
): Promise<Sound> {

    const response = await fetch(
        `${API_URL}/api/sounds/${id}`,
        {
            method: "PUT",

            headers: {
                "Content-Type":
                    "application/json",
            },

            body: JSON.stringify({
                name,
                fileName,
            }),
        }
    );

    if (!response.ok) {
        throw new Error(
            "Heli muutmine ebaõnnestus"
        );
    }

    return response.json();
}

export async function deleteSound(
    id: number
): Promise<void> {

    const response = await fetch(
        `${API_URL}/api/sounds/${id}`,
        {
            method: "DELETE",
        }
    );

    if (!response.ok) {
        throw new Error(
            "Heli kustutamine ebaõnnestus"
        );
    }
}

export function getSoundUrl(
    fileName: string
): string {

    return `${API_URL}/sounds/${encodeURIComponent(
        fileName
    )}`;
}