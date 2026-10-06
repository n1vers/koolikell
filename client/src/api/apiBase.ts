export const API_URL =
    window.location.protocol === "file:"
        ? "http://localhost:3000"
        : window.location.origin;
