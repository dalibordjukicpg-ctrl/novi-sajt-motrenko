"use client";

import { useRouter } from "next/navigation";
import { ImageIcon, Save, X } from "lucide-react";
import { useState, useTransition } from "react";

import { saveChatbotSettingsAction } from "@/app/admin/(authed)/chatbot/actions";
import { AdminMediaPicker } from "@/components/admin/admin-media-picker";
import { CHATBOT_COPY } from "@/lib/chatbot/copy";
import { locales } from "@/lib/i18n";
import type { MediaOption } from "@/lib/queries/media-admin";
import { cn } from "@/lib/utils";

export type ChatbotSettingsFormValues = {
  enabled: boolean;
  botName: string;
  avatarMediaId: string;
  greetingMe: string;
  greetingEn: string;
  greetingRu: string;
  greetingDelaySec: number;
};

export function ChatbotSettingsForm({
  initial,
  media,
}: {
  initial: ChatbotSettingsFormValues;
  media: MediaOption[];
}) {
  const router = useRouter();
  const [avatarId, setAvatarId] = useState(initial.avatarMediaId);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const avatar = media.find((m) => m.id === avatarId) ?? null;

  const greetings = { me: initial.greetingMe, en: initial.greetingEn, ru: initial.greetingRu };

  const submit = (formData: FormData) => {
    setMessage(null);
    startTransition(async () => {
      const res = await saveChatbotSettingsAction(formData);
      setMessage(res.ok ? { ok: true, text: "Sačuvano." } : { ok: false, text: res.error ?? "Greška." });
      router.refresh();
    });
  };

  const field =
    "w-full rounded-lg border border-[#e9dccb] bg-white px-3 py-2 text-sm text-[#2a2118] outline-none focus:border-[#e8682a]";

  return (
    <form action={submit} className="space-y-6">
      <input type="hidden" name="avatarMediaId" value={avatarId} />

      <section className="space-y-4 rounded-2xl border border-[#e9dccb] bg-white p-6 shadow-sm">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="enabled" value="1" defaultChecked={initial.enabled} />
          <span className="font-semibold text-[#2a2118]">Bot je uključen na sajtu</span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-semibold text-[#5c4f44]">Ime bota</span>
            <input name="botName" defaultValue={initial.botName} maxLength={80} className={field} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-semibold text-[#5c4f44]">Balončić iskače poslije (sekundi)</span>
            <input
              name="greetingDelaySec"
              type="number"
              min={0}
              max={60}
              defaultValue={initial.greetingDelaySec}
              className={field}
            />
          </label>
        </div>

        <div className="space-y-2 text-sm">
          <span className="font-semibold text-[#5c4f44]">Slika bota (avatar)</span>
          <div className="flex items-center gap-3">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar.url} alt="" className="size-16 rounded-full border border-[#e9dccb] object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/zygobot/zygobot-avatar.webp" alt="" className="size-16 rounded-full" />
            )}
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#e9dccb] bg-white px-3 py-2 text-xs font-semibold text-[#5c4f44] transition hover:bg-[#fdf9f3]"
            >
              <ImageIcon size={14} />
              Izaberi iz galerije
            </button>
            {avatarId ? (
              <button
                type="button"
                onClick={() => setAvatarId("")}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs text-red-600 transition hover:bg-red-50"
              >
                <X size={14} />
                Ukloni
              </button>
            ) : null}
          </div>
          <p className="text-xs text-[#8a7b6e]">
            Bez izabrane slike bot koristi ZygoBot avatar (prikazan lijevo). Druga slika: najbolje kvadratna.
          </p>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-[#e9dccb] bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#5c4f44]">Pozdrav u balončiću</h2>
          <p className="mt-1 text-xs text-[#8a7b6e]">Prazno = podrazumijevani tekst (prikazan sivo).</p>
        </div>
        {locales.map((l) => (
          <label key={l} className="block space-y-1 text-sm">
            <span className="font-semibold text-[#5c4f44]">{l.toUpperCase()}</span>
            <textarea
              name={`greeting_${l}`}
              defaultValue={greetings[l]}
              placeholder={CHATBOT_COPY[l].greeting}
              rows={2}
              maxLength={2000}
              className={field}
            />
          </label>
        ))}
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#e8682a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#d45a1f] disabled:opacity-50"
        >
          <Save size={15} />
          {pending ? "Čuvam…" : "Sačuvaj"}
        </button>
        {message ? (
          <span className={cn("text-sm", message.ok ? "text-emerald-700" : "text-red-600")}>{message.text}</span>
        ) : null}
      </div>

      <AdminMediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(item) => {
          setAvatarId(item.id);
          setPickerOpen(false);
        }}
        mediaOptions={media}
        imagesOnly
        title="Slika bota"
      />
    </form>
  );
}
