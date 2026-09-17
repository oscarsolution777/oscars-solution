"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Recommendation } from "@/lib/ai/provider";

const IMPACT_VARIANT: Record<Recommendation["impact"], "default" | "secondary" | "outline"> = {
  alto: "default",
  medio: "secondary",
  bajo: "outline",
};

export function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  const t = useTranslations("ai.recommendationLabels");

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <CardTitle className="text-sm">{recommendation.title}</CardTitle>
        <Badge variant={IMPACT_VARIANT[recommendation.impact]}>
          {t(`impact.${recommendation.impact}`)}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-text-secondary">
        <p className="font-medium text-text-primary">{t(`area.${recommendation.area}`)}</p>
        <p>{recommendation.reasoning}</p>
        <p className="font-medium text-text-primary">{recommendation.action}</p>
      </CardContent>
    </Card>
  );
}
