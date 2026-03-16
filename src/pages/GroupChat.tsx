import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MOCK_MEMBERS } from '@/lib/mock-data';
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
  const { groupId } = useParams<{ groupId: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [groupName, setGroupName] = useState('');
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(true);
  const feedRef = useRef<HTMLDivElement>(null);

  // Load group info and messages from DB
  useEffect(() => {
    if (!groupId) return;
    loadGroupData();
  }, [groupId]);

  const loadGroupData = async () => {
    setLoading(true);
    // Fetch group name
    const { data: group } = await supabase
      .from('groups')
      .select('name')
      .eq('id', groupId!)
      .single();
    if (group) setGroupName(group.name);

    // Fetch messages
    const { data: msgRows } = await supabase
      .from('messages')
      .select('*')
      .eq('group_id', groupId!)
      .order('created_at', { ascending: true });

    // Fetch receipts for this group
    const { data: receiptRows } = await supabase
      .from('receipts')
      .select('*')
      .eq('group_id', groupId!);

    const receiptsByMsgId = new Map<string, Receipt>();
    if (receiptRows) {
      for (const r of receiptRows) {
        receiptsByMsgId.set(r.message_id, {
          id: r.id,
          items: (r.items as any[]).map((item: any, i: number) => ({
            id: item.id || `ri-${i}`,
            name: item.name,
            price: item.price,
            assignedTo: item.assignedTo || [],
          })),
          tax: Number(r.tax),
          tip: Number(r.tip),
          total: Number(r.total),
          currency: r.currency,
          createdBy: r.created_by,
          createdAt: new Date(r.created_at),
        });
      }
    }

    const chatMessages: ChatMessage[] = (msgRows || []).map(m => ({
      id: m.id,
      type: m.type as 'text' | 'receipt' | 'system',
      content: m.content || undefined,
      receipt: receiptsByMsgId.get(m.id),
      senderId: m.sender_id,
      timestamp: new Date(m.created_at),
    }));

    setMessages(chatMessages);
    setLoading(false);
  };

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
    if (r.createdBy === CURRENT_USER) {
      return sum + (r.total - myTotal);
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

  const handleToggleAssignment = async (receiptId: string, itemId: string, memberId: string) => {
    // Update locally
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
      // Also update in DB
      const newItems = updatedItems.map(i => ({ id: i.id, name: i.name, price: i.price, assignedTo: i.assignedTo }));
      supabase.from('receipts').update({ items: newItems as any }).eq('id', receiptId).then();
      return { ...msg, receipt: { ...msg.receipt, items: updatedItems } };
    }));
  };

  const handleSendMessage = async (text: string) => {
    if (!groupId) return;
    const { data, error } = await supabase
      .from('messages')
      .insert({ group_id: groupId, type: 'text', content: text, sender_id: CURRENT_USER })
      .select()
      .single();
    if (!error && data) {
      const msg: ChatMessage = {
        id: data.id,
        type: 'text',
        content: text,
        senderId: CURRENT_USER,
        timestamp: new Date(data.created_at),
      };
      setMessages(prev => [...prev, msg]);
    }
  };

  const handleUploadReceipt = async (file: File) => {
    if (!groupId) return;
    setScanning(true);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
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

      // Insert message first
      const { data: msgRow, error: msgError } = await supabase
        .from('messages')
        .insert({ group_id: groupId, type: 'receipt', sender_id: CURRENT_USER })
        .select()
        .single();
      if (msgError) throw msgError;

      const items = (data.items || []).map((item: { name: string; price: number }, i: number) => ({
        id: `ni-${Date.now()}-${i}`,
        name: item.name,
        price: item.price,
        assignedTo: [],
      }));

      // Insert receipt linked to message
      const { data: receiptRow, error: rError } = await supabase
        .from('receipts')
        .insert({
          message_id: msgRow.id,
          group_id: groupId,
          items: items as any,
          tax: data.tax || 0,
          tip: data.tip || 0,
          total: data.total || 0,
          currency: data.currency || '$',
          created_by: CURRENT_USER,
        })
        .select()
        .single();
      if (rError) throw rError;

      const newReceipt: Receipt = {
        id: receiptRow.id,
        items,
        tax: data.tax || 0,
        tip: data.tip || 0,
        total: data.total || 0,
        currency: data.currency || '$',
        createdBy: CURRENT_USER,
        createdAt: new Date(receiptRow.created_at),
      };

      const msg: ChatMessage = {
        id: msgRow.id,
        type: 'receipt',
        receipt: newReceipt,
        senderId: CURRENT_USER,
        timestamp: new Date(msgRow.created_at),
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
        groupName={groupName || 'loading...'}
        members={MOCK_MEMBERS}
        onOpenLedger={() => setLedgerOpen(true)}
      />
      <BalanceBar balance={netBalance} currency="$" />

      {/* Chat feed */}
      <div ref={feedRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12 text-muted-foreground text-sm">loading...</div>
        ) : messages.length === 0 ? (
          <div className="flex justify-center py-12 text-muted-foreground text-sm">
            no messages yet — send one or scan a receipt!
          </div>
        ) : (
          messages.map((msg) => {
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
          })
        )}
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
