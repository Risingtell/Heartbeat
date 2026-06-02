"use client";
import { useEffect, useRef, useState } from "react";

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "Is my seed phrase actually private from you?",
    a: "Yes. Your seed phrase is encrypted in your browser before it leaves your device. The encryption uses threshold cryptography across a network of validator TEEs. The plaintext never touches my server, and even I cannot read what's inside your vault.",
  },
  {
    q: "What happens if I forget to check in?",
    a: "Your inactivity timer keeps running. Once it goes past the window you set, your beneficiary can unlock the vault. If you come back before then, just click 'I'm still here' on the dashboard and the clock resets.",
  },
  {
    q: "Does my beneficiary need a crypto wallet?",
    a: "No. They can sign in with their email or Google account. I create a secure wallet for them automatically and fund it with a little gas, so they only have to click 'unlock' and your secret appears.",
  },
  {
    q: "Can my beneficiary access my vault while I'm alive?",
    a: "No. While you keep checking in, the vault stays locked to everyone, including your beneficiary. The on-chain condition contract refuses every read until your inactivity window passes.",
  },
  {
    q: "Can I change my beneficiary later?",
    a: "Yes. Seal a new vault any time with a different beneficiary, period, or secret. A single heartbeat keeps all of your vaults sealed at once.",
  },
  {
    q: "What if my guardians flag me by mistake?",
    a: "When guardians reach the threshold, a challenge window starts. You can heartbeat during that window to cancel their trigger. After the window passes, your beneficiary can unlock.",
  },
  {
    q: "What if my beneficiary loses their email account?",
    a: "Pick an email account they actively use and will keep. If you also share an alternate wallet address as backup, they can connect that wallet instead of signing in with email. Picking a beneficiary identity that survives 10 to 30 years is a real consideration.",
  },
  {
    q: "Is this on mainnet?",
    a: "Not yet. Heartbeat runs on Story Aeneid testnet. The cryptographic privacy holds by design, but the testnet TEEs are not production hardened. Use a throwaway secret to try the flow, not a seed phrase that secures real funds.",
  },
  {
    q: "Why proof of life instead of just naming heirs in a will?",
    a: "Proof of life means access is automatic. You don't have to trust your heirs not to take it while you're alive (they cannot, the contract refuses), and you don't have to trust anyone to verify your death. If you stop checking in, the math releases the vault. No lawyer, no will, no middleman.",
  },
  {
    q: "How long can the inactivity window be?",
    a: "Anything from a couple of minutes for the demo to a full year for a real product. The window is set per vault, and a single heartbeat resets all your vaults together.",
  },
];

type Msg = { role: "q" | "a"; text: string };

const BTN = 56;
const PANEL_W = 340;
const MARGIN = 12;
const GAP = 10;

function clampX(x: number, w: number) {
  return Math.max(MARGIN, Math.min(w - BTN - MARGIN, x));
}
function clampY(y: number, h: number) {
  return Math.max(MARGIN, Math.min(h - BTN - MARGIN, y));
}

