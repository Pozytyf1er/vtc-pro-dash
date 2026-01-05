import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { User, Camera, Bell, Save, Loader2 } from "lucide-react";

interface Profile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

interface AlertSettings {
  oil_change_alert_days: number;
  insurance_alert_days: number;
  inspection_alert_days: number;
  license_alert_days: number;
  push_enabled: boolean;
}

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [alertSettings, setAlertSettings] = useState<AlertSettings>({
    oil_change_alert_days: 7,
    insurance_alert_days: 30,
    inspection_alert_days: 30,
    license_alert_days: 30,
    push_enabled: false,
  });
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    // Fetch profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user?.id)
      .maybeSingle();

    if (profileData) {
      setProfile(profileData);
      setFormData({
        first_name: profileData.first_name || "",
        last_name: profileData.last_name || "",
      });
    }

    // Fetch alert settings
    const { data: alertData } = await supabase
      .from("user_alert_settings")
      .select("*")
      .eq("user_id", user?.id)
      .maybeSingle();

    if (alertData) {
      setAlertSettings({
        oil_change_alert_days: alertData.oil_change_alert_days,
        insurance_alert_days: alertData.insurance_alert_days,
        inspection_alert_days: alertData.inspection_alert_days,
        license_alert_days: alertData.license_alert_days,
        push_enabled: alertData.push_enabled,
      });
    }

    setLoading(false);
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      toast({ title: "Erreur", description: "Veuillez sélectionner une image", variant: "destructive" });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Erreur", description: "L'image ne doit pas dépasser 2 Mo", variant: "destructive" });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      setProfile((prev) => (prev ? { ...prev, avatar_url: avatarUrl } : null));
      toast({ title: "Succès", description: "Photo de profil mise à jour" });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({ title: "Erreur", description: "Impossible de télécharger l'image", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: formData.first_name || null,
          last_name: formData.last_name || null,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({ title: "Succès", description: "Profil mis à jour" });
    } catch (error: any) {
      console.error("Save error:", error);
      toast({ title: "Erreur", description: "Impossible de sauvegarder le profil", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAlertSettings = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("user_alert_settings")
        .upsert({
          user_id: user.id,
          ...alertSettings,
        });

      if (error) throw error;

      toast({ title: "Succès", description: "Paramètres d'alertes mis à jour" });
    } catch (error: any) {
      console.error("Save error:", error);
      toast({ title: "Erreur", description: "Impossible de sauvegarder les paramètres", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const requestPushPermission = async () => {
    if (!("Notification" in window)) {
      toast({ title: "Non supporté", description: "Les notifications ne sont pas supportées sur ce navigateur", variant: "destructive" });
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setAlertSettings((prev) => ({ ...prev, push_enabled: true }));
      toast({ title: "Succès", description: "Notifications activées" });
    } else {
      toast({ title: "Refusé", description: "Permission de notification refusée", variant: "destructive" });
    }
  };

  const getInitials = () => {
    const first = formData.first_name?.charAt(0) || "";
    const last = formData.last_name?.charAt(0) || "";
    return (first + last).toUpperCase() || "U";
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Paramètres</h1>
        <p className="text-muted-foreground">Gérez votre profil et vos préférences</p>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informations personnelles
          </CardTitle>
          <CardDescription>Mettez à jour votre profil et photo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                />
              </label>
            </div>
            <div className="space-y-1">
              <p className="font-medium">Photo de profil</p>
              <p className="text-sm text-muted-foreground">
                JPG, PNG ou GIF. Max 2 Mo.
              </p>
            </div>
          </div>

          <Separator />

          {/* Form */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">Prénom</Label>
              <Input
                id="first_name"
                placeholder="Votre prénom"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Nom</Label>
              <Input
                id="last_name"
                placeholder="Votre nom"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email || ""} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">L'email ne peut pas être modifié</p>
          </div>

          <Button onClick={handleSaveProfile} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Enregistrer le profil
          </Button>
        </CardContent>
      </Card>

      {/* Alert Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Paramètres d'alertes
          </CardTitle>
          <CardDescription>Configurez quand recevoir des alertes pour les échéances</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Push notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Notifications push</Label>
              <p className="text-sm text-muted-foreground">
                Recevoir des notifications dans le navigateur
              </p>
            </div>
            <Switch
              checked={alertSettings.push_enabled}
              onCheckedChange={(checked) => {
                if (checked) {
                  requestPushPermission();
                } else {
                  setAlertSettings((prev) => ({ ...prev, push_enabled: false }));
                }
              }}
            />
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="oil_days">Alerte vidange (jours avant)</Label>
              <Input
                id="oil_days"
                type="number"
                min={1}
                max={90}
                value={alertSettings.oil_change_alert_days}
                onChange={(e) =>
                  setAlertSettings({ ...alertSettings, oil_change_alert_days: parseInt(e.target.value) || 7 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="insurance_days">Alerte assurance (jours avant)</Label>
              <Input
                id="insurance_days"
                type="number"
                min={1}
                max={90}
                value={alertSettings.insurance_alert_days}
                onChange={(e) =>
                  setAlertSettings({ ...alertSettings, insurance_alert_days: parseInt(e.target.value) || 30 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inspection_days">Alerte contrôle technique (jours avant)</Label>
              <Input
                id="inspection_days"
                type="number"
                min={1}
                max={90}
                value={alertSettings.inspection_alert_days}
                onChange={(e) =>
                  setAlertSettings({ ...alertSettings, inspection_alert_days: parseInt(e.target.value) || 30 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="license_days">Alerte permis (jours avant)</Label>
              <Input
                id="license_days"
                type="number"
                min={1}
                max={90}
                value={alertSettings.license_alert_days}
                onChange={(e) =>
                  setAlertSettings({ ...alertSettings, license_alert_days: parseInt(e.target.value) || 30 })
                }
              />
            </div>
          </div>

          <Button onClick={handleSaveAlertSettings} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Enregistrer les paramètres
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
