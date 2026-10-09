import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { API_ORIGIN } from "../services/apiConfig";

export default function PrivateMedia({ as: Tag = "img", src, open = false, ...props }) {
    const { token } = useContext(AuthContext) || {};
    let uploadPath;
    try {
        const url = new URL(src || "", API_ORIGIN);
        if (url.pathname.startsWith("/uploads/")) uploadPath = url.pathname;
    } catch { /* Invalid media URLs render through the browser's normal error handling. */ }
    const privateUpload = Boolean(uploadPath);
    const asset = privateUpload ? `${API_ORIGIN}${uploadPath}` : src;
    const [requested, setRequested] = useState(false);
    const [loaded, setLoaded] = useState(null);
    const [error, setError] = useState(false);
    const shouldLoad = Tag !== "video" || requested;

    useEffect(() => {
        if (!privateUpload || !token || !shouldLoad) return;
        const controller = new AbortController();
        let objectUrl;
        setError(false);
        fetch(asset, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
            cache: "no-store",
        }).then(async response => {
            if (!response.ok) throw new Error("Unable to load media");
            const blob = await response.blob();
            if (controller.signal.aborted) return;
            objectUrl = URL.createObjectURL(blob);
            setLoaded({ asset, token, url: objectUrl });
        }).catch(() => { if (!controller.signal.aborted) setError(true); });
        return () => {
            controller.abort();
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [asset, privateUpload, token, shouldLoad]);

    if (privateUpload && !token) return null;
    const visibleSrc = privateUpload ? (loaded?.asset === asset && loaded?.token === token ? loaded.url : null) : src;
    if (privateUpload && !visibleSrc) {
        if (error) return <p role="alert">Unable to load media. Reload the page to retry.</p>;
        // shortcut: private videos download on demand as blobs; use authenticated streaming for large video libraries.
        if (Tag === "video" && !requested) return <button type="button" style={props.style} onClick={() => setRequested(true)}>Load video</button>;
        return <span role="status">Loading media…</span>;
    }
    const media = <Tag {...props} src={visibleSrc} />;
    return open ? <a href={visibleSrc} target="_blank" rel="noreferrer">{media}</a> : media;
}
