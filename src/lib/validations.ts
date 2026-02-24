import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional(),
  companyName: z.string().min(2, "Company name is required"),
  gstin: z.string().optional(),
});

export const vendorSchema = z.object({
  name: z.string().min(2, "Vendor name is required"),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  upiId: z.string().optional(),
  category: z.string().optional(),
});

export const invoiceItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().positive("Quantity must be positive"),
  unitPrice: z.number().min(0, "Unit price must be non-negative"),
  unit: z.string().default("pcs"),
  gstRate: z.number().min(0).max(100).default(0),
  itemId: z.string().optional(),
  categoryId: z.string().optional(),
  subcategoryId: z.string().optional(),
  categoryName: z.string().optional(),
});

export const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  dueDate: z.string().optional(),
  vendorId: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
});

export const payoutSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  amount: z.number().positive("Amount must be positive"),
  paymentMethod: z.enum(["bank_transfer", "upi", "cheque", "cash"]),
  paymentRef: z.string().optional(),
  notes: z.string().optional(),
  category: z.enum(["vendor", "utility", "other"]).default("vendor"),
});

export const itemSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  sku: z.string().optional(),
  unit: z.string().default("pcs"),
  category: z.string().optional(),
  hsnCode: z.string().optional(),
  gstRate: z.number().min(0).max(100).default(0),
});

export const stockEntrySchema = z.object({
  itemId: z.string().min(1, "Item is required"),
  type: z.enum(["in", "out", "adjustment"]),
  quantity: z.number().positive("Quantity must be positive"),
  unitPrice: z.number().min(0).default(0),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export const categorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
});

export const subcategorySchema = z.object({
  name: z.string().min(1, "Subcategory name is required"),
  categoryId: z.string().min(1, "Category is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type VendorInput = z.infer<typeof vendorSchema>;
export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;
export type PayoutInput = z.infer<typeof payoutSchema>;
export type ItemInput = z.infer<typeof itemSchema>;
export type StockEntryInput = z.infer<typeof stockEntrySchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type SubcategoryInput = z.infer<typeof subcategorySchema>;
