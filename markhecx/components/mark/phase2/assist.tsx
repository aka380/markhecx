"use client";
import { useState, useRef, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AssistanceAction, Suggestion } from "@/lib/mark/assistance";
import { hecxService } from "@/lib/mark/hecx/service";
import { errorMessage } from "@/lib/mark/hecx/contracts";
import { SuggestionReview } from "../hecx/suggestion-review";
import { Button } from "../ui";
export function HecxAssist({
  action,
  source,
  onApply,
}: {
  action: AssistanceAction;
  source: string;
  onApply?: (text: string) => boolean | void;
}) {
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const base = useRef("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function analyze() {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    base.current = source;
    setBusy(true);
    setError("");
    try {
      const result = await hecxService.suggest(action, source, request.signal);
      if (!request.signal.aborted) setSuggestion(result);
    } catch (e) {
      if (!request.signal.aborted) setError(errorMessage(e));
    } finally {
      if (!request.signal.aborted) setBusy(false);
    }
  }
  return (
    <>
      <Button
        type="button"
        className="ai-action"
        variant="outline"
        disabled={busy}
        onClick={analyze}
      >
        <Sparkles size={15} />
        {busy ? "HECX is reviewing…" : action}
      </Button>
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      {suggestion && (
        <SuggestionReview
          key={suggestion.text + suggestion.reason}
          title={action}
          reason={suggestion.reason}
          before={source}
          value={suggestion.text || "HECX needs more information."}
          onReject={() => setSuggestion(null)}
          onAccept={
            suggestion.applicable && onApply
              ? (text) => {
                  if (source !== base.current) {
                    toast.error(
                      "The source changed. Close this suggestion and analyze again.",
                    );
                    return false;
                  }
                  if (onApply(text) === false) return false;
                  toast.success("Suggestion applied to your draft.");
                  setSuggestion(null);
                }
              : undefined
          }
        />
      )}
    </>
  );
}
