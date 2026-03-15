import { useState, useRef, useEffect } from 'react';
import { MOCK_MEMBERS, MOCK_MESSAGES } from '@/lib/mock-data';
import { ChatMessage, Receipt, ReceiptItem } from '@/lib/types';
import { calculatePersonTotal, simplifyDebts } from '@/lib/split-calculator';
import { GroupHeader } from '@/components/GroupHeader';
import { BalanceBar } from '@/components/BalanceBar';
import { ChatBubble } from '@/components/ChatBubble';
import { SystemMessage } from '@/components/SystemMessage';
import { ReceiptCard } from '@/components/ReceiptCard';
import { ScanningCard } from '@/components/ScanningCard';
import { ChatInput } from '@/components/ChatInput';
import { LedgerDrawer } from '@/components/LedgerDrawer';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const CURRENT_USER = 'me';

export default function GroupChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages, scanning]);

  // Get all receipts from messages
  const allReceipts = messages
    .filter((m): m is ChatMessage & { receipt: Receipt } => m.type === 'receipt' && !!m.receipt)
    .map(m => m.receipt);

  // Calculate net balance for current user
  const netBalance = allReceipts.reduce((sum, r) => {
    const myTotal = calculatePersonTotal(r, CURRENT_USER);
    const receiptTotal = r.total;
    if (r.createdBy === CURRENT_USER) {
      return sum + (receiptTotal - myTotal);
    }
    return sum - myTotal;
  }, 0);

  // Calculate debts
  const balances: Record<string, number> = {};
  for (const m of MOCK_MEMBERS) balances[m.id] = 0;
  for (const r of allReceipts) {
    for (const m of MOCK_MEMBERS) {
      const t = calculatePersonTotal(r, m.id);
      if (r.createdBy === m.id) {
        balances[m.id] += r.total - t;
      } else {
        balances[m.id] -= t;
      }
    }
  }
  const debts = simplifyDebts(balances);

  const handleToggleAssignment = (receiptId: string, itemId: string, memberId: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.type !== 'receipt' || !msg.receipt || msg.receipt.id !== receiptId) return msg;
      const updatedItems: ReceiptItem[] = msg.receipt.items.map(item => {
        if (item.id !== itemId) return item;
        const isAssigned = item.assignedTo.includes(memberId);
        return {
          ...item,
          assignedTo: isAssigned
            ? item.assignedTo.filter(id => id !== memberId)
            : [...item.assignedTo, memberId],
        };
      });
      return { ...msg, receipt: { ...msg.receipt, items: updatedItems } };
    }));
  };

  const handleSendMessage = (text: string) => {
    const msg: ChatMessage = {
      id: `msg-${Date.now()}`,
      type: 'text',
      content: text,
      senderId: CURRENT_USER,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, msg]);
  };

  const handleUploadReceipt = async (file: File) => {
    setScanning(true);

    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove the data:image/...;base64, prefix
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke('scan-receipt', {
        body: { imageBase64: base64, mimeType: file.type },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const now = Date.now();
      const newReceipt: Receipt = {
        id: `r-${now}`,
        items: (data.items || []).map((item: { name: string; price: number }, i: number) => ({
          id: `ni-${now}-${i}`,
          name: item.name,
          price: item.price,
          assignedTo: [],
        })),
        tax: data.tax || 0,
        tip: data.tip || 0,
        total: data.total || 0,
        currency: data.currency || '$',
        createdBy: CURRENT_USER,
        createdAt: new Date(),
      };

      const msg: ChatMessage = {
        id: `msg-${now}`,
        type: 'receipt',
        receipt: newReceipt,
        senderId: CURRENT_USER,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, msg]);
      toast.success('Receipt scanned successfully!');
    } catch (err) {
      console.error('Receipt scan failed:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to scan receipt. Please try again.');
    } finally {
      setScanning(false);
    }
  };

  const getMember = (id: string) => MOCK_MEMBERS.find(m => m.id === id) || MOCK_MEMBERS[0];

  return (
    <div className="h-[100dvh] flex flex-col bg-background max-w-md mx-auto border-x-1.5 border-foreground/10">
      <GroupHeader
        groupName="friday dinner"
        members={MOCK_MEMBERS}
        onOpenLedger={() => setLedgerOpen(true)}
      />
      <BalanceBar balance={netBalance} currency="$" />

      {/* Chat feed */}
      <div ref={feedRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
        {messages.map((msg) => {
          if (msg.type === 'system') {
            return <SystemMessage key={msg.id} content={msg.content || ''} />;
          }
          if (msg.type === 'text') {
            return (
              <ChatBubble
                key={msg.id}
                content={msg.content || ''}
                sender={getMember(msg.senderId)}
                isOwn={msg.senderId === CURRENT_USER}
                timestamp={msg.timestamp}
              />
            );
          }
          if (msg.type === 'receipt' && msg.receipt) {
            return (
              <div key={msg.id} className={`flex ${msg.senderId === CURRENT_USER ? 'justify-end' : 'justify-start'}`}>
                <ReceiptCard
                  receipt={msg.receipt}
                  members={MOCK_MEMBERS}
                  currentUserId={CURRENT_USER}
                  onToggleAssignment={(itemId, memberId) => handleToggleAssignment(msg.receipt!.id, itemId, memberId)}
                />
              </div>
            );
          }
          return null;
        })}
        {scanning && (
          <div className="flex justify-end">
            <ScanningCard />
          </div>
        )}
      </div>

      <ChatInput onSendMessage={handleSendMessage} onUploadReceipt={handleUploadReceipt} isScanning={scanning} />

      <LedgerDrawer
        isOpen={ledgerOpen}
        onClose={() => setLedgerOpen(false)}
        debts={debts}
        members={MOCK_MEMBERS}
        currency="$"
      />
    </div>
  );
}
