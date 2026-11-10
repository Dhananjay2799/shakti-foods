-- Admin store separation: Shakti Foods / Simpli Ecoware
--
-- Run once in the Supabase SQL editor (safe to run again).
-- Nothing here deletes data.

-- 1. Product archiving ("Delete → Archive" in the admin keeps order history).
--    The admin also works without this column; it records when a product
--    was archived.
alter table public.products
  add column if not exists archived_at timestamptz;

-- 2. Rows that belong to a product carry that product's store, so each
--    store's admin lists only its own stock, stock history, reviews and
--    sample requests. Only tables that have both columns are touched.
do $$
declare
  target text;
  updated integer;
begin
  foreach target in array array[
    'inventory',
    'inventory_transactions',
    'product_reviews',
    'sample_requests'
  ]
  loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = target and column_name = 'storefront'
    ) and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = target and column_name = 'product_id'
    ) then
      execute format(
        'update public.%I as x
            set storefront = p.storefront
           from public.products as p
          where p.product_id = x.product_id
            and p.storefront is not null
            and x.storefront is distinct from p.storefront',
        target
      );

      get diagnostics updated = row_count;
      raise notice '%: % row(s) moved to their product''s store', target, updated;
    else
      raise notice '%: skipped (no storefront/product_id column)', target;
    end if;
  end loop;
end $$;

-- 3. Check: products per store. Every product should be under
--    shakti_foods or ecoware.
select storefront, category, status, count(*) as products
from public.products
where deleted_at is null
group by storefront, category, status
order by storefront, category, status;

-- 4. Check: products that belong to no store (they appear in neither
--    store's admin or website). Expect no rows. If any appear, set their
--    store, e.g.:
--    update public.products set storefront = 'ecoware' where product_id = '...';
select product_id, title, category, storefront
from public.products
where deleted_at is null
  and (storefront is null or storefront not in ('shakti_foods', 'ecoware'));
