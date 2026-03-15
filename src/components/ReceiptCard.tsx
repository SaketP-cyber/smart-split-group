import { motion } from 'framer-motion';
import { Receipt as ReceiptIcon, Plus } from 'lucide-react';
import { Receipt, Member } from '@/lib/types';
import { AvatarBubble } from './AvatarBubble';
import { calculateAllTotals } from '@/lib/split-calculator';
import { useState } from 'react';

interface ReceiptCardProps {
  receipt: Receipt;
  members: Member[];
  currentUserId: string;
  onToggleAssignment: (itemId: string, memberId: string) => void;
}

export function ReceiptCard({ receipt, members, currentUserId, onToggleAssignment }: ReceiptCardProps) {
  const totals = calculateAllTotals(receipt, members);
  const myTotal = totals[currentUserId] || 0;
  const subtotal = receipt.items.reduce((s, i) => s + i.price, 0);
  const [addingItem, setAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="bg-card border-1.5 border-foreground rounded-2xl p-4 shadow-card w-full max-w-sm"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <ReceiptIcon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-display text-sm text-foreground">receipt scanned</p>
          <p className="text-xs text-muted-foreground font-mono-data">
            {receipt.items.length} items · {receipt.currency}{subtotal.toFixed(2)}
          </p>
        </div>
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
              {receipt.currency}{item.price.toFixed(2)}
            </p>
            <div className="flex gap-1 shrink-0">
              {members.map((m) => (
                <AvatarBubble
                  key={m.id}
                  member={m}
                  size="sm"
                  isActive={item.assignedTo.includes(m.id)}
                  onTap={() => onToggleAssignment(item.id, m.id)}
                />
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add item inline */}
      {addingItem ? (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="flex gap-2 mt-2 px-2"
        >
          <input
            className="flex-1 text-sm bg-muted rounded-lg px-2 py-1.5 border-1.5 border-foreground/20 focus:border-foreground outline-none"
            placeholder="item name"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            autoFocus
          />
          <input
            className="w-20 text-sm font-mono-data bg-muted rounded-lg px-2 py-1.5 border-1.5 border-foreground/20 focus:border-foreground outline-none"
            placeholder="0.00"
            value={newItemPrice}
            onChange={(e) => setNewItemPrice(e.target.value)}
            type="number"
            step="0.01"
          />
        </motion.div>
      ) : (
        <button
          onClick={() => setAddingItem(true)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-2 px-2 py-1 transition-colors"
        >
          <Plus className="h-3 w-3" /> add item
        </button>
      )}

      {/* Divider */}
      <div className="border-t border-foreground/10 my-3" />

      {/* Tax & Tip */}
      <div className="space-y-1 px-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>tax</span>
          <span className="font-mono-data">{receipt.currency}{receipt.tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>tip</span>
          <span className="font-mono-data">{receipt.currency}{receipt.tip.toFixed(2)}</span>
        </div>
      </div>

      {/* My Total */}
      <div className="mt-3 bg-primary/10 rounded-xl p-3 border-1.5 border-primary/30">
        <div className="flex justify-between items-baseline">
          <span className="text-sm text-foreground font-medium">your total</span>
          <span className="font-display text-xl text-primary">
            {receipt.currency}{myTotal.toFixed(2)}
          </span>
        </div>
      </div>

      {/* All totals */}
      <div className="mt-2 flex gap-2 flex-wrap px-1">
        {members.filter(m => m.id !== currentUserId).map((m) => (
          <div key={m.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <AvatarBubble member={m} size="sm" isActive />
            <span className="font-mono-data">{receipt.currency}{(totals[m.id] || 0).toFixed(2)}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
