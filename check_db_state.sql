-- check_function_def.sql
-- Run this to view the current source code of the function in the DB

SELECT prosrc 
FROM pg_proc 
WHERE proname = 'create_notification_for_activity';

-- List triggers on activity_logs
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'activity_logs';
