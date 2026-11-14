"use client";

import * as React from "react";

export type TypedTextProps = {
  strings: string[];
  typeSpeedMs?: number;
  backSpeedMs?: number;
  backDelayMs?: number;
  loop?: boolean;
  showCursor?: boolean;
  cursorChar?: string;
};

export function TypedText({
  strings,
  typeSpeedMs = 45,
  backSpeedMs = 28,
  backDelayMs = 900,
  loop = true,
  showCursor = true,
  cursorChar = "|",
}: TypedTextProps) {
  const [text, setText] = React.useState("");
  const [index, setIndex] = React.useState(0);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [cursorOn, setCursorOn] = React.useState(true);

  const active = strings.length ? strings[Math.min(index, strings.length - 1)] : "";

  React.useEffect(() => {
    if (!showCursor) return;
    const id = window.setInterval(() => setCursorOn((v) => !v), 520);
    return () => window.clearInterval(id);
  }, [showCursor]);

  React.useEffect(() => {
    if (!strings.length) return;

    // Stop when finished and not looping
    if (!loop && index >= strings.length) return;

    const safeIndex = index % strings.length;
    const current = strings[safeIndex] ?? "";

    const tick = window.setTimeout(() => {
      if (!isDeleting) {
        const next = current.slice(0, text.length + 1);
        setText(next);
        if (next === current) {
          window.setTimeout(() => setIsDeleting(true), backDelayMs);
        }
      } else {
        const next = current.slice(0, Math.max(0, text.length - 1));
        setText(next);
        if (next.length === 0) {
          setIsDeleting(false);
          setIndex((v) => v + 1);
        }
      }
    }, isDeleting ? backSpeedMs : typeSpeedMs);

    return () => window.clearTimeout(tick);
  }, [strings, index, isDeleting, text, typeSpeedMs, backSpeedMs, backDelayMs, loop]);

  // If we ever got beyond array and loop is off, freeze on last string
  if (!loop && index >= strings.length) {
    const last = strings[strings.length - 1] ?? "";
    return (
      <span>
        {last}
        {showCursor ? <span style={{ opacity: cursorOn ? 1 : 0 }}>{cursorChar}</span> : null}
      </span>
    );
  }

  return (
    <span>
      {active ? text : ""}
      {showCursor ? <span style={{ opacity: cursorOn ? 1 : 0 }}>{cursorChar}</span> : null}
    </span>
  );
}
