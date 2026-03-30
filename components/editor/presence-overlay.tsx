"use client";

import { useEffect, useMemo, useState } from "react";
import type { RefObject } from "react";

import type { DocumentPresenceRecord } from "@/lib/documents";

const COLORS = ["#ef4444", "#f97316", "#22c55e", "#14b8a6", "#3b82f6", "#8b5cf6"];

function getSessionId(documentId: string) {
  const key = `flight-docs-presence:${documentId}`;
  const existing = window.sessionStorage.getItem(key);

  if (existing) {
    return existing;
  }

  const next = `${documentId}-${crypto.randomUUID()}`;
  window.sessionStorage.setItem(key, next);
  return next;
}

export function PresenceOverlay({
  canEdit,
  currentUserId,
  documentId,
  label,
  previewRef,
}: {
  canEdit: boolean;
  currentUserId: string | null;
  documentId: string;
  label: string;
  previewRef: RefObject<HTMLDivElement | null>;
}) {
  const [presences, setPresences] = useState<DocumentPresenceRecord[]>([]);
  const sessionId = useMemo(
    () => (typeof window === "undefined" ? null : getSessionId(documentId)),
    [documentId],
  );
  const color = useMemo(
    () =>
      currentUserId
        ? COLORS[
            Array.from(currentUserId).reduce((total, char) => total + char.charCodeAt(0), 0) %
              COLORS.length
          ]
        : COLORS[0],
    [currentUserId],
  );

  useEffect(() => {
    if (!canEdit || !currentUserId || !sessionId) {
      return;
    }

    const publishPresence = async () => {
      const root = previewRef.current?.querySelector("[contenteditable='true']");
      const selection = window.getSelection();
      const rootRect = previewRef.current?.getBoundingClientRect();

      let cursorX: number | null = null;
      let cursorY: number | null = null;

      if (
        selection &&
        selection.rangeCount > 0 &&
        root &&
        root.contains(selection.anchorNode) &&
        rootRect
      ) {
        const rect = selection.getRangeAt(0).getBoundingClientRect();
        cursorX = rect.left - rootRect.left;
        cursorY = rect.top - rootRect.top;
      }

      await fetch(`/api/documents/${documentId}/presence`, {
        body: JSON.stringify({
          color,
          cursorX,
          cursorY,
          label,
          sessionId,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
    };

    const loadPresence = async () => {
      const response = await fetch(
        `/api/documents/${documentId}/presence?sessionId=${encodeURIComponent(sessionId)}`,
        {
          cache: "no-store",
        },
      );

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as {
        presences?: DocumentPresenceRecord[];
      };

      setPresences(payload.presences ?? []);
    };

    void publishPresence();
    void loadPresence();

    const publishInterval = window.setInterval(() => {
      void publishPresence();
    }, 2000);
    const loadInterval = window.setInterval(() => {
      void loadPresence();
    }, 2500);

    const clear = () => {
      void fetch(`/api/documents/${documentId}/presence`, {
        body: JSON.stringify({ sessionId }),
        headers: {
          "Content-Type": "application/json",
        },
        keepalive: true,
        method: "DELETE",
      });
    };

    window.addEventListener("beforeunload", clear);

    return () => {
      window.clearInterval(publishInterval);
      window.clearInterval(loadInterval);
      window.removeEventListener("beforeunload", clear);
      void fetch(`/api/documents/${documentId}/presence`, {
        body: JSON.stringify({ sessionId }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "DELETE",
      });
    };
  }, [canEdit, color, currentUserId, documentId, label, previewRef, sessionId]);

  if (!canEdit || !presences.length) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {presences.map((presence) =>
        presence.cursorX !== null && presence.cursorY !== null ? (
          <div
            className="absolute"
            key={presence.sessionId}
            style={{
              left: presence.cursorX,
              top: presence.cursorY,
            }}
          >
            <div
              className="h-5 w-0.5"
              style={{ backgroundColor: presence.color }}
            />
            <div
              className="mt-1 inline-flex rounded-full px-2 py-1 text-[11px] font-semibold text-white shadow-sm"
              style={{ backgroundColor: presence.color }}
            >
              {presence.label}
            </div>
          </div>
        ) : null,
      )}
    </div>
  );
}
