-- Update get_mortgage_bundle function to include term_months
-- This migration updates the database function to return the term_months field
-- that was added in the previous term_months migration

CREATE OR REPLACE FUNCTION get_mortgage_bundle(m_id UUID)
RETURNS JSON
LANGUAGE plpgsql
AS $$
declare
  result json;
begin
  select json_build_object(
    'mortgage', row_to_json(m.*),
    'property', row_to_json(p_with_bonus),
    'extra_installments', coalesce(
       (select json_agg(ei.*) from extra_installments ei where ei.mortgage_id = m.id),
       '[]'::json),
    'new_rates', coalesce(
       (select json_agg(nr.*) from new_rates nr where nr.mortgage_id = m.id),
       '[]'::json)
  ) into result
  from mortgages m
  join (
    select p.*, property_bonus(p.id) as bonus
    from properties p
  ) p_with_bonus on p_with_bonus.id = m.property_id
  where m.id = m_id;

  return result;
end;
$$; 