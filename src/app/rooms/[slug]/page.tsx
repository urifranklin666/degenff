import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getRoomBySlug, listRooms, recentMessages } from "@/lib/rooms";
import RoomsClient from "./RoomsClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: `#${slug} — the rooms` };
}

export default async function RoomPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  const { slug } = await params;

  // proxy.ts gates /rooms already; this is the belt-and-braces layer
  if (!session?.user?.id) {
    return (
      <section className="section">
        <div className="container" style={{ maxWidth: "72ch" }}>
          <p className="eyebrow">{"// the rooms"}</p>
          <h1 className="section-title">Residents Only.</h1>
          <div className="tile" style={{ minHeight: 0 }}>
            <span className="tile-glyph" aria-hidden>◇</span>
            <h3 className="tile-title">The rooms take letters from signed-in degenerates.</h3>
            <p className="tile-body">
              <a href={`/api/auth/signin?callbackUrl=/rooms/${slug}`}>Sign in</a> and the door opens.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const role = session.user.role;
  const isMod = role === "mod" || role === "admin";
  const room = await getRoomBySlug(slug);
  if (!room || (room.modOnly && !isMod)) notFound();

  const [roomList, history] = await Promise.all([
    listRooms({ includeModOnly: isMod }),
    recentMessages(room.id),
  ]);

  return (
    <section className="section" style={{ borderBottom: "none" }}>
      <div className="container">
        <p className="eyebrow">{"// the rooms // our floorboards // nobody can evict us"}</p>
        <h1 className="section-title">
          #{room.slug} {room.topic && <em style={{ fontSize: "0.5em" }}>{room.topic}</em>}
        </h1>

        <div className="rooms-shell">
          <aside className="rooms-side" aria-label="Rooms">
            <h2 className="rooms-side-title">rooms</h2>
            {roomList.map((r) => (
              <Link
                key={r.id}
                href={`/rooms/${r.slug}`}
                className={`rooms-side-link no-underline${r.id === room.id ? " is-active" : ""}`}
              >
                <span>#{r.slug}</span>
                {r.modOnly && <span className="rooms-side-lock" aria-label="mods only">◆</span>}
              </Link>
            ))}
            <p className="rooms-side-note">
              framed on the R630. more rooms as the concrete pours.
            </p>
          </aside>

          <RoomsClient
            room={{ id: room.id, slug: room.slug, topic: room.topic }}
            initial={history}
            meId={session.user.id}
          />
        </div>
      </div>
    </section>
  );
}
