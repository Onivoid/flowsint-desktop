import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { ROUTES } from "@/constants";

export default function About() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8">
      <h1 className="text-4xl font-bold">{t("about.title")}</h1>
      <p className="text-lg text-muted-foreground max-w-2xl text-center">
        {t("about.description")}
      </p>
      <div className="text-sm text-muted-foreground max-w-2xl">
        <h2 className="font-semibold mb-2">{t("about.tech.title")}</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>{t("about.tech.frontend")}</li>
          <li>{t("about.tech.backend")}</li>
          <li>{t("about.tech.ui")}</li>
          <li>{t("about.tech.routing")}</li>
        </ul>
      </div>
      <Link to={ROUTES.HOME}>
        <Button variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("common.back")}
        </Button>
      </Link>
    </div>
  );
}
