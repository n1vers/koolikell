export const API_URL =
    window.location.protocol === "file:"
        ? "http://127.0.0.1:3000"
        : window.location.origin;
