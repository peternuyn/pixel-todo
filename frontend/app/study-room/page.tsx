import Chat from "@/components/Chat";
import GroundStrip from "@/components/GroundStrip";
import Header from "@/components/Header";
import NavMenu from "@/components/NavMenu";
import StudyRoom from "@/components/StudyRoom";
import Timer from "@/components/Timer";
import Todo from "@/components/Todo";
import Water from "@/assets/nuoc_troi.svg";
export default function Home() {
  return (
    <main className="relative min-h-screen px-7 pt-5 pb-24 z-[1]" style={{ backgroundImage: `url(${Water.src})` }}>
      <NavMenu />
      <Header />

      <div className="grid gap-3 max-w-[1240px] mx-auto grid-cols-1 lg:[grid-template-columns:minmax(0,2.2fr)_minmax(280px,1fr)]">
        <StudyRoom />

        <aside className="flex flex-col gap-4 w-full">
          <Timer initialSeconds={24 * 60 + 32} />
          <Todo />
          <Chat />
        </aside>
      </div>

      {/* <GroundStrip /> */}
    </main>
  );
}
