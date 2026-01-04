import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Download, Smartphone, CheckCircle, Wifi, WifiOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const navigate = useNavigate();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;

    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setInstallPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-primary">
            <Smartphone className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">VTC Manager</CardTitle>
          <CardDescription>
            Installez l'application pour un accès rapide et un fonctionnement hors-ligne
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Online Status */}
          <div className={`flex items-center gap-2 rounded-lg p-3 ${
            isOnline ? 'bg-accent/10 text-accent' : 'bg-warning/10 text-warning'
          }`}>
            {isOnline ? (
              <>
                <Wifi className="h-5 w-5" />
                <span className="text-sm font-medium">Connecté</span>
              </>
            ) : (
              <>
                <WifiOff className="h-5 w-5" />
                <span className="text-sm font-medium">Mode hors-ligne</span>
              </>
            )}
          </div>

          {/* Features List */}
          <div className="space-y-3">
            <h3 className="font-semibold">Fonctionnalités :</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-accent" />
                Accès rapide depuis l'écran d'accueil
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-accent" />
                Fonctionne hors-ligne avec cache des données
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-accent" />
                Synchronisation automatique au retour en ligne
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-accent" />
                Interface optimisée pour mobile
              </li>
            </ul>
          </div>

          {/* Install Button */}
          {isInstalled ? (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-accent">
                <CheckCircle className="h-6 w-6" />
                <span className="font-medium">Application installée !</span>
              </div>
              <Button onClick={() => navigate("/")} className="w-full">
                Ouvrir l'application
              </Button>
            </div>
          ) : installPrompt ? (
            <Button onClick={handleInstall} className="w-full" size="lg">
              <Download className="mr-2 h-5 w-5" />
              Installer l'application
            </Button>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Pour installer l'application :
              </p>
              <div className="space-y-2 text-sm">
                <p className="font-medium">Sur iPhone/iPad :</p>
                <ol className="list-decimal list-inside text-muted-foreground space-y-1">
                  <li>Appuyez sur le bouton Partager</li>
                  <li>Sélectionnez "Sur l'écran d'accueil"</li>
                </ol>
              </div>
              <div className="space-y-2 text-sm">
                <p className="font-medium">Sur Android :</p>
                <ol className="list-decimal list-inside text-muted-foreground space-y-1">
                  <li>Ouvrez le menu du navigateur (⋮)</li>
                  <li>Sélectionnez "Installer l'application"</li>
                </ol>
              </div>
              <Button variant="outline" onClick={() => navigate("/")} className="w-full">
                Continuer vers l'application
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Install;
