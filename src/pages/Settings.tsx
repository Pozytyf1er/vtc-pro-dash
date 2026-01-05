import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Camera, Bell, Save, Loader2, Globe } from "lucide-react";

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
  const { language, setLanguage, t } = useLanguage();
  const { isSupported, permission, requestPermission } = usePushNotifications();
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
        oil_change_alert_days: alertData.oil_change_alert_days ?? 7,
        insurance_alert_days: alertData.insurance_alert_days ?? 30,
        inspection_alert_days: alertData.inspection_alert_days ?? 30,
        license_alert_days: alertData.license_alert_days ?? 30,
        push_enabled: alertData.push_enabled ?? false,
      });
    }

    setLoading(false);
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      toast({ title: t("common.error"), description: "Veuillez sélectionner une image", variant: "destructive" });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: t("common.error"), description: "L'image ne doit pas dépasser 2 Mo", variant: "destructive" });
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
      toast({ title: t("common.success"), description: t("settings.profileUpdated") });
    } catch (error: unknown) {
      console.error("Upload error:", error);
      toast({ title: t("common.error"), description: "Impossible de télécharger l'image", variant: "destructive" });
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

      toast({ title: t("common.success"), description: t("settings.profileUpdated") });
    } catch (error: unknown) {
      console.error("Save error:", error);
      toast({ title: t("common.error"), description: "Impossible de sauvegarder le profil", variant: "destructive" });
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

      toast({ title: t("common.success"), description: t("settings.settingsUpdated") });
    } catch (error: unknown) {
      console.error("Save error:", error);
      toast({ title: t("common.error"), description: "Impossible de sauvegarder les paramètres", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handlePushToggle = async (checked: boolean) => {
    if (checked) {
      if (!isSupported) {
        toast({ 
          title: t("common.error"), 
          description: t("settings.notificationsNotSupported"), 
          variant: "destructive" 
        });
        return;
      }

      const granted = await requestPermission();
      if (granted) {
        setAlertSettings((prev) => ({ ...prev, push_enabled: true }));
        toast({ title: t("common.success"), description: t("settings.notificationsEnabled") });
      } else {
        toast({ 
          title: t("common.error"), 
          description: t("settings.notificationsDenied"), 
          variant: "destructive" 
        });
      }
    } else {
      setAlertSettings((prev) => ({ ...prev, push_enabled: false }));
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
        <h1 className="text-3xl font-bold text-foreground">{t("settings.title")}</h1>
        <p className="text-muted-foreground">{t("settings.subtitle")}</p>
      </div>

      {/* Language Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t("settings.language")}
          </CardTitle>
          <CardDescription>{t("settings.languageDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={language} onValueChange={(value: "fr" | "en") => setLanguage(value)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fr">🇫🇷 {t("settings.french")}</SelectItem>
              <SelectItem value="en">🇬🇧 {t("settings.english")}</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t("settings.profile")}
          </CardTitle>
          <CardDescription>{t("settings.profileDesc")}</CardDescription>
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
              <p className="font-medium">{t("settings.avatar")}</p>
              <p className="text-sm text-muted-foreground">
                {t("settings.avatarDesc")}
              </p>
            </div>
          </div>

          <Separator />

          {/* Form */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">{t("auth.firstName")}</Label>
              <Input
                id="first_name"
                placeholder={t("auth.firstName")}
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">{t("auth.lastName")}</Label>
              <Input
                id="last_name"
                placeholder={t("auth.lastName")}
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("auth.email")}</Label>
            <Input value={user?.email || ""} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">{t("settings.emailNotEditable")}</p>
          </div>

          <Button onClick={handleSaveProfile} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {t("settings.saveProfile")}
          </Button>
        </CardContent>
      </Card>

      {/* Alert Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t("settings.alerts")}
          </CardTitle>
          <CardDescription>{t("settings.alertsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Push notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("settings.pushNotifications")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("settings.pushDesc")}
              </p>
              {permission === "denied" && (
                <p className="text-xs text-destructive">
                  {t("settings.notificationsDenied")}
                </p>
              )}
            </div>
            <Switch
              checked={alertSettings.push_enabled && permission === "granted"}
              onCheckedChange={handlePushToggle}
              disabled={permission === "denied"}
            />
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="oil_days">{t("settings.oilAlert")}</Label>
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
              <Label htmlFor="insurance_days">{t("settings.insuranceAlert")}</Label>
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
              <Label htmlFor="inspection_days">{t("settings.inspectionAlert")}</Label>
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
              <Label htmlFor="license_days">{t("settings.licenseAlert")}</Label>
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
            {t("settings.saveSettings")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