export function FloatingHelp() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const [messages, setMessages] = useState<Msg[]>([]);
  const drag = useRef({ startX: 0, startY: 0, posX: 0, posY: 0, dragging: false, dist: 0 });

  useEffect(() => {
    setMounted(true);
    const w = window.innerWidth;
    const h = window.innerHeight;
    setViewport({ w, h });

    let initial = { x: w - BTN - 24, y: h - BTN - 24 };
    try {
      const saved = localStorage.getItem("heartbeat:help-pos");
      if (saved) {
        const p = JSON.parse(saved);
        if (typeof p?.x === "number" && typeof p?.y === "number") {
          initial = p;
        }
      }
    } catch {}
    // Always clamp on load, in case the saved position is now off-screen.
    setPosition({ x: clampX(initial.x, w), y: clampY(initial.y, h) });

    function onResize() {
      const nw = window.innerWidth;
      const nh = window.innerHeight;
      setViewport({ w: nw, h: nh });
      setPosition((p) => ({ x: clampX(p.x, nw), y: clampY(p.y, nh) }));
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem("heartbeat:help-pos", JSON.stringify(position));
    } catch {}
  }, [position, mounted]);

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y,
      dragging: true,
      dist: 0,
    };
  }
  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!drag.current.dragging) return;
    const dx = e.clientX - drag.current.startX;
    const dy = e.clientY - drag.current.startY;
    drag.current.dist = Math.hypot(dx, dy);
    setPosition({
      x: clampX(drag.current.posX + dx, viewport.w),
      y: clampY(drag.current.posY + dy, viewport.h),
    });
  }
  function onPointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    e.currentTarget.releasePointerCapture(e.pointerId);
    drag.current.dragging = false;
    if (drag.current.dist < 5) {
      setOpen((o) => !o);
    }
  }

  function ask(q: string) {
    const item = FAQ_ITEMS.find((f) => f.q === q);
    if (!item) return;
    setMessages((m) => [...m, { role: "q", text: q }, { role: "a", text: item.a }]);
  }

  if (!mounted) return null;

  // Position the panel independently of the button, so opening it doesn't
  // shift the button around. Right edge of the panel aligns with the right
  // edge of the button by default; clamp inside the viewport.
  const desiredLeft = position.x + BTN - PANEL_W;
  const panelLeft = Math.max(MARGIN, Math.min(viewport.w - PANEL_W - MARGIN, desiredLeft));
  const spaceAbove = position.y - MARGIN;
  const spaceBelow = viewport.h - (position.y + BTN) - MARGIN;
  const above = spaceAbove > 380 || spaceAbove > spaceBelow;
  const panelMaxH = Math.max(260, Math.min(560, above ? spaceAbove - GAP : spaceBelow - GAP));
  const panelTop = above ? position.y - panelMaxH - GAP : position.y + BTN + GAP;

  return (
    <>
      {open && (
        <div
          className="fixed z-50 rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden flex flex-col animate-fade-up"
          style={{
            left: panelLeft,
            top: panelTop,
            width: PANEL_W,
            maxWidth: `calc(100vw - ${MARGIN * 2}px)`,
            maxHeight: panelMaxH,
          }}
        >
          <div className="px-4 py-3 border-b border-border-soft shrink-0">
            <p className="text-[11px] uppercase tracking-[0.16em] text-accent-deep font-medium">Help</p>
            <p className="font-semibold text-sm mt-0.5 text-foreground">
              Ask about <span className="font-display italic font-normal text-accent-deep">Heartbeat</span>
            </p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3 text-sm bg-background">
            {messages.length === 0 ? (
              <p className="text-muted text-xs leading-relaxed">
                Tap a question below to start. You can drag the help button anywhere on the screen.
              </p>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={m.role === "q" ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={`max-w-[88%] rounded-2xl px-3 py-2 leading-relaxed ${
                      m.role === "q"
                        ? "bg-accent text-white"
                        : "bg-surface text-foreground border border-border-soft"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-2.5 py-2 border-t border-border-soft bg-surface max-h-44 overflow-y-auto shrink-0">
            <p className="text-[10px] uppercase tracking-wider text-muted px-2 py-1">Suggested questions</p>
            <div className="space-y-0.5">
              {FAQ_ITEMS.map((item) => (
                <button
                  key={item.q}
                  onClick={() => ask(item.q)}
                  className="block w-full text-left text-xs rounded-lg px-2.5 py-1.5 text-foreground-soft hover:text-foreground hover:bg-surface-2 transition-colors leading-snug"
                >
                  {item.q}
                </button>
              ))}
            </div>
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                className="block w-full text-center text-xs text-muted hover:text-foreground mt-2 py-1 transition-colors"
              >
                Clear conversation
              </button>
            )}
          </div>
        </div>
      )}

      <button
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        aria-label={open ? "Close help" : "Ask a question about Heartbeat"}
        className="fixed z-50 touch-none rounded-full h-14 w-14 bg-accent hover:bg-accent-deep text-white shadow-xl flex items-center justify-center cursor-grab active:cursor-grabbing transition-colors select-none"
        style={{ left: position.x, top: position.y }}
      >
        <span className="text-2xl leading-none">{open ? "×" : "?"}</span>
      </button>
    </>
  );
}
