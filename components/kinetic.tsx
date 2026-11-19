// a headline whose words rise into place one after another; read aloud as one sentence
export function Headline({ text, alt, className = "hero-title" }: { text: string; alt?: string; className?: string }) {
  const line = (words: string, accent: boolean, from: number) =>
    words.split(" ").map((word, i) => (
      <span key={`${accent}${i}`}>
        <span className="word">
          <span className={`word-in ${accent ? "alt" : ""}`} style={{ animationDelay: `${0.25 + (from + i) * 0.06}s` }}>
            {word}
          </span>
        </span>{" "}
      </span>
    ));
  return (
    <h1 aria-label={[text, alt].filter(Boolean).join(" ")} className={`words ${className}`}>
      <span aria-hidden>
        {line(text, false, 0)}
        {alt && (
          <>
            <br />
            {line(alt, true, text.split(" ").length)}
          </>
        )}
      </span>
    </h1>
  );
}
