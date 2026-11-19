"use client";

import { useEffect, useState } from "react";

let arrived = false;

// a template is made afresh on every move between screens, so the shutter crosses each time.
// the first screen of a visit comes up behind the start-up screen instead, and is not faded in
export default function Template({ children }: { children: React.ReactNode }) {
  const [first] = useState(() => !arrived);
  useEffect(() => {
    arrived = true;
  }, []);

  return (
    <>
      {!first && <span aria-hidden className="shutter" />}
      <div className="page" style={first ? { animation: "none" } : undefined}>
        {children}
      </div>
    </>
  );
}
