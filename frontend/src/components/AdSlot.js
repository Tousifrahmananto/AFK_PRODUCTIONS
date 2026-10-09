import PrivateMedia from "./PrivateMedia";
import React, { useEffect, useState } from "react";
import { getPlacement, clickAd } from "../services/adService";

export default function AdSlot({ category = "Homepage", game = "", tournament = "" }) {
    const [ads, setAds] = useState([]);

    useEffect(() => {
        (async () => {
            try {
                const data = await getPlacement({ category, game, tournament });
                setAds(Array.isArray(data) ? data : []);
            } catch { setAds([]); }
        })();
    }, [category, game, tournament]);

    if (!ads.length) return null;
    const ad = ads[0];

    return (
        <div style={{ background: "#151922", border: "1px solid #232838", borderRadius: 12, padding: 10 }}>
            <div style={{ fontSize: 12, opacity: .7, marginBottom: 6 }}>{ad.category} Ad</div>
            {ad.imageUrl ? (
                <PrivateMedia
                    src={ad.imageUrl}
                    alt={ad.title}
                    style={{ width: "100%", borderRadius: 8, cursor: "pointer" }}
                    onClick={() => { clickAd(ad._id); if (ad.linkUrl) window.open(ad.linkUrl, "_blank"); }}
                />
            ) : (
                <div
                    onClick={() => { clickAd(ad._id); if (ad.linkUrl) window.open(ad.linkUrl, "_blank"); }}
                    style={{ cursor: "pointer" }}>{ad.title}</div>
            )}
        </div>
    );
}
