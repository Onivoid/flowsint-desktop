import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home } from "lucide-react";
import { ROUTES } from "@/constants";

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8">
      <h1 className="text-6xl font-bold">{t("notFound.title")}</h1>
      <h2 className="text-2xl font-semibold">{t("notFound.subtitle")}</h2>
      <p className="text-muted-foreground">
        {t("notFound.description")}
      </p>
      <Link to={ROUTES.HOME}>
        <Button>
          <Home className="mr-2 h-4 w-4" />
          {t("notFound.backHome")}
        </Button>
      </Link>
    </div>
  );
}
