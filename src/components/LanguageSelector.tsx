import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { changeLanguage, getCurrentLanguage } from "@/lib/i18n";
import { Globe } from "lucide-react";

export function LanguageSelector() {
  const { t } = useTranslation();
  const currentLang = getCurrentLanguage();

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Globe className="h-4 w-4" />
        {t('settings.language')}
      </Label>
      <Select value={currentLang} onValueChange={changeLanguage}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="fr">
            <span className="flex items-center gap-2">
              🇫🇷 {t('settings.french')}
            </span>
          </SelectItem>
          <SelectItem value="en">
            <span className="flex items-center gap-2">
              🇬🇧 {t('settings.english')}
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
      <p className="text-sm text-muted-foreground">{t('settings.languageDesc')}</p>
    </div>
  );
}
