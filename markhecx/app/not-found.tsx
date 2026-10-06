import Link from "next/link";
export default function NotFound() {
  return (
    <div className="gate">
      <span className="eyebrow">404 · A DIFFERENT PATH</span>
      <h1>This page isn’t here.</h1>
      <p>Head back to your creative space and find your next chapter.</p>
      <Link className="text-link" href="/">
        Back to MarkHECX
      </Link>
    </div>
  );
}
