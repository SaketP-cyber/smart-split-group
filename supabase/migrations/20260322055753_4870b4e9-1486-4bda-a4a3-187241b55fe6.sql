-- Allow members to delete receipts they created
CREATE POLICY "Creator can delete receipts"
ON public.receipts
FOR DELETE
TO authenticated
USING (created_by = auth.uid()::text AND is_group_member(group_id, auth.uid()));

-- Allow members to delete their own messages
CREATE POLICY "Sender can delete messages"
ON public.messages
FOR DELETE
TO authenticated
USING (sender_id = auth.uid()::text AND is_group_member(group_id, auth.uid()));