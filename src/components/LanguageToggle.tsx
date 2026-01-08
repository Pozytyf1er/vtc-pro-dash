import { Button } from "@/components/ui/button";
import { changeLanguage, getCurrentLanguage } from "@/lib/i18n";

export function LanguageToggle() {
  const currentLang = getCurrentLanguage();

  const toggleLanguage = () => {
    const newLang = currentLang === 'fr' ? 'en' : 'fr';
    changeLanguage(newLang);
    // Force re-render by reloading the page
    window.location.reload();
  };

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={toggleLanguage}
      className="gap-1 text-xs font-medium"
    >
      {currentLang === 'fr' ? '🇬🇧 EN' : '🇫🇷 FR'}
    </Button>
  );
}
