exports.up = function(knex) {
  return knex.schema.raw(`
          CREATE OR REPLACE VIEW public.view_rewards
          AS select
            c.customer_id,
            r.brand_id,
            t.sort_order,
            t.title as tier_title,
            t.title_ar as tier_title_ar,
            t.title_tr as tier_title_tr,
            p.apply_type as perks_apply_type,
            p."type" as perks_type,
            p.title as perks_title,
            p.title_ar as perks_title_ar,
            p.title_tr as perks_title_tr,
            p.value as perks_value,
            t.logo_url,
            p.id as perk_id,
            r.id as reward_id
        from customer_tiers c
        left join rewards r on r.id = c.reward_id 
        left join reward_tiers t on t.id = c.reward_tier_id 
        left join reward_tier_perks p on p.reward_tier_id = t.id
        where r.status = 'ACTIVE';
        `);
};

exports.down = function(knex) {
  return knex.schema.raw(`
          DROP VIEW public.view_rewards;
        `);
};
