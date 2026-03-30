"use client";

import { useState, useEffect } from "react";

const PROXY = "https://api.allorigins.win/raw?url=";

interface LazyThumbnailProps {
  videoId: string;
  authorId: string;
  alt: string;
  duration: number;
}

export default function LazyThumbnail({
  videoId,
  authorId,
  alt,
  duration,
}: LazyThumbnailProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!videoId || !authorId) return;

    const tikTokUrl = `https://www.tiktok.com/@${authorId}/video/${videoId}`;
    const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(tikTokUrl)}`;
    const proxied = `${PROXY}${encodeURIComponent(apiUrl)}`;

    let cancelled = false;
    fetch(proxied)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const url = data?.data?.cover || data?.data?.origin_cover;
        if (url) setSrc(url);
        else setFailed(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [videoId, authorId]);

  // Loading skeleton
  if (!src && !failed) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 pulse"
        style={{ background: "linear-gradient(135deg, #1a1d2e 0%, #252840 100%)" }}
      >
        <div className="w-8 h-8 rounded-full" style={{ background: "var(--border)" }} />
        <div className="w-16 h-1.5 rounded" style={{ background: "var(--border)" }} />
      </div>
    );
  }

  // Failed — show placeholder
  if (failed || !src) {
    return (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #1a1d2e, #252840)" }}
      >
        <span className="text-2xl opacity-40">🎬</span>
      </div>
    );
  }

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="object-cover w-full h-full"
        onError={() => setFailed(true)}
      />
      {duration > 0 && (
        <span
          className="absolute bottom-2 right-2 text-xs px-1.5 py-0.5 rounded"
          style={{ background: "rgba(0,0,0,0.75)", color: "var(--text-primary)" }}
        >
          {duration}s
        </span>
      )}
    </>
  );
}
