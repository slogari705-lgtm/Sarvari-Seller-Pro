
export interface ProductOption {
  name: string;
  values: string[];
}

export interface ProductVariation {
  id: string;
  sku: string;
  name: string; // e.g., "Red / XL"
  price: number;
  salePrice?: number; // Price override for discounts
  costPrice: number;
  stock: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number; 
  salePrice?: number; // Price override for discounts
  costPrice: number; 
  stock: number;
  sku: string;
  image?: string;
  isFavorite?: boolean;
  lowStockThreshold?: number;
  isDeleted?: boolean;
  // Variations Support
  options?: ProductOption[];
  variations?: ProductVariation[];
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  secondaryPhone?: string;
  photo?: string; 
  address?: string;
  dob?: string;
  gender?: 'Male' | 'Female' | 'Other';
  occupation?: string;
  company?: string;
  reference?: string;
  totalSpent: number;
  totalDebt: number; 
  lastVisit: string;
  joinedDate: string;
  notes?: string;
  loyaltyPoints?: number;
  transactionCount?: number;
  isArchived?: boolean; 
  isDeleted?: boolean;
  tier?: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  preferredPayment?: 'Cash' | 'Card' | 'Transfer';
}

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: 'admin' | 'manager' | 'cashier';
  name: string;
  avatar?: string;
  lastLogin?: string;
  isActive: boolean;
}

export interface Worker {
  id: string;
  employeeId: string; 
  name: string;
  phone: string;
  position: string;
  photo?: string;
  joinDate: string;
  baseSalary: number;
  isDeleted?: boolean;
}

export interface CartItem extends Product {
  quantity: number;
  buyPrice: number;
  returnedQuantity?: number;
  // Track specific variation
  variationId?: string;
  variationName?: string;
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
  processedBy?: string; // User ID
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paidAmount: number; 
  profit: number; 
  status: 'paid' | 'partial' | 'unpaid' | 'voided' | 'returned'; 
  paymentMethod: 'cash' | 'card' | 'transfer';
  paymentTerm?: string;
  exchangeRate?: number;
  notes?: string;
  isVoided?: boolean; 
  isDeleted?: boolean;
  pointsEarned?: number;
  pointsRedeemed?: number;
  returnHistory?: {
    date: string;
    items: { productId: string; quantity: number }[];
    refundAmount: number;
  }[];
}

export interface LoanTransaction {
  id: string;
  customerId: string;
  invoiceId?: string;
  date: string;
  amount: number;
  type: 'debt' | 'repayment' | 'adjustment' | 'void_reversal' | 'refund';
  note?: string;
  dueDate?: string;
}

export interface Expense {
  id: string;
  description: string;
  category: string;
  amount: number;
  date: string;
  workerId?: string; 
  isDeleted?: boolean;
}

export type Language = 'en' | 'ps' | 'dr';
export type Theme = 'light' | 'dark';

export interface CardDesign {
  layout: 'horizontal' | 'vertical';
  theme: 'solid' | 'gradient' | 'mesh' | 'glass';
  primaryColor: string;
  secondaryColor: string;
  pattern: 'none' | 'mesh' | 'dots' | 'waves' | 'circuit';
  borderRadius: number;
  borderWidth: number;
  fontFamily: 'sans' | 'serif' | 'mono';
  showQr: boolean;
  showPoints: boolean;
  showJoinDate: boolean;
  showLogo: boolean;
  textColor: 'light' | 'dark';
  glossy: boolean;
}

export interface DbSnapshot {
  id: string;
  timestamp: string;
  data: AppState;
  label: string;
}

export interface AppState {
  products: Product[];
  customers: Customer[];
  workers: Worker[];
  invoices: Invoice[];
  expenses: Expense[];
  users: User[];
  templates: InvoiceTemplate[];
  loanTransactions: LoanTransaction[];
  expenseCategories: string[];
  lastSync?: string;
  lastLocalBackup?: string;
  lastFileBackup?: string;
  currentUser?: User | null;
  settings: {
    shopName: string;
    ownerName?: string;
    shopTagline?: string;
    shopAddress?: string;
    shopPhone?: string;
    shopEmail?: string;
    shopWebsite?: string;
    shopLogo?: string; 
    invoiceHeaderNote?: string;
    invoiceFooterNote?: string;
    invoicePrefix?: string;
    businessRegId?: string;
    showSignatures: boolean;
    businessId?: string;
    currency: string;
    secondaryCurrency?: string;
    exchangeRate: number;
    taxRate: number;
    lowStockThreshold: number;
    invoiceTemplate: string; 
    brandColor: string;
    language: Language;
    theme: Theme;
    defaultCustomerId?: string;
    autoFileBackup: boolean;
    autoLocalBackup: boolean;
    autoBackupFolderLinked: boolean;
    cardDesign: CardDesign;
    loyaltySettings: {
      pointsPerUnit: number; 
      conversionRate: number; 
      enableTiers: boolean;
    };
    security: {
      passcode?: string;
      isLockEnabled: boolean;
      securityQuestion?: string;
      securityAnswer?: string;
      highSecurityMode: boolean; 
      autoLockTimeout?: number;
    }
  };
}

export type View = 'dashboard' | 'customers' | 'products' | 'terminal' | 'invoices' | 'expenses' | 'reports' | 'settings' | 'loans' | 'dashboard-costume' | 'trash' | 'returns' | 'users';
