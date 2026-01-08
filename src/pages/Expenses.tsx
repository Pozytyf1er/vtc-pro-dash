import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, TrendingDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import ConfirmDialog from "@/components/ConfirmDialog";
import { expenseSchema, getValidationErrors, devLog } from "@/lib/validations";
import { useTranslation } from "react-i18next";
import { ExportButtons } from "@/components/ExportButtons";
import { 
  exportToPDF, 
  exportToCSV, 
  formatExpenseForExport, 
  getDateRangeForPeriod,
  type PeriodFilter 
} from "@/lib/exportUtils";

interface Expense {
  id: string;
  date: string;
  category: string;
  amount: number;
  description?: string;
  vehicle_id?: string;
}

interface Vehicle {
  id: string;
  model: string;
  plate_number: string;
}

const Expenses = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('month');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    category: "fuel",
    amount: "",
    description: "",
    vehicle_id: "",
  });

  // Set initial dates based on period
  useEffect(() => {
    if (periodFilter !== 'custom') {
      const range = getDateRangeForPeriod(periodFilter);
      setStartDate(format(range.start, 'yyyy-MM-dd'));
      setEndDate(format(range.end, 'yyyy-MM-dd'));
    }
  }, [periodFilter]);

  useEffect(() => {
    fetchVehicles();
  }, [user]);

  useEffect(() => {
    fetchExpenses();
  }, [user, startDate, endDate, vehicleFilter]);

  const fetchVehicles = async () => {
    const { data } = await supabase
      .from("vehicles")
      .select("id, model, plate_number")
      .eq("user_id", user?.id);
    setVehicles(data || []);
  };

  const fetchExpenses = async () => {
    let query = supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user?.id)
      .order("date", { ascending: false });

    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      devLog.error('Error fetching expenses:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les dépenses",
        variant: "destructive",
      });
    } else {
      let filteredData = data || [];
      if (vehicleFilter) {
        filteredData = filteredData.filter((e: any) => e.vehicle_id === vehicleFilter);
      }
      setExpenses(filteredData);
    }
    setLoading(false);
  };

  const getVehicleName = (vehicleId?: string) => {
    if (!vehicleId) return "-";
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle ? `${vehicle.model} (${vehicle.plate_number})` : "-";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    const validation = expenseSchema.safeParse(formData);
    if (!validation.success) {
      setErrors(getValidationErrors(validation));
      return;
    }

    if (editingExpense) {
      const { error } = await supabase
        .from("expenses")
        .update({
          date: formData.date,
          category: formData.category,
          amount: parseFloat(formData.amount),
          description: formData.description,
        })
        .eq("id", editingExpense.id);

      if (error) {
        devLog.error('Error updating expense:', error);
        toast({
          title: "Erreur",
          description: "Impossible de modifier la dépense",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Succès",
          description: "Dépense modifiée avec succès",
        });
        fetchExpenses();
        handleCloseDialog();
      }
    } else {
      const { error } = await supabase.from("expenses").insert({
        user_id: user?.id,
        date: formData.date,
        category: formData.category,
        amount: parseFloat(formData.amount),
        description: formData.description,
      });

      if (error) {
        devLog.error('Error creating expense:', error);
        toast({
          title: "Erreur",
          description: "Impossible d'ajouter la dépense",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Succès",
          description: "Dépense ajoutée avec succès",
        });
        fetchExpenses();
        handleCloseDialog();
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    const { error } = await supabase.from("expenses").delete().eq("id", deleteId);

    if (error) {
      devLog.error('Error deleting expense:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la dépense",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Succès",
        description: "Dépense supprimée avec succès",
      });
      fetchExpenses();
    }
    setDeleteId(null);
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      date: expense.date,
      category: expense.category,
      amount: expense.amount.toString(),
      description: expense.description || "",
      vehicle_id: expense.vehicle_id || "",
    });
    setErrors([]);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingExpense(null);
    setErrors([]);
    setFormData({
      date: format(new Date(), "yyyy-MM-dd"),
      category: "fuel",
      amount: "",
      description: "",
      vehicle_id: "",
    });
  };

  const totalAmount = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const categoryTotals = expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + Number(expense.amount);
    return acc;
  }, {} as Record<string, number>);

  const categoryLabels: Record<string, string> = {
    fuel: "Carburant",
    maintenance: "Entretien",
    insurance: "Assurance",
    parking: "Stationnement",
    tolls: "Péages",
    yango: "Recharge Yango",
    other: "Autre",
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dépenses</h1>
          <p className="text-muted-foreground">Gérez vos dépenses professionnelles</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingExpense(null); setErrors([]); }}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter une dépense
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingExpense ? "Modifier la dépense" : "Nouvelle dépense"}
              </DialogTitle>
            </DialogHeader>
            {errors.length > 0 && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <ul className="list-inside list-disc space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Catégorie</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fuel">Carburant</SelectItem>
                    <SelectItem value="maintenance">Entretien</SelectItem>
                    <SelectItem value="insurance">Assurance</SelectItem>
                    <SelectItem value="parking">Stationnement</SelectItem>
                    <SelectItem value="tolls">Péages</SelectItem>
                    <SelectItem value="yango">Recharge Yango</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Montant (CFA)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="1"
                  placeholder="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optionnel)</Label>
                <Input
                  id="description"
                  placeholder="Détails de la dépense"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  maxLength={500}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingExpense ? "Modifier" : "Ajouter"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                  className="flex-1"
                >
                  Annuler
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="startDate">Date de début</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">Date de fin</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="vehicleFilter">Véhicule</Label>
              <Select
                value={vehicleFilter || "all"}
                onValueChange={(value) => setVehicleFilter(value === "all" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tous les véhicules" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les véhicules</SelectItem>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.model} - {vehicle.plate_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  setVehicleFilter('');
                }}
              >
                Réinitialiser
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total des dépenses
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {totalAmount.toFixed(0)} CFA
            </div>
            <p className="text-xs text-muted-foreground">
              {expenses.length} dépenses enregistrées
            </p>
          </CardContent>
        </Card>

        {Object.entries(categoryTotals)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
          .map(([category, amount]) => (
            <Card key={category}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {categoryLabels[category] || category}
                </CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {amount.toFixed(0)} CFA
                </div>
                <p className="text-xs text-muted-foreground">
                  {totalAmount > 0 ? ((amount / totalAmount) * 100).toFixed(0) : 0}% du total
                </p>
              </CardContent>
            </Card>
          ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Aucune dépense enregistrée
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{format(new Date(expense.date), "dd/MM/yyyy")}</TableCell>
                    <TableCell className="capitalize">
                      {categoryLabels[expense.category] || expense.category}
                    </TableCell>
                    <TableCell>{expense.description || "-"}</TableCell>
                    <TableCell className="text-right font-medium text-destructive">
                      {Number(expense.amount).toFixed(0)} CFA
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(expense)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(expense.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Supprimer la dépense"
        description="Êtes-vous sûr de vouloir supprimer cette dépense ? Cette action est irréversible."
        onConfirm={handleDelete}
        confirmText="Supprimer"
      />
    </div>
  );
};

export default Expenses;
