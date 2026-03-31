do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'resource_type'
      and e.enumlabel = 'general_bed'
  ) then
    alter type public.resource_type add value 'general_bed';
  end if;
end
$$;