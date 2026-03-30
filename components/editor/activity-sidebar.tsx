"use client";

import { useEffect, useState, useTransition } from "react";
import { History, MessageSquare, RotateCcw } from "lucide-react";

import type {
  DocumentCommentRecord,
  DocumentVersionRecord,
} from "@/lib/documents";
import { cn, formatRelativeTime } from "@/lib/utils";

type Tab = "comments" | "history";

export function ActivitySidebar({
  canEdit,
  documentId,
}: {
  canEdit: boolean;
  documentId: string;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("comments");
  const [comments, setComments] = useState<DocumentCommentRecord[]>([]);
  const [versions, setVersions] = useState<DocumentVersionRecord[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const [commentsResponse, versionsResponse] = await Promise.all([
        fetch(`/api/documents/${documentId}/comments`, { cache: "no-store" }),
        fetch(`/api/documents/${documentId}/versions`, { cache: "no-store" }),
      ]);

      if (cancelled) {
        return;
      }

      const commentsPayload = (await commentsResponse.json()) as {
        comments?: DocumentCommentRecord[];
      };
      const versionsPayload = (await versionsResponse.json()) as {
        versions?: DocumentVersionRecord[];
      };

      setComments(commentsPayload.comments ?? []);
      setVersions(versionsPayload.versions ?? []);
    };

    void load();
    const interval = window.setInterval(() => {
      void load();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [documentId]);

  return (
    <aside className="editor-sidebar flex h-full min-h-0 flex-col border-l border-slate-200 bg-white/80">
      <div className="shrink-0 border-b border-slate-200 px-4 py-4">
        <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
          <button
            className={cn(
              "rounded-full px-3 py-2 text-sm font-medium transition",
              activeTab === "comments"
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-500 hover:text-slate-950",
            )}
            onClick={() => setActiveTab("comments")}
            type="button"
          >
            Comments
          </button>
          <button
            className={cn(
              "rounded-full px-3 py-2 text-sm font-medium transition",
              activeTab === "history"
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-500 hover:text-slate-950",
            )}
            onClick={() => setActiveTab("history")}
            type="button"
          >
            Version History
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {activeTab === "comments" ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-950">
                <MessageSquare className="h-4 w-4" />
                Comments
              </div>
              {canEdit ? (
                <form
                  className="space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!commentBody.trim()) {
                      return;
                    }

                    setError("");
                    startTransition(async () => {
                      const response = await fetch(`/api/documents/${documentId}/comments`, {
                        body: JSON.stringify({ body: commentBody }),
                        headers: {
                          "Content-Type": "application/json",
                        },
                        method: "POST",
                      });

                      if (!response.ok) {
                        const payload = (await response.json()) as { error?: string };
                        setError(payload.error ?? "Unable to add comment.");
                        return;
                      }

                      const payload = (await response.json()) as {
                        comment: DocumentCommentRecord;
                      };
                      setComments((current) => [payload.comment, ...current]);
                      setCommentBody("");
                    });
                  }}
                >
                  <textarea
                    className="editor-input min-h-28 rounded-2xl py-3"
                    onChange={(event) => setCommentBody(event.target.value)}
                    placeholder="Leave a comment for collaborators..."
                    value={commentBody}
                  />
                  <button className="editor-primary-button w-full" disabled={isPending} type="submit">
                    {isPending ? "Posting..." : "Add comment"}
                  </button>
                </form>
              ) : (
                <p className="text-sm text-slate-500">
                  Comments are read-only in public view.
                </p>
              )}
              {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
            </div>

            {comments.length ? (
              comments.map((comment) => (
                <div
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  key={comment.id}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-950">{comment.author.name}</p>
                      <p className="text-xs text-slate-500">{comment.author.email}</p>
                    </div>
                    <span className="text-xs text-slate-400">
                      {formatRelativeTime(comment.createdAt)}
                    </span>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {comment.body}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                No comments yet.
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <History className="h-4 w-4" />
                Snapshots
              </div>
              <p className="mt-2 text-sm text-slate-500">
                A new version is stored as the document changes over time.
              </p>
            </div>

            {versions.length ? (
              versions.map((version) => (
                <div
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  key={version.id}
                >
                  <p className="font-medium text-slate-950">{version.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatRelativeTime(version.createdAt)}
                  </p>
                  {canEdit ? (
                    <button
                      className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                      onClick={() => {
                        startTransition(async () => {
                          await fetch(
                            `/api/documents/${documentId}/versions/${version.id}/restore`,
                            { method: "POST" },
                          );
                          window.location.reload();
                        });
                      }}
                      type="button"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Restore
                    </button>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                No saved versions yet.
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
