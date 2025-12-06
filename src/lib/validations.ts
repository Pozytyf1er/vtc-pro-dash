import { z } from "zod";

// Auth validations
export const signInSchema = z.object({
  email: z.string().trim().email("Email invalide").max(255, "Email trop long"),
  password: z.string().min(8, "Minimum 8 caractères").max(128, "Maximum 128 caractères"),
});

export const signUpSchema = z.object({
  email: z.string().trim().email("Email invalide").max(255, "Email trop long"),
  password: z.string()
    .min(8, "Minimum 8 caractères")
    .max(128, "Maximum 128 caractères")
    .regex(/[A-Z]/, "Au moins une majuscule")
    .regex(/[0-9]/, "Au moins un chiffre"),
  firstName: z.string().trim().max(100, "Maximum 100 caractères").optional(),
  lastName: z.string().trim().max(100, "Maximum 100 caractères").optional(),
});

// Income validation
export const incomeSchema = z.object({
  date: z.string().min(1, "Date requise"),
  amount: z.string().min(1, "Montant requis").refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    "Montant invalide"
  ),
  payment_method: z.string().min(1, "Moyen de paiement requis"),
  notes: z.string().max(500, "Maximum 500 caractères").optional(),
});

// Expense validation
export const expenseSchema = z.object({
  date: z.string().min(1, "Date requise"),
  category: z.string().min(1, "Catégorie requise"),
  amount: z.string().min(1, "Montant requis").refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    "Montant invalide"
  ),
  description: z.string().max(500, "Maximum 500 caractères").optional(),
});

// Maintenance validation
export const maintenanceSchema = z.object({
  type: z.string().trim().min(1, "Type requis").max(200, "Maximum 200 caractères"),
  cost: z.string().min(1, "Coût requis").refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0,
    "Coût invalide"
  ),
  date: z.string().min(1, "Date requise"),
  status: z.enum(["pending", "scheduled", "completed"]),
  notes: z.string().max(1000, "Maximum 1000 caractères").optional(),
  vehicle_id: z.string().optional(),
  last_oil_change_km: z.string().optional(),
  oil_change_interval: z.string().optional(),
});

// Vehicle validation
export const vehicleSchema = z.object({
  model: z.string().trim().min(1, "Modèle requis").max(100, "Maximum 100 caractères"),
  plate_number: z.string().trim().min(1, "Immatriculation requise").max(20, "Maximum 20 caractères"),
  mileage: z.string().min(1, "Kilométrage requis").refine(
    (val) => !isNaN(parseInt(val)) && parseInt(val) >= 0,
    "Kilométrage invalide"
  ),
  next_oil_change: z.string().optional(),
  insurance_expiry: z.string().optional(),
  technical_inspection_expiry: z.string().optional(),
  assigned_driver_id: z.string().optional(),
});

// Driver validation
export const driverSchema = z.object({
  first_name: z.string().trim().min(1, "Prénom requis").max(100, "Maximum 100 caractères"),
  last_name: z.string().trim().min(1, "Nom requis").max(100, "Maximum 100 caractères"),
  phone: z.string().max(20, "Maximum 20 caractères").optional(),
  email: z.string().email("Email invalide").max(255, "Maximum 255 caractères").optional().or(z.literal("")),
  license_number: z.string().max(50, "Maximum 50 caractères").optional(),
  license_expiry: z.string().optional(),
  assigned_vehicle_id: z.string().optional(),
});

// Helper to get validation errors
export const getValidationErrors = (result: z.SafeParseReturnType<any, any>): string[] => {
  if (result.success) return [];
  return result.error.errors.map((e) => e.message);
};

// Logger that only logs in development
export const devLog = {
  error: (...args: any[]) => {
    if (import.meta.env.DEV) {
      console.error(...args);
    }
  },
  log: (...args: any[]) => {
    if (import.meta.env.DEV) {
      console.log(...args);
    }
  },
};
