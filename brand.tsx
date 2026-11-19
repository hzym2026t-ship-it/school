"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Logo from /public/logo.png (the authority's official logo, added by the
 * platform owner). Falls back to a plain mark if the file isn't there.
 */
export function Logo({ size = 40, className = "" }: { size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    // The image may have failed before React attached onError.
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);
  if (failed) {
    return (
      <span
        className={`flex shrink-0 items-center justify-center rounded-xl bg-brand font-bold text-white ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.45 }}
      >
        ت
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src="/logo.png"
      alt="شعار هيئة تقويم التعليم والتدريب"
      height={size}
      onError={() => setFailed(true)}
      className={`shrink-0 object-contain ${className}`}
      style={{ height: size, width: "auto" }}
    />
  );
}

/** Live date (Hijri + Gregorian) and time. */
export function LiveClock({ className = "" }: { className?: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return <div className={`h-12 ${className}`} />;
  const time = now.toLocaleTimeString("ar-SA-u-nu-arab", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const day = now.toLocaleDateString("ar-SA-u-ca-gregory", { weekday: "long" });
  const greg = now.toLocaleDateString("ar-SA-u-ca-gregory", { day: "numeric", month: "long", year: "numeric" });
  const hijri = now.toLocaleDateString("ar-SA-u-ca-islamic-umalqura", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className={`text-end leading-snug ${className}`}>
      <div className="text-2xl font-bold tabular-nums sm:text-3xl">{time}</div>
      <div className="text-sm opacity-90">{day} · {hijri}</div>
      <div className="text-xs opacity-75">{greg}</div>
    </div>
  );
}
