import { createInsertSchema } from "drizzle-zod";
import {
  doublePrecision,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { productsTable } from "./products";
import { z } from "zod/v4";

export const salesTable = pgTable("sales", {
  id: serial("id").primaryKey(),
  saleNumber: text("sale_number").notNull().unique(),
  subtotal: doublePrecision("subtotal").notNull(),
  total: doublePrecision("total").notNull(),
  paymentMethod: text("payment_method").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const saleItemsTable = pgTable("sale_items", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id")
    .notNull()
    .references(() => salesTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => productsTable.id, {
    onDelete: "set null",
  }),
  productName: text("product_name").notNull(),
  sku: text("sku").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: doublePrecision("unit_price").notNull(),
  lineTotal: doublePrecision("line_total").notNull(),
});

export const insertSaleSchema = createInsertSchema(salesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type Sale = typeof salesTable.$inferSelect;
export type SaleItem = typeof saleItemsTable.$inferSelect;