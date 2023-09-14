
exports.up = function (knex) {
	return knex.schema.raw(
		`ALTER TYPE stamp_reward_log_type_enum ADD VALUE IF NOT EXISTS 'REFUND_STAMP_REWARD_PERK';
    ALTER TYPE stamp_reward_log_type_enum ADD VALUE IF NOT EXISTS 'REMOVE_STAMP_WITH_REDEMPTION_ITEM';`
	)
}

exports.down = async function (knex) {
};