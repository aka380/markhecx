"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="gate">
      <h1>Something didn’t load.</h1>
      <p>
        Your local drafts are still on this browser. Try loading the page again.
      </p>
      <button className="text-link" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
