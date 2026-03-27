import { ChatMessage, Member, Receipt } from './types';

export const MOCK_MEMBERS: Member[] = [
  { id: 'me', name: 'You', initials: 'YO', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { id: 'alex', name: 'Alex', initials: 'AX', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { id: 'sam', name: 'Sam', initials: 'SM', color: 'bg-pink-100 text-pink-700 border-pink-300' },
  { id: 'jordan', name: 'Jordan', initials: 'JD', color: 'bg-purple-100 text-purple-700 border-purple-300' },
];

export const MOCK_RECEIPT: Receipt = {
  id: 'r1',
  items: [
    { id: 'i1', name: 'Margherita Pizza', price: 18.50, assignedTo: ['me', 'alex'] },
    { id: 'i2', name: 'Truffle Pasta', price: 24.00, assignedTo: ['sam'] },
    { id: 'i3', name: 'Caesar Salad', price: 14.00, assignedTo: ['jordan', 'me'] },
    { id: 'i4', name: 'Sparkling Water (x3)', price: 9.00, assignedTo: ['me', 'alex', 'sam', 'jordan'] },
    { id: 'i5', name: 'Tiramisu', price: 12.00, assignedTo: ['alex', 'jordan'] },
  ],
  tax: 7.75,
  tip: 12.00,
  total: 97.25,
  currency: '₹',
  createdBy: 'me',
  paidBy: 'me',
  createdAt: new Date(Date.now() - 1000 * 60 * 15),
};

export const MOCK_MESSAGES: ChatMessage[] = [
  {
    id: 'm1',
    type: 'system',
    content: 'you created "friday dinner" 🎉',
    senderId: 'system',
    timestamp: new Date(Date.now() - 1000 * 60 * 60),
  },
  {
    id: 'm2',
    type: 'text',
    content: 'just got the bill, uploading now',
    senderId: 'me',
    timestamp: new Date(Date.now() - 1000 * 60 * 20),
  },
  {
    id: 'm3',
    type: 'text',
    content: 'nice! i had the truffle pasta btw 🍝',
    senderId: 'sam',
    timestamp: new Date(Date.now() - 1000 * 60 * 18),
  },
  {
    id: 'm4',
    type: 'receipt',
    receipt: MOCK_RECEIPT,
    senderId: 'me',
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
  },
  {
    id: 'm5',
    type: 'text',
    content: 'tap your avatar on the items you ordered 👆',
    senderId: 'me',
    timestamp: new Date(Date.now() - 1000 * 60 * 14),
  },
];
