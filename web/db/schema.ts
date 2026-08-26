import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().default(""),
  displayName: text("display_name").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const profiles = sqliteTable("profiles", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  dataJson: text("data_json").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const templates = sqliteTable("templates", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  dataJson: text("data_json").notNull(),
  visibility: text("visibility", { enum: ["private", "unlisted", "library"] }).notNull().default("private"),
  shareCode: text("share_code"),
  sourceTemplateId: text("source_template_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  publishedAt: text("published_at"),
}, (table) => [
  index("idx_templates_owner_user_id").on(table.ownerUserId),
  index("idx_templates_library_published_at").on(table.visibility, table.publishedAt),
  uniqueIndex("idx_templates_share_code").on(table.shareCode),
]);

export const userTemplates = sqliteTable("user_templates", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  templateId: text("template_id").notNull().references(() => templates.id, { onDelete: "cascade" }),
  isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
  installedAt: text("installed_at").notNull(),
}, (table) => [
  uniqueIndex("idx_user_templates_user_template").on(table.userId, table.templateId),
  uniqueIndex("idx_user_templates_one_primary").on(table.userId).where(sql`${table.isPrimary} = 1`),
  index("idx_user_templates_user_id").on(table.userId),
]);
