"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import type { Recommendation } from "@/lib/ai/provider";
import { regenerateAllAction } from "../actions";
import { RecommendationCard } from "./recommendation-card";
import { AiChat } from "./ai-chat";

type ChatMessage = { role: "user" | "assistant"; content: string };

export function AiView({
  analysisText,
  recommendations,
  notConfigured,
  generationFailed,
  locale,
  initialChatMessages,
}: {
  analysisText: string | null;
  recommendations: Recommendation[] | null;
  notConfigured: boolean;
  generationFailed: boolean;
  locale: string;
  initialChatMessages: ChatMessage[];
}) {
  const t = useTranslations("ai");
  const [analysis, setAnalysis] = useState(analysisText);
  const [recs, setRecs] = useState(recommendations);
  const [failed, setFailed] = useState(generationFailed);
  const [limitError, setLimitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (notConfigured) {
    return (
      <EmptyState title={t("notConfiguredTitle")} description={t("notConfiguredBody")} />
    );
  }

  const handleRegenerate = () => {
    setFailed(false);
    setLimitError(null);
    startTransition(async () => {
      const result = await regenerateAllAction(locale);
      if (result.ok) {
        setAnalysis(result.data.analysisText);
        setRecs(result.data.recommendations);
      } else if (result.error === "ai.errors.regenerateLimitReached") {
        setLimitError(t("errors.regenerateLimitReached"));
      } else {
        setFailed(true);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">{t("title")}</h1>
          <p className="text-sm text-text-secondary">{t("subtitle")}</p>
        </div>
        <Button onClick={handleRegenerate} disabled={isPending} variant="outline">
          {isPending ? t("regenerating") : t("regenerateButton")}
        </Button>
      </div>

      {failed && (
        <p role="alert" className="text-xs text-danger">
          {t("errors.providerFailed")}
        </p>
      )}
      {limitError && (
        <p role="alert" className="text-xs text-danger">
          {limitError}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("analysisTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {analysis ? (
            <p className="whitespace-pre-line text-sm text-text-primary">{analysis}</p>
          ) : (
            <EmptyState title={t("emptyAnalysis")} />
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-text-primary">{t("recommendationsTitle")}</h2>
        {recs && recs.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {recs.map((rec, index) => (
              <RecommendationCard key={index} recommendation={rec} />
            ))}
          </div>
        ) : (
          <EmptyState title={t("emptyRecommendations")} />
        )}
      </div>

      <AiChat initialMessages={initialChatMessages} locale={locale} />
    </div>
  );
}
