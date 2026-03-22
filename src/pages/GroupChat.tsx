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
  const [settlements, setSettlements] = useState<{ from_user: string; to_user: string; amount: number }[]>([]);
  const DAILY_SCAN_LIMIT = 2;
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!groupId) return;
    loadGroupData();

    // Subscribe to realtime messages, members, and settlements
    const channel = supabase
      .channel(`group-realtime-${groupId}`)
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
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_members',
          filter: `group_id=eq.${groupId}`,
        },
        async (payload) => {
          const gm = payload.new as any;
          // Fetch the new member's profile and add to members list
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, display_name, initials, color')
            .eq('id', gm.user_id)
            .single();
          if (profile) {
            setMembers(prev => {
              if (prev.some(m => m.id === profile.id)) return prev;
              return [...prev, {
                id: profile.id,
                name: profile.display_name || profile.initials,
                initials: profile.initials,
                color: profile.color,
              }];
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'settlements',
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          const s = payload.new as any;
          setSettlements(prev => [...prev, {
            from_user: s.from_user,
            to_user: s.to_user,
            amount: Number(s.amount),
          }]);
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

    setMessages(chatMessages);
    setLoading(false);
  };

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

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages, scanning]);

  // Fetch settlements for this group (initial load only; realtime handles updates)
  useEffect(() => {
    if (!groupId) return;
    supabase
      .from('settlements')
      .select('from_user, to_user, amount')
      .eq('group_id', groupId)
      .then(({ data }) => setSettlements((data as any) || []));
  }, [groupId]);

  // Get all receipts from messages
  const allReceipts = messages
    .filter((m): m is ChatMessage & { receipt: Receipt } => m.type === 'receipt' && !!m.receipt)
    .map(m => m.receipt);

  // Calculate debts (factoring in settlements)
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
  // Apply settlements
  for (const s of settlements) {
    if (balances[s.from_user] !== undefined) balances[s.from_user] += s.amount;
    if (balances[s.to_user] !== undefined) balances[s.to_user] -= s.amount;
  }
  const debts = simplifyDebts(balances);

  // Net balance for current user
  const netBalance = balances[CURRENT_USER] || 0;

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
      if (scanLimitReached) {
        toast.error(`Daily AI scan limit reached (${DAILY_SCAN_LIMIT}/day). Use manual bill entry instead.`);
        setManualBillOpen(true);
        return;
      }

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

  const handleManualBill = async (items: { name: string; price: number }[], tax: number, tip: number, payerId: string) => {
    if (!groupId) return;
    try {
      const { data: msgRow, error: msgError } = await supabase
        .from('messages')
        .insert({ group_id: groupId, type: 'receipt', sender_id: CURRENT_USER })
        .select()
        .single();
      if (msgError) throw msgError;

      const receiptItems = items.map((item, i) => ({
        id: `mi-${Date.now()}-${i}`,
        name: item.name,
        price: item.price,
        assignedTo: [],
      }));
      const total = items.reduce((s, i) => s + i.price, 0) + tax + tip;

      const { data: receiptRow, error: rError } = await supabase
        .from('receipts')
        .insert({
          message_id: msgRow.id,
          group_id: groupId,
          items: receiptItems as any,
          tax,
          tip,
          total,
          currency: '$',
          created_by: payerId,
        })
        .select()
        .single();
      if (rError) throw rError;

      const newReceipt: Receipt = {
        id: receiptRow.id,
        items: receiptItems,
        tax,
        tip,
        total,
        currency: '$',
        createdBy: payerId,
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
      toast.success('Bill added!');
    } catch (err) {
      console.error('Manual bill failed:', err);
      toast.error('Failed to add bill.');
    }
  };

  const handleSettleUp = async (fromId: string, toId: string, amount: number) => {
    if (!groupId) return;
    try {
      await supabase.from('settlements').insert({
        group_id: groupId,
        from_user: fromId,
        to_user: toId,
        amount,
      } as any);

      // Optimistically add settlement locally (realtime will handle other users)
      setSettlements(prev => [...prev, { from_user: fromId, to_user: toId, amount }]);

      // Add system message
      const fromMember = getMember(fromId);
      const toMember = getMember(toId);
      const { data: msgRow } = await supabase
        .from('messages')
        .insert({
          group_id: groupId,
          type: 'system',
          content: `${fromMember.name} paid ${toMember.name} $${amount.toFixed(2)}`,
          sender_id: CURRENT_USER,
        })
        .select()
        .single();

      if (msgRow) {
        setMessages(prev => [...prev, {
          id: msgRow.id,
          type: 'system',
          content: msgRow.content || '',
          senderId: CURRENT_USER,
          timestamp: new Date(msgRow.created_at),
        }]);
      }
      toast.success('Settled up!');
    } catch (err) {
      console.error('Settle up failed:', err);
      toast.error('Failed to settle up.');
    }
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-background max-w-md mx-auto border-x-1.5 border-foreground/10 overflow-hidden">
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

      <ChatInput
        onSendMessage={handleSendMessage}
        onUploadReceipt={handleUploadReceipt}
        onManualBill={() => setManualBillOpen(true)}
        isScanning={scanning}
        scanLimitReached={scanLimitReached}
      />

      <ManualBillDialog
        isOpen={manualBillOpen}
        onClose={() => setManualBillOpen(false)}
        members={members}
        currentUserId={CURRENT_USER}
        onSubmit={handleManualBill}
      />

      <LedgerDrawer
        isOpen={ledgerOpen}
        onClose={() => setLedgerOpen(false)}
        debts={debts}
        members={members}
        currency="$"
        onSettleUp={handleSettleUp}
      />
    </div>
  );
}
