
REVOKE EXECUTE ON FUNCTION public.admin_create_subtopic(uuid, text, text, int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_subtopic(uuid, text, text, int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_subtopic(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_move_lesson(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_subtopic(uuid, text, text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_subtopic(uuid, text, text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_subtopic(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_move_lesson(uuid, uuid) TO authenticated;
