"use client";

import { useEffect, useState } from "react";

function is169(w: number, h: number) {
  const ratio = h / w;
  return ratio >= 0.4 && ratio <= 1;
}

export function AspectRatioGuard({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState(true);

  useEffect(() => {
    function check() {
      setOk(is169(window.innerWidth, window.innerHeight));
    }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!ok) {
    return (
      <div className="bg-background text-destructive flex h-screen w-screen items-center justify-center p-8">
        <p className="text-center text-6xl font-semibold leading-tight">
          Unsupported screen size.
          <br />
          Please use a 16:9 landscape TV.
        </p>
      </div>
    );
  }

  return children;
}
