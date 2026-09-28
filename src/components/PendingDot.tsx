"use client";

import { useLinkStatus } from "next/link";

/** クリックしたリンクに読み込み中の印を出す。Link の子孫でだけ動く */
export default function PendingDot() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={`ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current align-middle transition-opacity ${
        pending ? "animate-ping opacity-100" : "opacity-0"
      }`}
    />
  );
}
