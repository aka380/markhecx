"use client";
import { useRef, useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button, Textarea, Badge } from "../ui";
/** Shared approval surface for workspace changes and existing Phase 2 field assistance. */
export function SuggestionReview({
  title,
  reason,
  before,
  value,
  onAccept,
  onReject,
  editable = true,
  allowEmpty = false,
}: {
  title: string;
  reason: string;
  before?: string;
  value: string;
  onAccept?: (value: string) => boolean | void;
  onReject: () => void;
  editable?: boolean;
  allowEmpty?: boolean;
}) {
  const [text, setText] = useState(value),
    [editing, setEditing] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  return (
    <Dialog open onOpenChange={(open) => !open && onReject()}>
      <DialogContent className="mark-dialog">
        <Badge tone="purple">HECX · Suggested change</Badge>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{reason}</DialogDescription>
        {before !== undefined && (
          <details>
            <summary>Data at analysis time</summary>
            <p className="profile-bio small-note">
              {before || "Not provided."}
            </p>
          </details>
        )}
        <label className="field">
          {editing ? "Edit suggestion" : "Suggested content"}
          <Textarea
            ref={input}
            readOnly={!editing}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            maxLength={12000}
          />
        </label>
        <p className="small-note">
          Review for accuracy. Only Accept applies this change. Published
          snapshots are not updated.
        </p>
        <div className="row">
          {onAccept && (
            <>
              <Button
                className="btn-primary"
                disabled={!allowEmpty && !text.trim()}
                onClick={() => onAccept(text.trim())}
              >
                <Check size={15} />
                Accept
              </Button>
              {editable && (
                <Button
                  className="btn-secondary"
                  onClick={() => {
                    setEditing(true);
                    input.current?.focus();
                  }}
                >
                  <Pencil size={15} />
                  Edit
                </Button>
              )}
            </>
          )}
          <Button variant="ghost" onClick={onReject}>
            <X size={15} />
            {onAccept ? "Reject" : "Close"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
