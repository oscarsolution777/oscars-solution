"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendChatMessageAction } from "../actions";

type ChatMessage = { role: "user" | "assistant"; content: string };

// Chat libre con datos reales (Fase 10B). Persiste su propio historial en
// ai_chat_messages -- initialMessages es lo que ya cargó page.tsx, esta
// vista solo va agregando turnos nuevos, nunca vuelve a pedir el historial
// completo. Límite real de 20 mensajes/hora aplicado en el servidor
// (CLAUDE.md sección 9); aquí solo se muestra el error si se alcanza.
export function AiChat({ initialMessages, locale }: { initialMessages: ChatMessage[]; locale: string }) {
  const t = useTranslations("ai.chat");
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isSending) return;

    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setIsSending(true);

    const result = await sendChatMessageAction(text, locale);
    setIsSending(false);

    if (result.ok) {
      setMessages((prev) => [...prev, { role: "assistant", content: result.data }]);
    } else {
      const message =
        result.error === "ai.chat.errors.rateLimited"
          ? t("errors.rateLimited")
          : result.error === "ai.chat.errors.invalidInput"
            ? t("errors.invalidInput")
            : t("errors.generic");
      setError(message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <p className="text-sm text-text-secondary">{t("subtitle")}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div ref={scrollRef} className="max-h-96 space-y-3 overflow-y-auto rounded-lg bg-content-bg p-3">
          {messages.length === 0 ? (
            <p className="text-sm text-text-muted">{t("emptyState")}</p>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <p
                  className={`max-w-[85%] whitespace-pre-line rounded-lg px-3 py-2 text-sm ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-text-primary"
                  }`}
                >
                  {message.content}
                </p>
              </div>
            ))
          )}
          {isSending && <p className="text-xs text-text-muted">{t("sending")}</p>}
        </div>

        {error && (
          <p role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("placeholder")}
            disabled={isSending}
            className="min-h-10"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button type="submit" size="icon" disabled={isSending || input.trim().length === 0}>
            <Send size={16} />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
