export interface Member {
  id: string;
  name: string;
  initials: string;
  color: string;
}

export interface ReceiptItem {
  id: string;
  name: string;
  price: number;
  assignedTo: string[]; // member IDs
}

export interface Receipt {
  id: string;
  items: ReceiptItem[];
  tax: number;
  tip: number;
  total: number;
  currency: string;
  createdBy: string;
  paidBy: string;
  createdAt: Date;
}

export interface ChatMessage {
  id: string;
  type: 'text' | 'receipt' | 'system';
  content?: string;
  receipt?: Receipt;
  senderId: string;
  timestamp: Date;
}

export interface Debt {
  from: string;
  to: string;
  amount: number;
}

export const MEMBER_COLORS = [
  'bg-blue-100 text-blue-700 border-blue-300',
  'bg-orange-100 text-orange-700 border-orange-300',
  'bg-pink-100 text-pink-700 border-pink-300',
  'bg-purple-100 text-purple-700 border-purple-300',
  'bg-teal-100 text-teal-700 border-teal-300',
  'bg-yellow-100 text-yellow-700 border-yellow-300',
] as const;
