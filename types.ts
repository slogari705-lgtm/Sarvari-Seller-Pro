
export interface Product {
  id: string;
  name: string;
  category: string;
  price: number; // Sell Price
  costPrice: number; // Buy Price
  stock: number;
  sku: string;
  image?: string;
  isFavorite?: boolean;
  lowStockThreshold?: number;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  dob?: string;
  totalSpent: number;
  totalDebt: number; 
  lastVisit: string;
  company?: string;
  notes?: string;
  tags?: string[];
  skills?: string[]; 
  loyaltyPoints?: number;
  transactionCount?: number;
}

export interface CartItem extends Product {
  quantity: number;
  buyPrice: number;
}

export interface InvoiceTemplate {
  id: string;
  name: string;
  layout: 'modern' | 'minimal' | 'classic' | 'thermal' | 'receipt';
  brandColor: string;
  headerText?: string;
  footerText?: string;
  showLogo: boolean;
}

export interface Invoice {
  id: string;
  date: string;
  customerId?: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paidAmount: number; 
  profit: number; 
  status: 'paid' | 'partial' | 'unpaid'; 
  paymentMethod: 'cash' | 'card' | 'transfer';
  notes?: string;
}

export interface LoanTransaction {
  id: string;
  customerId: string;
  invoiceId?: string;
  date: string;
  amount: number;
  type: 'debt' | 'repayment' | 'adjustment';
  note?: string;
  dueDate?: string;
}

export interface Expense {
  id: string;
  description: string;
  category: string;
  amount: number;
  date: string;
}

export type Language = 'en' | 'ps' | 'dr';
export type Theme = 'light' | 'dark';

export interface AppState {
  products: Product[];
  customers: Customer[];
  invoices: Invoice[];
  expenses: Expense[];
  templates: InvoiceTemplate[];
  loanTransactions: LoanTransaction[];
  expenseCategories: string[];
  lastSync?: string;
  settings: {
    shopName: string;
    shopAddress?: string;
    shopPhone?: string;
    shopEmail?: string;
    shopWebsite?: string;
    businessId?: string;
    currency: string;
    taxRate: number;
    lowStockThreshold: number;
    invoiceTemplate: string; 
    brandColor: string;
    language: Language;
    theme: Theme;
    defaultCustomerId?: string;
  };
}

export type View = 'dashboard' | 'customers' | 'products' | 'terminal' | 'invoices' | 'expenses' | 'reports' | 'settings' | 'loans' | 'dashboard-costume';
