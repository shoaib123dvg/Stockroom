import { createInsertSchema } from "drizzle-zod";
import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { productsTable } from "./products";
import { z } from "zod/v4";

export const movementsTable = pgTable("inventory_movements", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  quantity: integer("quantity").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertMovementSchema = createInsertSchema(movementsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertMovement = z.infer<typeof insertMovementSchema>;
export type Movement = typeof movementsTable.$inferSelect;