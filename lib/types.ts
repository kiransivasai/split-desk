export interface IUser {
  _id: string;
  name: string;
  email: string;
  password?: string;
  image?: string;
  phone?: string;
  defaultCurrency: string;
  timezone: string;
  role: 'admin' | 'member';
  notifications: {
    newExpense: boolean;
    paymentReceived: boolean;
    weeklyDigest: boolean;
    overdueReminder: boolean;
    recurringAlert: boolean;
  };
  stats: {
    totalPaid: number;
    totalOwed: number;
    totalOwes: number;
    lastActive?: Date;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IGroup {
  _id: string;
  name: string;
  description?: string;
  emoji: string;
  type: 'trip' | 'home' | 'team' | 'event' | 'other';
  createdBy: string | IUser;
  members: {
    userId: string | IUser;
    role: 'admin' | 'member';
    joinedAt: Date;
    isActive: boolean;
  }[];
  totals: {
    totalSpent: number;
    currency: string;
  };
  status: 'active' | 'settled' | 'archived';
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISplit {
  userId: string | IUser;
  amount: number;
  percentage?: number;
  shares?: number;
  isPaid: boolean;
  paidAt?: Date;
}

export interface IExpense {
  _id: string;
  description: string;
  notes?: string;
  amount: number;
  currency: string;
  amountUSD?: number;
  exchangeRate?: number;
  rateDate?: Date;
  category: 'travel' | 'accommodation' | 'food' | 'transport' | 'conference' | 'supplies' | 'utilities' | 'entertainment' | 'health' | 'other';
  date: Date;
  paidBy: string | IUser;
  groupId?: string | IGroup;
  splitMethod: 'equal' | 'percentage' | 'exact' | 'shares';
  splits: ISplit[];
  receipts: {
    url: string;
    filename: string;
    uploadedAt: Date;
  }[];
  isRecurring: boolean;
  recurringId?: string;
  createdBy: string | IUser;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISettlement {
  _id: string;
  fromUser: string | IUser;
  toUser: string | IUser;
  amount: number;
  currency: string;
  amountUSD?: number;
  groupId?: string | IGroup;
  coveredSplits: {
    expenseId: string;
    splitAmount: number;
  }[];
  paymentMethod: 'bank_transfer' | 'venmo' | 'paypal' | 'cash' | 'stripe' | 'other';
  reference?: string;
  note?: string;
  status: 'pending' | 'confirmed' | 'disputed';
  confirmedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IActivityLog {
  _id: string;
  groupId?: string;
  actor: string | IUser;
  action: string;
  resourceType: 'Expense' | 'Settlement' | 'Group' | 'User';
  resourceId: string;
  meta?: Record<string, unknown>;
  createdAt: Date;
}

export const CATEGORIES = [
  { value: 'travel', label: '✈️ Travel & Flights', emoji: '✈️' },
  { value: 'accommodation', label: '🏨 Accommodation', emoji: '🏨' },
  { value: 'food', label: '🍽️ Food & Dining', emoji: '🍽️' },
  { value: 'transport', label: '🚗 Transport', emoji: '🚗' },
  { value: 'conference', label: '📊 Conferences', emoji: '📊' },
  { value: 'supplies', label: '🛒 Supplies', emoji: '🛒' },
  { value: 'utilities', label: '💡 Utilities', emoji: '💡' },
  { value: 'entertainment', label: '🎮 Entertainment', emoji: '🎮' },
  { value: 'health', label: '🏥 Health', emoji: '🏥' },
  { value: 'other', label: '💼 Other', emoji: '💼' },
] as const;

export const CURRENCIES = [
  { code: 'USD', symbol: '$', flag: '🇺🇸', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', flag: '🇪🇺', name: 'Euro' },
  { code: 'GBP', symbol: '£', flag: '🇬🇧', name: 'British Pound' },
  { code: 'INR', symbol: '₹', flag: '🇮🇳', name: 'Indian Rupee' },
  { code: 'CAD', symbol: 'C$', flag: '🇨🇦', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', flag: '🇦🇺', name: 'Australian Dollar' },
  { code: 'JPY', symbol: '¥', flag: '🇯🇵', name: 'Japanese Yen' },
] as const;

export const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: '💳 Bank Transfer' },
  { value: 'venmo', label: '📱 Venmo' },
  { value: 'paypal', label: '🅿️ PayPal' },
  { value: 'cash', label: '💵 Cash' },
  { value: 'stripe', label: '💳 Stripe' },
  { value: 'other', label: '📋 Other' },
] as const;
