import { type Kysely, sql } from "kysely"

export async function up(db: Kysely<unknown>): Promise<void> {
  // Add merged_into_id for account linking
  await db.schema
    .alterTable("users")
    .addColumn("merged_into_id", "uuid", (col) => col.references("users.id"))
    .execute()

  // Create notifications table
  await db.schema
    .createTable("notifications")
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn("user_id", "uuid", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("type", "text", (col) => col.notNull())
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("body", "text")
    .addColumn("feed_id", "uuid", (col) =>
      col.references("feeds.id").onDelete("set null"),
    )
    .addColumn("is_read", "boolean", (col) => col.notNull().defaultTo(false))
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute()

  await sql`CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false`.execute(
    db,
  )
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("notifications").ifExists().execute()
  await db.schema.alterTable("users").dropColumn("merged_into_id").execute()
}
