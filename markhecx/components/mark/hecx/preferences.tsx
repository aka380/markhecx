"use client";
import { useState } from "react";
import { api, dataChanged } from "@/lib/mark/api/client";
import { useAPIResource } from "../api-resource";
import { useApp } from "../provider";
import { Card, Input, Button } from "../ui";
const fields = [
  ["goal", "Creative goal"],
  ["preferredPlatform", "Preferred platform"],
  ["communicationStyle", "Advice style"],
] as const;
export function HecxPreferences() {
  const { state } = useApp(),
    resource = useAPIResource<{ memories: { key: string; value: string }[] }>(
      state.signedIn ? "/hecx/memory" : null,
    );
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  if (!state.signedIn) return null;
  return (
    <Card className="panel">
      <h2>HECX preferences</h2>
      <p>
        Save only preferences you want included in future analyses. No chat
        history is stored here. Clear a field to forget it.
      </p>
      {resource.loading ? (
        <p>Loading preferences…</p>
      ) : resource.error ? (
        <>
          <p role="alert">{resource.error}</p>
          <Button onClick={resource.retry}>Retry</Button>
        </>
      ) : (
        <form
          key={JSON.stringify(resource.data)}
          className="form-grid"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            setBusy(true);
            setError("");
            setMessage("");
            try {
              for (const [key] of fields) {
                const value = String(form.get(key) || "").trim();
                await api("/hecx/memory/" + key, {
                  method: value ? "PUT" : "DELETE",
                  body: value ? { value } : undefined,
                });
              }
              dataChanged();
              resource.retry();
              setMessage("Preferences saved.");
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {fields.map(([key, label]) => (
            <label className="field" key={key}>
              {label}
              <Input
                name={key}
                maxLength={500}
                defaultValue={
                  resource.data?.memories.find((m) => m.key === key)?.value ||
                  ""
                }
              />
            </label>
          ))}
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save preferences"}
          </Button>
        </form>
      )}
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
    </Card>
  );
}
