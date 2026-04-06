import {
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

/**
 * One row per user. Stores the full preset library as a JSON snapshot.
 * Upserted on each backup; pulled on restore.
 * `presets_encrypted` contains the AES-GCM encrypted payload.
 */
export const presetLibrary = pgTable(
  'preset_library',
  {
    ownerId: text('owner_id')
      .notNull()
      .default(sql`auth.user_id()`),
    presets: jsonb('presets')
      .$type<object[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    presets_encrypted: text('presets_encrypted'),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.ownerId], name: 'preset_library_pkey' }),
  }),
)
