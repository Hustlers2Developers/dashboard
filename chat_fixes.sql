-- Chat fixes to run in Supabase SQL editor.
-- Context: frontend already fixed to insert the creator as a conversation_members
-- row on DM/group creation (src/hooks/use-chat.ts). These are the remaining
-- schema/RLS-side checks and fixes for the reported issues.

-- ============================================================
-- 0) DIAGNOSTIC (run this FIRST): every broken dm conversation found
--    so far has exactly 1 member — the creator — and the OTHER person
--    never lands. If the frontend inserts [me, them] in a single
--    statement and only "me" ends up in the table, something on the
--    database side must ALSO be auto-inserting the creator (e.g. an
--    AFTER INSERT trigger on conversations), which then collides with
--    the frontend's own insert of that same (conversation_id, me) row
--    in the same statement — causing the whole 2-row insert to be
--    rejected, including the other person's row.
--    This checks for exactly that kind of trigger.
-- ============================================================
select event_object_table, trigger_name, action_timing, event_manipulation, action_statement
from information_schema.triggers
where event_object_table in ('conversations', 'conversation_members');

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

-- ============================================================
-- 2) RLS: creator-only delete on conversations
-- ============================================================
select polname, polcmd, pg_get_expr(polqual, polrelid) as using_expr
from pg_policy
where polrelid = 'conversations'::regclass;

-- ============================================================
-- 3) RLS: conversation_members insert policy
-- ============================================================
select polname, polcmd, pg_get_expr(polqual, polrelid) as using_expr,
       pg_get_expr(polwithcheck, polrelid) as with_check_expr
from pg_policy
where polrelid = 'conversation_members'::regclass;

-- ============================================================
-- 4) Realtime publication check
-- ============================================================
select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime';

-- ============================================================
-- 5) Backfill: creator missing from own conversation
-- ============================================================
insert into conversation_members (conversation_id, app_user_id)
select c.id, c.created_by
from conversations c
where not exists (
  select 1 from conversation_members cm
  where cm.conversation_id = c.id and cm.app_user_id = c.created_by
);

-- ============================================================
-- 6) DIAGNOSTIC: find "broken" DMs — any dm-kind conversation that
--    does NOT have exactly 2 distinct members. These are half-created
--    rows from earlier failed attempts (e.g. only one side got a
--    membership row before an error). The frontend's "reuse existing
--    DM" lookup skips these (it requires exactly 2 members), so every
--    time you pick the same person again it tries to create ANOTHER
--    new conversation — if that also partially fails, you can end up
--    with several orphaned dm rows for the same pair of people.
-- ============================================================
select c.id as conversation_id, c.created_by, c.created_at, count(cm.app_user_id) as member_count,
       array_agg(cm.app_user_id) as member_ids
from conversations c
left join conversation_members cm on cm.conversation_id = c.id
where c.kind = 'dm'
group by c.id, c.created_by, c.created_at
having count(cm.app_user_id) <> 2
order by c.created_at desc;

-- ============================================================
-- 7) DIAGNOSTIC: find duplicate DMs between the exact same pair of
--    people (multiple conversation rows with the same 2 members) —
--    these would also confuse the reuse lookup and pile up as clutter.
-- ============================================================
select member_pair, array_agg(conversation_id) as conversation_ids, count(*) as dupes
from (
  select cm.conversation_id,
         array_agg(cm.app_user_id order by cm.app_user_id) as member_pair
  from conversation_members cm
  join conversations c on c.id = cm.conversation_id and c.kind = 'dm'
  group by cm.conversation_id
  having count(*) = 2
) sub
group by member_pair
having count(*) > 1;

-- ============================================================
-- 8) Cleanup: the 3 broken 1-member dm rows created while debugging
--    this (each only has the creator — the other member insert kept
--    failing because of the frontend/trigger collision, now fixed).
--    Cascade takes care of their (nonexistent) members/messages.
-- ============================================================
delete from conversations where id in (
  'c1804aa8-6b21-4631-9de8-421c8776c401',
  '0fa2b097-7ddd-4dbe-b76b-d050a2a064cc',
  '03927ff7-0e44-46b7-b8d6-89bb5c9daca8'
);
