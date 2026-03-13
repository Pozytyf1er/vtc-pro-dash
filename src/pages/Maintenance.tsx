import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Wrench } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import ConfirmDialog from "@/components/ConfirmDialog";
import { maintenanceSchema, getValidationErrors, devLog } from "@/lib/validations";

interface MaintenanceType { id: string; type: string; cost: number; date: string; status: string; notes?: string; vehicle_id?: string; last_oil_change_km?: number; oil_change_interval?: number; next_oil_change_km?: number; }
interface Vehicle { id: string; model: string; plate_number: string; mileage: number; }

const Maintenance = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [maintenances, setMaintenances] = useState<MaintenanceType[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<MaintenanceType | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [formData, setFormData] = useState({ type: "", cost: "", date: format(new Date(), "yyyy-MM-dd"), status: "pending", notes: "", vehicle_id: "", last_oil_change_km: "", oil_change_interval: "5000" });

  useEffect(() => { fetchVehicles(); fetchMaintenances(); }, [user]);

  const fetchVehicles = async () => {
    const { data, error } = await supabase.from("vehicles").select("*").eq("user_id", user?.id);
    if (error) { devLog.error('Error:', error); toast({ title: t('common.error'), description: t('vehicles.errorLoading'), variant: "destructive" }); }
    else setVehicles(data || []);
  };

  const fetchMaintenances = async () => {
    const { data, error } = await supabase.from("maintenance").select("*").eq("user_id", user?.id).order("date", { ascending: false });
    if (error) { devLog.error('Error:', error); toast({ title: t('common.error'), description: t('maintenance.errorLoading'), variant: "destructive" }); }
    else setMaintenances(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    const validation = maintenanceSchema.safeParse(formData);
    if (!validation.success) { setErrors(getValidationErrors(validation)); return; }

    const last_oil_km = formData.last_oil_change_km ? parseInt(formData.last_oil_change_km) : null;
    const interval = formData.oil_change_interval ? parseInt(formData.oil_change_interval) : null;
    const next_oil_km = last_oil_km && interval ? last_oil_km + interval : null;

    if (editingMaintenance) {
      const { error } = await supabase.from("maintenance").update({ type: formData.type, cost: parseFloat(formData.cost), date: formData.date, status: formData.status, notes: formData.notes, vehicle_id: formData.vehicle_id || null, last_oil_change_km: last_oil_km, oil_change_interval: interval, next_oil_change_km: next_oil_km }).eq("id", editingMaintenance.id);
      if (error) { devLog.error('Error:', error); toast({ title: t('common.error'), description: t('maintenance.errorUpdating'), variant: "destructive" }); }
      else { toast({ title: t('common.success'), description: t('maintenance.maintenanceUpdated') }); fetchMaintenances(); handleCloseDialog(); }
    } else {
      const { error } = await supabase.from("maintenance").insert({ user_id: user?.id, type: formData.type, cost: parseFloat(formData.cost), date: formData.date, status: formData.status, notes: formData.notes, vehicle_id: formData.vehicle_id || null, last_oil_change_km: last_oil_km, oil_change_interval: interval, next_oil_change_km: next_oil_km }).select();
      if (error) { devLog.error('Error:', error); toast({ title: t('common.error'), description: t('maintenance.errorAdding'), variant: "destructive" }); }
      else {
        const cost = parseFloat(formData.cost);
        if (cost > 0) {
          await supabase.from("expenses").insert({ user_id: user?.id, amount: cost, category: "maintenance", date: formData.date, description: `Maintenance: ${formData.type}` });
        }
        toast({ title: t('common.success'), description: t('maintenance.maintenanceAdded') });
        fetchMaintenances(); handleCloseDialog();
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("maintenance").delete().eq("id", deleteId);
    if (error) { devLog.error('Error:', error); toast({ title: t('common.error'), description: t('maintenance.errorDeleting'), variant: "destructive" }); }
    else { toast({ title: t('common.success'), description: t('maintenance.maintenanceDeleted') }); fetchMaintenances(); }
    setDeleteId(null);
  };

  const handleEdit = (m: MaintenanceType) => {
    setEditingMaintenance(m);
    setFormData({ type: m.type, cost: m.cost.toString(), date: m.date, status: m.status, notes: m.notes || "", vehicle_id: m.vehicle_id || "", last_oil_change_km: m.last_oil_change_km?.toString() || "", oil_change_interval: m.oil_change_interval?.toString() || "5000" });
    setErrors([]); setDialogOpen(true);
  };

  const handleCloseDialog = () => { setDialogOpen(false); setEditingMaintenance(null); setErrors([]); setFormData({ type: "", cost: "", date: format(new Date(), "yyyy-MM-dd"), status: "pending", notes: "", vehicle_id: "", last_oil_change_km: "", oil_change_interval: "5000" }); };

  const getVehicleName = (vehicleId?: string) => { if (!vehicleId) return "-"; const v = vehicles.find(v => v.id === vehicleId); return v ? `${v.model} (${v.plate_number})` : "-"; };

  const totalCost = maintenances.reduce((sum, m) => sum + Number(m.cost), 0);
  const pendingCount = maintenances.filter((m) => m.status === "pending").length;
  const completedCount = maintenances.filter((m) => m.status === "completed").length;

  const statusColors: Record<string, string> = { pending: "bg-warning text-warning-foreground", completed: "bg-accent text-accent-foreground", scheduled: "bg-secondary text-secondary-foreground" };

  if (loading) { return <div className="flex min-h-[400px] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div></div>; }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('maintenance.title')}</h1>
          <p className="text-muted-foreground">{t('maintenance.subtitle')}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingMaintenance(null); setErrors([]); }}><Plus className="mr-2 h-4 w-4" />{t('maintenance.addMaintenance')}</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingMaintenance ? t('maintenance.editMaintenance') : t('maintenance.newMaintenance')}</DialogTitle></DialogHeader>
            {errors.length > 0 && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"><ul className="list-inside list-disc space-y-1">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul></div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2"><Label htmlFor="type">{t('maintenance.maintenanceType')}</Label><Input id="type" placeholder="Ex: Changement des pneus" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} required maxLength={200} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="cost">{t('common.cost')} (CFA)</Label><Input id="cost" type="number" step="1" placeholder="0" value={formData.cost} onChange={(e) => setFormData({ ...formData, cost: e.target.value })} required /></div>
                <div className="space-y-2"><Label htmlFor="date">{t('common.date')}</Label><Input id="date" type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required /></div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">{t('maintenance.status')}</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">{t('maintenance.statusPending')}</SelectItem>
                    <SelectItem value="scheduled">{t('maintenance.statusScheduled')}</SelectItem>
                    <SelectItem value="completed">{t('maintenance.statusCompleted')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('common.vehicle')} ({t('common.optional')})</Label>
                <Select value={formData.vehicle_id || "none"} onValueChange={(value) => setFormData({ ...formData, vehicle_id: value === "none" ? "" : value })}>
                  <SelectTrigger><SelectValue placeholder={t('common.noVehicle')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('common.noVehicle')}</SelectItem>
                    {vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.model} - {v.plate_number}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {formData.type.toLowerCase().includes("vidange") && (
                <>
                  <div className="space-y-2"><Label>{t('maintenance.lastOilChangeKm')}</Label><Input type="number" placeholder="Ex: 45000" value={formData.last_oil_change_km} onChange={(e) => setFormData({ ...formData, last_oil_change_km: e.target.value })} /></div>
                  <div className="space-y-2">
                    <Label>{t('maintenance.oilChangeInterval')}</Label>
                    <Select value={formData.oil_change_interval} onValueChange={(value) => setFormData({ ...formData, oil_change_interval: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="5000">5 000 km</SelectItem><SelectItem value="10000">10 000 km</SelectItem></SelectContent>
                    </Select>
                  </div>
                  {formData.last_oil_change_km && formData.oil_change_interval && (
                    <div className="rounded-lg bg-muted p-3"><p className="text-sm text-muted-foreground">{t('maintenance.nextOilChangeAt')} <span className="font-medium text-foreground">{(parseInt(formData.last_oil_change_km) + parseInt(formData.oil_change_interval)).toLocaleString()} km</span></p></div>
                  )}
                </>
              )}
              <div className="space-y-2"><Label>{t('common.notes')} ({t('common.optional')})</Label><Textarea placeholder="..." value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} maxLength={1000} /></div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">{editingMaintenance ? t('common.edit') : t('common.add')}</Button>
                <Button type="button" variant="outline" onClick={handleCloseDialog} className="flex-1">{t('common.cancel')}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{t('maintenance.totalCost')}</CardTitle><Wrench className="h-4 w-4 text-destructive" /></CardHeader>
          <CardContent><div className="text-2xl font-bold text-foreground">{totalCost.toFixed(0)} CFA</div><p className="text-xs text-muted-foreground">{maintenances.length} {t('maintenance.operationsTotal')}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{t('maintenance.pending')}</CardTitle><Wrench className="h-4 w-4 text-warning" /></CardHeader>
          <CardContent><div className="text-2xl font-bold text-warning">{pendingCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{t('maintenance.completed')}</CardTitle><Wrench className="h-4 w-4 text-accent" /></CardHeader>
          <CardContent><div className="text-2xl font-bold text-accent">{completedCount}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.date')}</TableHead>
                <TableHead>{t('common.type')}</TableHead>
                <TableHead>{t('common.vehicle')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="text-right">{t('common.cost')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {maintenances.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">{t('maintenance.noMaintenance')}</TableCell></TableRow>
              ) : (
                maintenances.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{format(new Date(m.date), "dd/MM/yyyy")}</TableCell>
                    <TableCell>{m.type}</TableCell>
                    <TableCell>{getVehicleName(m.vehicle_id)}</TableCell>
                    <TableCell><Badge className={statusColors[m.status]}>{m.status === 'pending' ? t('maintenance.statusPending') : m.status === 'completed' ? t('maintenance.statusCompleted') : t('maintenance.statusScheduled')}</Badge></TableCell>
                    <TableCell className="text-right font-medium">{Number(m.cost).toFixed(0)} CFA</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(m)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ConfirmDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)} title={t('maintenance.title')} description={t('maintenance.deleteConfirm')} onConfirm={handleDelete} confirmText={t('common.delete')} />
    </div>
  );
};

export default Maintenance;
