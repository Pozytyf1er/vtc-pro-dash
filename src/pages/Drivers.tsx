import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Edit, Trash2, User, Calendar, Phone, Mail, CreditCard, Car } from "lucide-react";

interface Driver {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
  license_number?: string;
  license_expiry?: string;
  assigned_vehicle_id?: string;
}

interface Vehicle {
  id: string;
  model: string;
  plate_number: string;
}

const Drivers = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    license_number: '',
    license_expiry: '',
    assigned_vehicle_id: '',
  });

  useEffect(() => {
    fetchDrivers();
    fetchVehicles();
  }, []);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDrivers(data || []);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      toast.error("Erreur lors du chargement des conducteurs");
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('vehicles')
        .select('id, model, plate_number')
        .eq('user_id', user.id);

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (editingDriver) {
        const { error } = await supabase
          .from('drivers')
          .update({
            ...formData,
            assigned_vehicle_id: formData.assigned_vehicle_id || null,
          })
          .eq('id', editingDriver.id);

        if (error) throw error;
        toast.success("Conducteur mis à jour avec succès");
      } else {
        const { error } = await supabase
          .from('drivers')
          .insert([{ 
            ...formData,
            assigned_vehicle_id: formData.assigned_vehicle_id || null,
            user_id: user.id 
          }]);

        if (error) throw error;
        toast.success("Conducteur ajouté avec succès");
      }

      handleCloseDialog();
      fetchDrivers();
    } catch (error) {
      console.error('Error saving driver:', error);
      toast.error("Erreur lors de l'enregistrement du conducteur");
    }
  };

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setFormData({
      first_name: driver.first_name,
      last_name: driver.last_name,
      phone: driver.phone || '',
      email: driver.email || '',
      license_number: driver.license_number || '',
      license_expiry: driver.license_expiry || '',
      assigned_vehicle_id: driver.assigned_vehicle_id || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce conducteur ?")) return;

    try {
      const { error } = await supabase
        .from('drivers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Conducteur supprimé avec succès");
      fetchDrivers();
    } catch (error) {
      console.error('Error deleting driver:', error);
      toast.error("Erreur lors de la suppression du conducteur");
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingDriver(null);
    setFormData({
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
      license_number: '',
      license_expiry: '',
      assigned_vehicle_id: '',
    });
  };

  const getVehicleInfo = (vehicleId?: string) => {
    if (!vehicleId) return 'Non assigné';
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle ? `${vehicle.model} (${vehicle.plate_number})` : 'Non assigné';
  };

  const getLicenseStatus = (expiryDate?: string) => {
    if (!expiryDate) return { status: 'unknown', message: 'Non renseigné' };
    
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return { status: 'expired', message: 'Expiré' };
    } else if (daysUntilExpiry <= 30) {
      return { status: 'warning', message: `Expire dans ${daysUntilExpiry} jours` };
    } else {
      return { status: 'valid', message: 'Valide' };
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Chargement...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Conducteurs</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau Conducteur
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingDriver ? 'Modifier le conducteur' : 'Ajouter un conducteur'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">Prénom *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Nom *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="license_number">Numéro de permis</Label>
                  <Input
                    id="license_number"
                    value={formData.license_number}
                    onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="license_expiry">Date d'expiration du permis</Label>
                  <Input
                    id="license_expiry"
                    type="date"
                    value={formData.license_expiry}
                    onChange={(e) => setFormData({ ...formData, license_expiry: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="assigned_vehicle_id">Véhicule assigné</Label>
                <Select
                  value={formData.assigned_vehicle_id}
                  onValueChange={(value) => setFormData({ ...formData, assigned_vehicle_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un véhicule" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Aucun véhicule</SelectItem>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.model} ({vehicle.plate_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Annuler
                </Button>
                <Button type="submit">
                  {editingDriver ? 'Mettre à jour' : 'Ajouter'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {drivers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucun conducteur enregistré</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {drivers.map((driver) => {
            const licenseStatus = getLicenseStatus(driver.license_expiry);
            return (
              <Card key={driver.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {driver.first_name} {driver.last_name}
                    </span>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(driver)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(driver.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {driver.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{driver.phone}</span>
                    </div>
                  )}
                  {driver.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{driver.email}</span>
                    </div>
                  )}
                  {driver.license_number && (
                    <div className="flex items-center gap-2 text-sm">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span>{driver.license_number}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className={
                      licenseStatus.status === 'expired' ? 'text-destructive font-semibold' :
                      licenseStatus.status === 'warning' ? 'text-warning font-semibold' :
                      ''
                    }>
                      {licenseStatus.message}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Car className="h-4 w-4 text-muted-foreground" />
                    <span>{getVehicleInfo(driver.assigned_vehicle_id)}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Drivers;
