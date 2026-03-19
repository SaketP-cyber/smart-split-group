import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ChatMessage, Member, Receipt, ReceiptItem } from '@/lib/types';
import { calculatePersonTotal, simplifyDebts } from '@/lib/split-calculator';
import { GroupHeader } from '@/components/GroupHeader';
import { BalanceBar } from '@/components/BalanceBar';
import { ChatBubble } from '@/components/ChatBubble';
import { SystemMessage } from '@/components/SystemMessage';
import { ReceiptCard } from '@/components/ReceiptCard';
import { ScanningCard } from '@/components/ScanningCard';
import { ChatInput } from '@/components/ChatInput';
import { LedgerDrawer } from '@/components/LedgerDrawer';
import { ManualBillDialog } from '@/components/ManualBillDialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export default function GroupChat() {
  const { user } = useAuth();
  const CURRENT_USER = user?.id || '';
  const { groupId } = useParams<{ groupId: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [groupName, setGroupName] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [manualBillOpen, setManualBillOpen] = useState(false);
  const [todayScanCount, setTodayScanCount] = useState(0);
  const DAILY_SCAN_LIMIT = 2;
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!groupId) return;
    loadGroupData();

    // Subscribe to realtime messages
    const channel = supabase
      .channel(`group-messages-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `group_id=eq.${groupId}`,
        },
        async (payload) => {
          const m = payload.new as any;
          // Skip if sent by current user (already added optimistically)
          if (m.sender_id === CURRENT_USER) return;

          let receipt: Receipt | undefined;
          if (m.type === 'receipt') {
            const { data: r } = await supabase
              .from('receipts')
              .select('*')
              .eq('message_id', m.id)
              .single();
            if (r) {
              receipt = {
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
              };
            }
          }

          const msg: ChatMessage = {
            id: m.id,
            type: m.type as 'text' | 'receipt' | 'system',
            content: m.content || undefined,
            receipt,
            senderId: m.sender_id,
            timestamp: new Date(m.created_at),
          };
          setMessages(prev => [...prev, msg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, CURRENT_USER]);

  const loadGroupData = async () => {
    setLoading(true);

    // Fetch group name + members JSON
    const { data: group } = await supabase
      .from('groups')
      .select('name, members')
      .eq('id', groupId!)
      .single();
    if (group) {
      setGroupName(group.name);
      // members is a JSONB array of { id, name, initials, color }
      const membersList = (group.members as any[]) || [];
      // Also fetch profiles for all group_members to ensure we have real data
      const { data: gmRows } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId!);
      
      if (gmRows && gmRows.length > 0) {
        const userIds = gmRows.map(gm => gm.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, initials, color')
          .in('id', userIds);
        
        if (profiles) {
          const realMembers: Member[] = profiles.map(p => ({
            id: p.id,
            name: p.display_name || p.initials,
            initials: p.initials,
            color: p.color,
          }));
          setMembers(realMembers);
        } else {
          setMembers(membersList);
        }
      } else {
        setMembers(membersList);
      }
    }

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

  // Fetch today's scan count
  useEffect(() => {
    if (!CURRENT_USER) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    supabase
      .from('receipts')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', CURRENT_USER)
      .gte('created_at', today.toISOString())
      .then(({ count }) => setTodayScanCount(count || 0));
  }, [CURRENT_USER, messages]);

  const scanLimitReached = todayScanCount >= DAILY_SCAN_LIMIT;
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
  for (const m of members) balances[m.id] = 0;
  for (const r of allReceipts) {
    for (const m of members) {
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
      const newItems = updatedItems.map(i => ({ id: i.id, name: i.name, price: i.price, assignedTo: i.assignedTo }));
      supabase.from('receipts').update({ items: newItems as any }).eq('id', receiptId).then();
      return { ...msg, receipt: { ...msg.receipt, items: updatedItems } };
    }));
  };

  const handleAddItem = async (receiptId: string, name: string, price: number) => {
    const newItem: ReceiptItem = {
      id: `ni-${Date.now()}`,
      name,
      price,
      assignedTo: [CURRENT_USER], // auto-assign to current user
    };

    setMessages(prev => prev.map(msg => {
      if (msg.type !== 'receipt' || !msg.receipt || msg.receipt.id !== receiptId) return msg;
      const updatedItems = [...msg.receipt.items, newItem];
      const newTotal = updatedItems.reduce((s, i) => s + i.price, 0) + msg.receipt.tax + msg.receipt.tip;
      const itemsJson = updatedItems.map(i => ({ id: i.id, name: i.name, price: i.price, assignedTo: i.assignedTo }));
      supabase.from('receipts').update({ items: itemsJson as any, total: newTotal }).eq('id', receiptId).then();
      return { ...msg, receipt: { ...msg.receipt, items: updatedItems, total: newTotal } };
    }));
  };

  const handleChangePayer = async (receiptId: string, payerId: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.type !== 'receipt' || !msg.receipt || msg.receipt.id !== receiptId) return msg;
      supabase.from('receipts').update({ created_by: payerId }).eq('id', receiptId).then();
      return { ...msg, receipt: { ...msg.receipt, createdBy: payerId } };
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

  const getMember = (id: string) => members.find(m => m.id === id) || { id, name: '??', initials: '??', color: 'bg-muted text-muted-foreground border-muted' };

  return (
    <div className="h-[100dvh] flex flex-col bg-background max-w-md mx-auto border-x-1.5 border-foreground/10">
      <GroupHeader
        groupName={groupName || 'loading...'}
        groupId={groupId || ''}
        members={members}
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
                    members={members}
                    currentUserId={CURRENT_USER}
                    onToggleAssignment={(itemId, memberId) => handleToggleAssignment(msg.receipt!.id, itemId, memberId)}
                    onAddItem={handleAddItem}
                    onChangePayer={handleChangePayer}
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
        members={members}
        currency="$"
      />
    </div>
  );
}
