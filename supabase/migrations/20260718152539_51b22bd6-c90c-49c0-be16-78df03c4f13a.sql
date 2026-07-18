ALTER TABLE public.subjects ADD CONSTRAINT subjects_drive_folder_id_key UNIQUE (drive_folder_id);
ALTER TABLE public.topics ADD CONSTRAINT topics_drive_folder_id_key UNIQUE (drive_folder_id);
ALTER TABLE public.lessons ADD CONSTRAINT lessons_drive_file_id_key UNIQUE (drive_file_id);