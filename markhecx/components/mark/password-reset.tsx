"use client";
import { useState } from "react";
import { api } from "@/lib/mark/api/client";
import { Button, Input } from "./ui";
export function PasswordReset({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<"email" | "otp" | "password" | "done">(
    "email",
  );
  const [email, setEmail] = useState(""),
    [otp, setOTP] = useState(""),
    [token, setToken] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  async function request(resend = false) {
    const r = await api<{ message: string }>(
      `/auth/${resend ? "resend-reset-otp" : "forgot-password"}`,
      { method: "POST", quiet: true, body: { email } },
    );
    setMessage(r.message);
    setStep("otp");
  }
  return (
    <form
      className="form-grid"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setError("");
        try {
          if (step === "email") await request();
          else if (step === "otp") {
            const r = await api<{ resetToken: string }>(
              "/auth/verify-reset-otp",
              { method: "POST", quiet: true, body: { email, otp } },
            );
            setToken(r.resetToken);
            setOTP("");
            setMessage("");
            setStep("password");
          } else if (step === "password") {
            if (password !== confirm) throw Error("Passwords must match.");
            await api("/auth/reset-password", {
              method: "POST",
              quiet: true,
              body: { resetToken: token, password },
            });
            setToken("");
            setPassword("");
            setConfirm("");
            setStep("done");
          }
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3>Reset your password</h3>
      {step === "email" && (
        <label className="field">
          Account email
          <Input
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
      )}
      {step === "otp" && (
        <>
          <label className="field">
            Six-digit email code
            <Input
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={otp}
              onChange={(e) => setOTP(e.target.value)}
            />
          </label>
          <p className="small-note">
            The code expires after 10 minutes. Check your inbox and spam folder.
          </p>
          <Button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await request(true);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Resend code
          </Button>
        </>
      )}
      {step === "password" && (
        <>
          {[
            ["New password", password, setPassword],
            ["Confirm password", confirm, setConfirm],
          ].map(([label, value, setter]) => (
            <label className="field" key={String(label)}>
              {String(label)}
              <Input
                required
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                value={String(value)}
                onChange={(e) =>
                  (setter as (v: string) => void)(e.target.value)
                }
              />
            </label>
          ))}
          <p className="small-note">
            Use at least 12 characters. Existing sessions will be signed out.
          </p>
        </>
      )}
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
      {step === "done" ? (
        <p role="status">Password changed. Sign in with your new password.</p>
      ) : (
        <Button type="submit" className="btn-primary" disabled={busy}>
          {busy
            ? "Please wait…"
            : step === "email"
              ? "Send code"
              : step === "otp"
                ? "Verify code"
                : "Change password"}
        </Button>
      )}
      <Button type="button" disabled={busy} onClick={onBack}>
        Back to sign in
      </Button>
    </form>
  );
}
