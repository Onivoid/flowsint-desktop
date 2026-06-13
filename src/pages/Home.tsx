import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ROUTES } from "@/constants";

export default function Home() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8">
      <h1 className="text-4xl font-bold">{t("home.title")}</h1>
      <p className="text-lg text-muted-foreground max-w-2xl text-center">
        {t("home.subtitle")}
      </p>
      <p className="text-sm text-muted-foreground max-w-2xl text-center">
        {t("home.description")}
      </p>
      <div className="flex gap-4">
        <Link to={ROUTES.ABOUT}>
          <Button variant="outline">{t("nav.about")}</Button>
        </Link>
        <Link to={ROUTES.SETTINGS}>
          <Button variant="outline">{t("nav.settings")}</Button>
        </Link>
        <Link to={ROUTES.EXAMPLES}>
          <Button>{t("home.viewExamples")}</Button>
        </Link>
      </div>
    </div>
  );
}
