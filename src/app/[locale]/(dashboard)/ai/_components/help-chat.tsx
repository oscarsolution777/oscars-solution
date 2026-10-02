"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendHelpChatMessageAction } from "../actions";

type ChatMessage = { role: "user" | "assistant"; content: string };

// Puntos 3/5 del bloque de ajustes: asistente de ayuda sobre el
// funcionamiento del sistema, separado del chat de datos reales (AiChat).
// A diferencia de ese chat, este no persiste nada en Supabase -- el
// historial vive solo en este estado de React y se manda completo en cada
// mensaje (sendHelpChatMessageAction no lee ni escribe ai_chat_messages),
// así que al recargar la página el historial se pierde (aceptable: es una
// consulta puntual de "cómo se hace tal cosa", no una conversación que
// haga falta retomar días después).
export function HelpChat({ locale }: { locale: string }) {
  const t = useTranslations("ai.help");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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

    const nextHistory = messages;
    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setIsSending(true);

    const result = await sendHelpChatMessageAction(text, nextHistory, locale);
    setIsSending(false);

    if (result.ok) {
      setMessages((prev) => [...prev, { role: "assistant", content: result.data }]);
    } else {
      const message =
        result.error === "ai.chat.errors.invalidInput"
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
