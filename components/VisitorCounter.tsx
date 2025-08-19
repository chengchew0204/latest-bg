"use client";

import { useEffect, useState } from "react";

export default function VisitorCounter() {
  const [pv, setPv] = useState<number | null>(null);
  const [uv, setUv] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/pv")
      .then(async (r) => (r.ok ? r.json() : Promise.reject(await r.text())))
      .then((d) => {
        if (!cancelled) {
          setPv(d.pv);
          setUv(d.uv);
        }
      })
      .catch((e) => !cancelled && setErr(typeof e === "string" ? e : "fetch failed"));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      // 當滾動到頁面底部附近時顯示計數器
      const threshold = 70; // 距離底部100px時開始顯示
      setIsVisible(scrollTop + windowHeight >= documentHeight - threshold);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // 初始檢查

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const box: React.CSSProperties = {
    position: "fixed",
    right: 16,
    bottom: 16,
    zIndex: 9999,
    fontSize: 12,
    lineHeight: 1.2,
    padding: "8px 10px",
    borderRadius: 12,
    color: "#fff",
    backdropFilter: "blur(6px)",
    opacity: isVisible ? 0.15 : 0,
    transition: "opacity 0.3s ease-in-out",
    pointerEvents: isVisible ? "auto" : "none",
  };

  return (
    <div style={box} aria-live="polite" aria-label="site counter">
      {err ? (
        <span>counter: offline</span>
      ) : (
        <span>
          PV {pv ?? "…"} · UV {uv ?? "…"}
        </span>
      )}
    </div>
  );
}
