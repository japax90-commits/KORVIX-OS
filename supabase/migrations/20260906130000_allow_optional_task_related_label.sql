alter table public.tasks alter column related_entity_label drop not null;
alter table public.tasks alter column related_entity_label set default '';