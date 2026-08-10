import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { NewLeagueForm } from "./new-league-form";

export const metadata: Metadata = { title: "Nova Liga" };

export default function NewLeaguePage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Nova Liga"
        description="Crie um novo campeonato. As regras do formato podem ser configuradas depois, na tela Regras."
      />
      <Card>
        <CardContent className="pt-5">
          <NewLeagueForm />
        </CardContent>
      </Card>
    </main>
  );
}
