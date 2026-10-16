"use client";

import { Bell, MessageCircle, Send, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { CHATBOT_COPY } from "@/lib/chatbot/copy";
import type { BotReply } from "@/lib/chatbot/answer";
import type { PublicChatbotConfig } from "@/lib/chatbot/settings";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: number;
  from: "bot" | "user";
  text: string;
  title?: string | null;
  links?: BotReply["links"];
  suggestions?: string[];
  offerHandoff?: boolean;
};

const SEEN_KEY = "hrc-chatbot-seen";
const GREETING_KEY = "hrc-chatbot-greeting-closed";

/** ZygoBot avatar (public/zygobot) — dok klinika u adminu ne izabere drugu sliku. */
const DEFAULT_AVATAR = "/zygobot/zygobot-avatar.webp";

function readFlag(key: string): boolean {
  try {
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeFlag(key: string): void {
  try {
    sessionStorage.setItem(key, "1");
  } catch {
    /* privatni prozor — bez pamćenja */
  }
}

function BotAvatar({ url, size = 40, className }: { url: string | null; size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url || DEFAULT_AVATAR}
      alt=""
      width={size}
      height={size}
      className={cn("shrink-0 rounded-full bg-[#fff5ed] object-cover", className)}
      style={{ width: size, height: size }}
    />
  );
}

/** „ZYGO BOT” kao u logotipu (debelo + tanko); drugo ime iz admina ide običnim slovima. */
function BotName({ name }: { name: string }) {
  const m = name.trim().match(/^(zygo)\s*(bot)$/i);
  if (!m) return <span className="font-bold text-[#d95200]">{name}</span>;
  return (
    <span className="tracking-[0.06em]">
      <span className="font-extrabold text-[#d95200]">ZYGO</span>
      <span className="font-light text-[#ff9233]">BOT</span>
    </span>
  );
}

export function ChatbotWidget({ locale, config }: { locale: Locale; config: PublicChatbotConfig }) {
  const copy = CHATBOT_COPY[locale];
  const [open, setOpen] = useState(false);
  const [greetingVisible, setGreetingVisible] = useState(false);
  const [unread, setUnread] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 0, from: "bot", text: copy.welcome },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const nextId = useRef(1);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const openedOnce = useRef(false);

  // Balončić sa pozdravom iskače poslije par sekundi (jednom po posjeti, dok ga posjetilac ne zatvori).
  useEffect(() => {
    if (readFlag(SEEN_KEY)) return;
    setUnread(true);
    if (readFlag(GREETING_KEY)) return;
    const t = window.setTimeout(() => setGreetingVisible(true), config.greetingDelaySec * 1000);
    return () => window.clearTimeout(t);
  }, [config.greetingDelaySec]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy, handoffOpen]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const openChat = useCallback(() => {
    setOpen(true);
    setGreetingVisible(false);
    setUnread(false);
    writeFlag(SEEN_KEY);
    if (!openedOnce.current) {
      openedOnce.current = true;
      void fetch("/api/chatbot/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, event: "open" }),
      }).catch(() => undefined);
    }
    window.setTimeout(() => inputRef.current?.focus(), 50);
  }, [locale]);

  const closeGreeting = () => {
    setGreetingVisible(false);
    writeFlag(GREETING_KEY);
  };

  const push = (m: Omit<ChatMessage, "id">) =>
    setMessages((prev) => [...prev, { ...m, id: nextId.current++ }]);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    setInput("");
    setHandoffOpen(false);
    push({ from: "user", text: q });
    setBusy(true);
    try {
      const res = await fetch("/api/chatbot/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, q }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; reply?: BotReply } | null;
      if (!res.ok || !data?.ok || !data.reply) throw new Error(String(res.status));
      const r = data.reply;
      push({
        from: "bot",
        text: r.text,
        title: r.title,
        links: r.links,
        suggestions: r.suggestions,
        offerHandoff: r.offerHandoff,
      });
    } catch {
      push({ from: "bot", text: copy.error, offerHandoff: true });
    } finally {
      setBusy(false);
    }
  };

  const lastBotId = [...messages].reverse().find((m) => m.from === "bot")?.id;

  return (
    <div className="fixed z-[180] flex flex-col items-end gap-3 right-[max(1rem,calc(env(safe-area-inset-right,0px)+0.25rem))] bottom-[max(1rem,calc(env(safe-area-inset-bottom,0px)+0.5rem))]">
      {open ? (
        <section
          role="dialog"
          aria-label={config.botName}
          className="flex h-[min(600px,calc(100dvh-7.5rem))] w-[calc(100vw-2rem)] max-w-[390px] animate-chat-pop flex-col overflow-hidden rounded-3xl border border-[#f6d9c2] bg-white shadow-[0_24px_60px_-12px_rgba(160,64,0,0.35)]"
        >
          <header className="relative flex items-center gap-3 overflow-hidden bg-gradient-to-br from-[#ff9a3d] via-[#f07a1a] to-[#d95200] px-4 py-3 text-white">
            <span
              className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full bg-white/10 blur-sm"
              aria-hidden
            />
            <BotAvatar url={config.avatarUrl} size={46} className="ring-2 ring-white/80" />
            <div className="relative min-w-0 flex-1">
              <p className="truncate text-[16px] [&_span]:!text-white">
                <BotName name={config.botName} />
              </p>
              <p className="flex items-center gap-1.5 text-xs text-white/85">
                <span className="size-2 rounded-full bg-[#7dffb0] shadow-[0_0_6px_#7dffb0]" aria-hidden />
                {copy.status}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={copy.closeChat}
              className="relative flex size-9 items-center justify-center rounded-full text-white/90 transition hover:bg-white/15"
            >
              <X size={18} />
            </button>
          </header>
          <p className="border-b border-[#fbe6d6] bg-[#fff8f2] px-4 py-2 text-[11px] leading-snug text-[#8a5a3a]">
            {copy.disclaimer}
          </p>

          <div
            ref={listRef}
            className="flex-1 space-y-3 overflow-y-auto bg-[radial-gradient(circle_at_85%_0%,#fff3e8,transparent_55%)] px-4 py-4"
            aria-live="polite"
          >
            {/* Brend blok: ilustracija bez teksta, natpis i podnaslov su pravi tekst (oštar, preveden). */}
            <div className="flex flex-col items-center pb-1 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/zygobot/zygobot-art.webp" alt="" width={166} height={110} className="h-[110px] w-[166px]" />
              <p className="mt-1 font-sans text-[26px] leading-none tracking-[0.08em]">
                <span className="font-extrabold text-[#c94f00]">ZYGO</span>{" "}
                <span className="font-light text-[#e8761f]">BOT</span>
              </p>
              <p className="mt-2 max-w-[260px] text-[10.5px] font-semibold uppercase leading-snug tracking-[0.08em] text-[#803000]">
                {copy.tagline}
              </p>
            </div>
            {messages.map((m) => (
              <div key={m.id} className={cn("flex items-end gap-2", m.from === "user" ? "justify-end" : "justify-start")}>
                {m.from === "bot" ? <BotAvatar url={config.avatarUrl} size={26} className="mb-0.5" /> : null}
                <div
                  className={cn(
                    "max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed",
                    m.from === "user"
                      ? "rounded-br-md bg-gradient-to-br from-[#ff9233] to-[#e0640c] text-white shadow-[0_4px_12px_-4px_rgba(217,82,0,0.5)]"
                      : "rounded-bl-md border border-[#fbe3d0] bg-[#fff6ee] text-[#3a2416]",
                  )}
                >
                  {m.title ? <p className="mb-1 font-semibold text-[#a64200]">{m.title}</p> : null}
                  <p className="whitespace-pre-line">{m.text}</p>
                  {m.links?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.links.map((l) => (
                        <a
                          key={l.href + l.label}
                          href={l.href}
                          target={l.href.startsWith("http") ? "_blank" : undefined}
                          rel={l.href.startsWith("http") ? "noopener noreferrer" : undefined}
                          onClick={() => {
                            if (l.href.includes("#")) setOpen(false);
                          }}
                          className="rounded-full border border-[#f6cfae] bg-white px-3 py-1 text-xs font-semibold text-[#c2510a] transition hover:border-[#ff9233] hover:bg-[#fff1e5]"
                        >
                          {l.label}
                        </a>
                      ))}
                    </div>
                  ) : null}
                  {m.suggestions?.length && m.id === lastBotId ? (
                    <div className="mt-2">
                      <p className="mb-1 text-[11px] text-[#8a5a3a]">{copy.maybeAlso}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {m.suggestions.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => void ask(s)}
                            className="rounded-full bg-white px-3 py-1 text-xs text-[#c2510a] ring-1 ring-[#f6cfae] transition hover:bg-[#fff1e5]"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {m.offerHandoff && m.id === lastBotId && !handoffOpen ? (
                    <button
                      type="button"
                      onClick={() => setHandoffOpen(true)}
                      className="mt-2 rounded-full bg-[#a64200] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[#803000]"
                    >
                      {copy.handoffButton}
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
            {messages.length === 1 ? (
              <div className="flex flex-wrap gap-2 pl-[34px] pt-1">
                {copy.chips.map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => void ask(c.q)}
                    className="rounded-full border border-[#f6cfae] bg-white px-3 py-1.5 text-[13px] font-medium text-[#c2510a] shadow-sm transition hover:border-[#ff9233] hover:bg-[#fff1e5]"
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            ) : null}
            {busy ? (
              <div className="flex items-end gap-2">
                <BotAvatar url={config.avatarUrl} size={26} />
                <span
                  className="flex gap-1 rounded-2xl rounded-bl-md border border-[#fbe3d0] bg-[#fff6ee] px-3.5 py-3"
                  aria-label={copy.thinking}
                >
                  {[0, 150, 300].map((d) => (
                    <span
                      key={d}
                      className="size-1.5 animate-bounce rounded-full bg-[#ff9233]"
                      style={{ animationDelay: `${d}ms` }}
                    />
                  ))}
                </span>
              </div>
            ) : null}
            {handoffOpen ? (
              <HandoffForm
                locale={locale}
                onDone={(text) => {
                  setHandoffOpen(false);
                  if (text) push({ from: "bot", text });
                }}
              />
            ) : null}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void ask(input);
            }}
            className="flex items-center gap-2 border-t border-[#fbe6d6] bg-white px-3 py-3"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={copy.placeholder}
              maxLength={500}
              aria-label={copy.placeholder}
              className="min-w-0 flex-1 rounded-full border border-[#f3d6bf] bg-[#fffaf6] px-4 py-2.5 text-[16px] text-[#3a2416] outline-none transition placeholder:text-[#b58a6c] focus:border-[#ff9233] focus:bg-white focus:ring-2 focus:ring-[#ff9233]/20 md:text-[14px]"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label={copy.send}
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ff9233] to-[#d95200] text-white shadow-[0_4px_12px_-4px_rgba(217,82,0,0.6)] transition hover:brightness-105 disabled:opacity-40"
            >
              <Send size={17} />
            </button>
          </form>
        </section>
      ) : null}

      {!open && greetingVisible ? (
        <div className="relative flex max-w-[300px] animate-chat-pop items-start gap-3 rounded-2xl rounded-br-md border border-[#fbe0cb] bg-white py-3 pl-3 pr-8 shadow-[0_12px_36px_-8px_rgba(160,64,0,0.3)]">
          <button type="button" onClick={openChat} className="flex items-start gap-3 text-left">
            <BotAvatar url={config.avatarUrl} size={44} className="ring-2 ring-[#ffe2c8]" />
            <span className="text-[14px] leading-snug text-[#3a2416]">
              <span className="mb-0.5 block text-[12px]">
                <BotName name={config.botName} />
              </span>
              {config.greeting}
            </span>
          </button>
          <button
            type="button"
            onClick={closeGreeting}
            aria-label={copy.closeGreeting}
            className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full text-[#b58a6c] transition hover:bg-[#fff1e5]"
          >
            <X size={14} />
          </button>
        </div>
      ) : null}

      {!open ? (
        <button
          type="button"
          onClick={() => (greetingVisible ? closeGreeting() : setGreetingVisible(true))}
          aria-label={copy.notifications}
          className="relative flex size-12 items-center justify-center rounded-full bg-white text-[#c2510a] shadow-[0_6px_20px_-4px_rgba(160,64,0,0.3)] ring-1 ring-[#fbe0cb] transition hover:text-[#ff9233]"
        >
          <Bell size={21} strokeWidth={1.8} />
          {unread ? (
            <span className="absolute right-2.5 top-2 size-2.5 rounded-full bg-[#e5484d] ring-2 ring-white" aria-hidden />
          ) : null}
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openChat())}
        aria-label={open ? copy.closeChat : copy.openChat}
        aria-expanded={open}
        className="group relative flex size-[64px] items-center justify-center rounded-full bg-gradient-to-br from-[#ff9a3d] to-[#d95200] p-[3px] shadow-[0_10px_28px_-6px_rgba(217,82,0,0.65)] transition hover:scale-105 active:scale-95"
      >
        {open ? (
          <X size={26} className="text-white" />
        ) : (
          <>
            <BotAvatar url={config.avatarUrl} size={58} />
            <span className="absolute -bottom-0.5 -right-0.5 flex size-6 items-center justify-center rounded-full bg-[#d95200] text-white ring-2 ring-white">
              <MessageCircle size={13} fill="currentColor" strokeWidth={1.5} />
            </span>
          </>
        )}
      </button>
    </div>
  );
}

function HandoffForm({ locale, onDone }: { locale: Locale; onDone: (text: string | null) => void }) {
  const copy = CHATBOT_COPY[locale];
  const [fullName, setFullName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (fullName.trim().length < 2 || contact.trim().length < 5 || message.trim().length < 3 || !consent) {
      setError(copy.handoffInvalid);
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/chatbot/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, fullName, contact, message, consent, website }),
      });
      if (!res.ok) throw new Error(String(res.status));
      onDone(copy.handoffThanks);
    } catch {
      setError(copy.error);
    } finally {
      setSending(false);
    }
  };

  const field =
    "w-full rounded-xl border border-[#f3d6bf] bg-white px-3 py-2 text-[16px] text-[#3a2416] outline-none focus:border-[#ff9233] md:text-[13px]";

  return (
    <div className="space-y-2 rounded-2xl border border-[#f6cfae] bg-[#fff8f2] p-3">
      <p className="text-[13px] font-semibold text-[#a64200]">{copy.handoffTitle}</p>
      <p className="text-xs text-[#8a5a3a]">{copy.handoffIntro}</p>
      <input className={field} placeholder={copy.handoffName} value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={200} aria-label={copy.handoffName} />
      <input className={field} placeholder={copy.handoffContact} value={contact} onChange={(e) => setContact(e.target.value)} maxLength={255} aria-label={copy.handoffContact} />
      <textarea className={cn(field, "min-h-[72px] resize-none")} placeholder={copy.handoffMessage} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1500} aria-label={copy.handoffMessage} />
      <input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} className="hidden" aria-hidden />
      <label className="flex items-start gap-2 text-[11px] leading-snug text-[#6b4a33]">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-[#d95200]" />
        {copy.handoffConsent}
      </label>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={sending}
          onClick={() => void submit()}
          className="rounded-full bg-gradient-to-br from-[#ff9233] to-[#d95200] px-4 py-1.5 text-xs font-semibold text-white transition hover:brightness-105 disabled:opacity-50"
        >
          {copy.handoffSend}
        </button>
        <button
          type="button"
          onClick={() => onDone(null)}
          className="rounded-full px-3 py-1.5 text-xs text-[#8a5a3a] transition hover:bg-[#fff1e5]"
        >
          {copy.handoffCancel}
        </button>
      </div>
    </div>
  );
}
