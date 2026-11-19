import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-16">
      <h1 className="text-3xl font-semibold tracking-tight">That page isn’t here.</h1>
      <p className="mt-3 text-muted">The address may be mistyped, or the city isn’t one of the twenty covered.</p>
      <Link href="/" className="mt-6 inline-block font-medium underline underline-offset-4">
        Back to all cities
      </Link>
    </div>
  );
}
