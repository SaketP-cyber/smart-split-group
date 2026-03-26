import { motion } from 'framer-motion';
import { Receipt as ReceiptIcon, Plus, Check, X, Trash2, Pencil } from 'lucide-react';
import { Receipt, Member, ReceiptItem } from '@/lib/types';
import { AvatarBubble } from './AvatarBubble';
import { calculateAllTotals } from '@/lib/split-calculator';
import { useState } from 'react';

const DEFAULT_CURRENCY = '₹';

interface ReceiptCardProps {
  receipt: Receipt;
  members: Member[];
  currentUserId: string;
  onToggleAssignment: (itemId: string, memberId: string) => void;
  onAddItem?: (receiptId: string, name: string, price: number) => void;
  onChangePayer?: (receiptId: string, payerId: string) => void;
  onDeleteReceipt?: (receiptId: string, messageId: string) => void;
  onUpdateReceipt?: (receiptId: string, items: ReceiptItem[], tax: number, tip: number) => void;
  messageId?: string;
}

export function ReceiptCard({ receipt, members, currentUserId, onToggleAssignment, onAddItem, onChangePayer, onDeleteReceipt, onUpdateReceipt, messageId }: ReceiptCardProps) {
  const currency = DEFAULT_CURRENCY;
  const totals = calculateAllTotals(receipt, members);
  const myTotal = totals[currentUserId] || 0;
  const subtotal = receipt.items.reduce((s, i) => s + i.price, 0);
  const [addingItem, setAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [editing, setEditing] = useState(false);
  const [editItems, setEditItems] = useState<ReceiptItem[]>([]);
  const [editTax, setEditTax] = useState('');
  const [editTip, setEditTip] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isCreator = receipt.createdBy === currentUserId;

  const handleConfirmAdd = () => {
    const name = newItemName.trim();
    const price = parseFloat(newItemPrice);
    if (!name || isNaN(price) || price <= 0) return;
    onAddItem?.(receipt.id, name, price);
    setNewItemName('');
    setNewItemPrice('');
    setAddingItem(false);
  };

  const startEdit = () => {
    setEditItems(receipt.items.map(i => ({ ...i, assignedTo: [...i.assignedTo] })));
    setEditTax(receipt.tax.toString());
    setEditTip(receipt.tip.toString());
    setEditing(true);
  };

  const saveEdit = () => {
    const tax = parseFloat(editTax) || 0;
    const tip = parseFloat(editTip) || 0;
    onUpdateReceipt?.(receipt.id, editItems, tax, tip);
    setEditing(false);
  };

  const updateEditItem = (idx: number, field: 'name' | 'price', value: string) => {
    setEditItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      if (field === 'price') return { ...item, price: parseFloat(value) || 0 };
      return { ...item, [field]: value };
    }));
  };

  const removeEditItem = (idx: number) => {
    setEditItems(prev => prev.filter((_, i) => i !== idx));
  };

  const addEditItem = () => {
    setEditItems(prev => [...prev, { id: `ei-${Date.now()}`, name: '', price: 0, assignedTo: [] }]);
  };

  if (editing) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-card border-1.5 border-primary rounded-2xl p-4 shadow-card w-full max-w-sm"
      >
        <div className="flex items-center justify-between mb-3">
          <p className="font-display text-sm text-foreground">Edit Bill</p>
          <div className="flex gap-1">
            <button onClick={saveEdit} className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <Check className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setEditing(false)} className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {editItems.map((item, idx) => (
            <div key={item.id} className="flex items-center gap-2">
              <input
                className="flex-1 text-sm bg-muted rounded-lg px-2 py-1.5 border-1.5 border-foreground/20 focus:border-foreground outline-none"
                value={item.name}
                onChange={(e) => updateEditItem(idx, 'name', e.target.value)}
                placeholder="Item Name"
              />
              <input
                className="w-20 text-sm font-mono-data bg-muted rounded-lg px-2 py-1.5 border-1.5 border-foreground/20 focus:border-foreground outline-none"
                value={item.price || ''}
                onChange={(e) => updateEditItem(idx, 'price', e.target.value)}
                type="number"
                step="0.01"
                placeholder="0.00"
              />
              <button onClick={() => removeEditItem(idx)} className="h-6 w-6 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        <button onClick={addEditItem} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-2 px-2 py-1 transition-colors">
          <Plus className="h-3 w-3" /> Add Item
        </button>
        <div className="border-t border-foreground/10 my-2" />
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">Tax</label>
            <input className="w-full text-sm font-mono-data bg-muted rounded-lg px-2 py-1.5 border-1.5 border-foreground/20 focus:border-foreground outline-none" value={editTax} onChange={(e) => setEditTax(e.target.value)} type="number" step="0.01" />
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">Tip</label>
            <input className="w-full text-sm font-mono-data bg-muted rounded-lg px-2 py-1.5 border-1.5 border-foreground/20 focus:border-foreground outline-none" value={editTip} onChange={(e) => setEditTip(e.target.value)} type="number" step="0.01" />
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="bg-card border-1.5 border-foreground rounded-2xl p-4 shadow-card w-full max-w-sm"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <ReceiptIcon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-sm text-foreground">Receipt Scanned</p>
          <p className="text-xs text-muted-foreground font-mono-data">
            {receipt.items.length} items · {currency}{subtotal.toFixed(2)}
          </p>
        </div>
        {isCreator && (
          <div className="flex gap-1 shrink-0">
            <button
              onClick={startEdit}
              className="h-7 w-7 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
              title="Edit bill"
            >
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            {confirmDelete ? (
              <div className="flex gap-1 items-center">
                <span className="text-xs text-destructive">Delete?</span>
                <button
                  onClick={() => { onDeleteReceipt?.(receipt.id, messageId || ''); setConfirmDelete(false); }}
                  className="h-7 w-7 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="h-7 w-7 rounded-full bg-muted flex items-center justify-center"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="h-7 w-7 rounded-full bg-muted hover:bg-destructive/10 flex items-center justify-center transition-colors"
                title="Delete bill"
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Items */}
      <div className="space-y-1">
        {receipt.items.map((item) => (
          <motion.div
            key={item.id}
            layout
            className="flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground truncate">{item.name}</p>
            </div>
            <p className="font-mono-data text-sm text-foreground tabular-nums shrink-0">
              {currency}{item.price.toFixed(2)}
            </p>
            <div className="flex gap-1 shrink-0 overflow-x-auto no-scrollbar max-w-[50%]">
              {members.map((m) => (
                <AvatarBubble
                  key={m.id}
                  member={m}
                  size="sm"
                  isActive={item.assignedTo.includes(m.id)}
                  onTap={isCreator ? () => onToggleAssignment(item.id, m.id) : undefined}
                />
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add item inline */}
      {isCreator && addingItem ? (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="flex items-center gap-2 mt-2 px-2"
        >
          <input
            className="flex-1 text-sm bg-muted rounded-lg px-2 py-1.5 border-1.5 border-foreground/20 focus:border-foreground outline-none"
            placeholder="Item Name"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleConfirmAdd()}
            autoFocus
          />
          <input
            className="w-20 text-sm font-mono-data bg-muted rounded-lg px-2 py-1.5 border-1.5 border-foreground/20 focus:border-foreground outline-none"
            placeholder="0.00"
            value={newItemPrice}
            onChange={(e) => setNewItemPrice(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleConfirmAdd()}
            type="number"
            step="0.01"
          />
          <button
            onClick={handleConfirmAdd}
            className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => { setAddingItem(false); setNewItemName(''); setNewItemPrice(''); }}
            className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      ) : isCreator ? (
        <button
          onClick={() => setAddingItem(true)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-2 px-2 py-1 transition-colors"
        >
          <Plus className="h-3 w-3" /> Add Item
        </button>
      ) : null}

      {/* Paid by */}
      <div className="border-t border-foreground/10 my-3" />
      <div className="flex items-center gap-2 px-2 mb-2">
        <span className="text-xs text-muted-foreground">Paid By</span>
        <div className="flex gap-1 overflow-x-auto no-scrollbar max-w-full">
          {members.map((m) => {
            const isPayer = receipt.paidBy === m.id;
            return (
              <button
                key={m.id}
                onClick={isCreator ? () => onChangePayer?.(receipt.id, m.id) : undefined}
                disabled={!isCreator}
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all border-1.5 shrink-0 ${
                  isPayer
                    ? 'bg-primary/15 border-primary/40 text-primary font-medium'
                    : 'bg-muted/50 border-transparent text-muted-foreground hover:border-foreground/20'
                }`}
              >
                <AvatarBubble member={m} size="sm" isActive={isPayer} />
                <span className="max-w-[60px] truncate">{m.name}</span>
              </button>
            );
          })}
        </div>
      </div>


      {/* Tax & Tip */}
      <div className="space-y-1 px-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Tax</span>
          <span className="font-mono-data">{currency}{receipt.tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Tip</span>
          <span className="font-mono-data">{currency}{receipt.tip.toFixed(2)}</span>
        </div>
      </div>

      {/* My Total */}
      <div className="mt-3 bg-primary/10 rounded-xl p-3 border-1.5 border-primary/30">
        <div className="flex justify-between items-baseline">
          <span className="text-sm text-foreground font-medium">Your Total</span>
          <span className="font-display text-xl text-primary">
            {currency}{myTotal.toFixed(2)}
          </span>
        </div>
      </div>

      {/* All totals */}
      <div className="mt-2 flex gap-2 flex-wrap px-1">
        {members.filter(m => m.id !== currentUserId).map((m) => (
          <div key={m.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <AvatarBubble member={m} size="sm" isActive />
            <span className="font-mono-data">{currency}{(totals[m.id] || 0).toFixed(2)}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
