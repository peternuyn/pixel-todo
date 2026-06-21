import Chat from "@/components/Chat";
import Header from "@/components/Header";
import NavMenu from "@/components/NavMenu";
import RoomCelebration from "@/components/RoomCelebration";
import StudyRoom from "@/components/StudyRoom";
import Timer from "@/components/Timer";
import Todo from "@/components/Todo";
// In the Next.js App Router, a page receives the URL's query string via the
// `searchParams` prop. In Next 16 it's a Promise, so we await it. We read
// ?room=<roomId> here and hand it to the Todo panel's Room tab.
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ room?: string }>;
}) {
  const { room } = await searchParams;

  return (
    <main className="relative min-h-screen px-7 pt-5 pb-24 z-[1]" style={{ backgroundColor: "#aee7bc" }}>
      <NavMenu />
      <RoomCelebration roomId={room ?? null} />
      <Header />

      <div className="grid gap-3 items-start max-w-[1240px] mx-auto grid-cols-1 lg:[grid-template-columns:minmax(0,2.2fr)_minmax(280px,1fr)]">
        <StudyRoom roomId={room ?? null} />

        <aside className="flex flex-col gap-4 w-full">
          <Timer roomId={room ?? null} />
          <Todo roomId={room ?? null} />
          <Chat roomId={room ?? null} />
        </aside>
      </div>
    </main>
  );
}
