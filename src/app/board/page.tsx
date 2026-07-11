import Link from "next/link";
import { auth } from "@/auth";
import { getBoardSnapshot } from "@/app/actions/board";
import { BoardClient } from "./BoardClient";

export const metadata = { title: "The Séance" };
export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const session = await auth();
  const snapshot = await getBoardSnapshot();

  return (
    <section className="section">
      <div className="container">
        <p className="eyebrow">{"// communion // letter-by-letter"}</p>
        <h1 className="section-title">The <em>Séance.</em></h1>
        <p className="lede" style={{ marginBottom: "1.5rem" }}>
          A planchette with many fingers on it. One letter per person per minute.
          When the sentence hits 80 characters it locks, signed by everyone who
          touched it — and then the other side answers. Watch the letters come back.
        </p>

        {!session?.user ? (
          <div className="tile" style={{ minHeight: 0, marginBottom: "1.5rem" }}>
            <span className="tile-glyph" aria-hidden>◇</span>
            <h3 className="tile-title">Hands off.</h3>
            <p className="tile-body">
              The board only takes letters from signed-in degenerates.
            </p>
            <p>
              <Link href="/gate?next=/board" className="btn no-underline">
                Sign in
              </Link>
            </p>
          </div>
        ) : null}

        <BoardClient initial={snapshot} canType={!!session?.user} />
      </div>
    </section>
  );
}
