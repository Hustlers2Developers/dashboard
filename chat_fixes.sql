-- Chat fixes to run in Supabase SQL editor.
-- Context: frontend already fixed to insert the creator as a conversation_members
-- row on DM/group creation (src/hooks/use-chat.ts). These are the remaining
-- schema/RLS-side checks and fixes for the reported issues.

-- ============================================================
-- 1) Guarantee delete cascade for "Delete for everyone"
--    (conversations.delete() should wipe members + messages too)
-- ============================================================
-- Check current FK behavior first:
select
  tc.table_name, kcu.column_name, rc.delete_rule
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
join information_schema.referential_constraints rc
  on tc.constraint_name = rc.constraint_name
where tc.table_name in ('conversation_members', 'messages')
  and tc.constraint_type = 'FOREIGN KEY';

-- If delete_rule is not CASCADE for the conversation_id FK on either table,
-- fix it (adjust constraint names to match what the query above returns):
-- alter table conversation_members drop constraint conversation_members_conversation_id_fkey;
-- alter table conversation_members add constraint conversation_members_conversation_id_fkey
--   foreign key (conversation_id) references conversations(id) on delete cascade;
--
-- alter table messages drop constraint messages_conversation_id_fkey;
-- alter table messages add constraint messages_conversation_id_fkey
--   foreign key (conversation_id) references conversations(id) on delete cascade;

-- ============================================================
-- 2) RLS: creator-only delete on conversations
--    "Delete for everyone" must succeed for the creator and be visible
--    to all members afterward (their client should see the row gone /
--    or refetch and find their conversation list update via Realtime).
-- ============================================================
-- Inspect existing policies:
select polname, polcmd, pg_get_expr(polqual, polrelid) as using_expr
from pg_policy
where polrelid = 'conversations'::regclass;

-- Example fix if missing/incorrect (adjust to match your auth scheme —
-- assumes app_user_id is available as auth.uid() or via a mapping table):
-- create policy "creator can delete own conversations"
--   on conversations for delete
--   using (created_by = auth.uid());

-- ============================================================
-- 3) RLS: conversation_members insert policy must allow inserting
--    the OTHER member (not just yourself) when creating a DM/group,
--    since the frontend now inserts both creator + invitee rows
--    in one call.
-- ============================================================
select polname, polcmd, pg_get_expr(polqual, polrelid) as using_expr,
       pg_get_expr(polwithcheck, polrelid) as with_check_expr
from pg_policy
where polrelid = 'conversation_members'::regclass;

-- Example: allow insert if the caller created the parent conversation
-- (covers adding other members at creation time) OR is inserting themself:
-- create policy "creator can add members, self can join"
--   on conversation_members for insert
--   with check (
--     app_user_id = auth.uid()
--     or exists (
--       select 1 from conversations c
--       where c.id = conversation_id and c.created_by = auth.uid()
--     )
--   );

-- ============================================================
-- 4) Realtime: make sure `messages`, `conversation_members`, and
--    `conversations` are in the supabase_realtime publication, and
--    that Broadcast (used for typing indicator) is enabled for the
--    project (Database > Replication, and Realtime > Settings).
-- ============================================================
select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime';

-- If messages / conversation_members / conversations are missing, add them:
-- alter publication supabase_realtime add table messages;
-- alter publication supabase_realtime add table conversation_members;
-- alter publication supabase_realtime add table conversations;

-- ============================================================
-- 5) Backfill: any existing DMs/groups where the creator is missing
--    a conversation_members row (the historical version of the bug
--    just fixed in the frontend) — re-add them so old conversations
--    also show correctly.
-- ============================================================
insert into conversation_members (conversation_id, app_user_id)
select c.id, c.created_by
from conversations c
where not exists (
  select 1 from conversation_members cm
  where cm.conversation_id = c.id and cm.app_user_id = c.created_by
);
