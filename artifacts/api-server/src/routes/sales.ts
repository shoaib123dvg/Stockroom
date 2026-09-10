import { Router, type IRouter } from "express";
import { desc, eq, inArray } from "drizzle-orm";
import {
  CreateSaleBody,
  CreateSaleResponse,
  ListSalesQueryParams,
  ListSalesResponse,
} from "@workspace/api-zod";
import {
  db,
  movementsTable,
  productsTable,
  saleItemsTable,
  salesTable,
} from "@workspace/db";

const router: IRouter = Router();

const rounded = (value: number) => Number(value.toFixed(2));

function paymentMethod(value: string) {
  return value as "cash" | "card" | "upi";
}

router.get("/sales", async (req, res, next) => {
  try {
    const { limit = 12 } = ListSalesQueryParams.parse(req.query);
    const sales = await db
      .select()
      .from(salesTable)
      .orderBy(desc(salesTable.createdAt))
      .limit(limit);

    const saleIds = sales.map((sale) => sale.id);
    const itemRows = saleIds.length
      ? await db
          .select({ saleId: saleItemsTable.saleId })
          .from(saleItemsTable)
          .where(inArray(saleItemsTable.saleId, saleIds))
      : [];
    const itemCounts = new Map<number, number>();
    for (const item of itemRows) {
      itemCounts.set(item.saleId, (itemCounts.get(item.saleId) ?? 0) + 1);
    }

    res.json(
      ListSalesResponse.parse(
        sales.map((sale) => ({
          id: sale.id,
          saleNumber: sale.saleNumber,
          itemCount: itemCounts.get(sale.id) ?? 0,
          subtotal: sale.subtotal,
          total: sale.total,
          paymentMethod: paymentMethod(sale.paymentMethod),
          createdAt: sale.createdAt.toISOString(),
        })),
      ),
    );
  } catch (error) {
    next(error);
  }
});

router.post("/sales", async (req, res, next) => {
  try {
    const body = CreateSaleBody.parse(req.body);
    const itemsByProduct = new Map<number, number>();
    for (const item of body.items) {
      itemsByProduct.set(
        item.productId,
        (itemsByProduct.get(item.productId) ?? 0) + item.quantity,
      );
    }

    const data = await db.transaction(async (tx) => {
      const productIds = Array.from(itemsByProduct.keys());
      const products = await tx
        .select()
        .from(productsTable)
        .where(inArray(productsTable.id, productIds));
      const productsById = new Map(products.map((product) => [product.id, product]));

      const lineItems = productIds.map((productId) => {
        const product = productsById.get(productId);
        const quantity = itemsByProduct.get(productId) ?? 0;
        if (!product) {
          throw new Error("One or more products are no longer available");
        }
        if (product.stockOnHand < quantity) {
          throw new Error(`Not enough stock for ${product.name}`);
        }
        return {
          productId,
          productName: product.name,
          sku: product.sku,
          quantity,
          unitPrice: product.unitPrice,
          lineTotal: rounded(product.unitPrice * quantity),
        };
      });

      const subtotal = rounded(
        lineItems.reduce((sum, item) => sum + item.lineTotal, 0),
      );
      const saleNumber = `SALE-${new Date()
        .toISOString()
        .slice(0, 10)
        .replaceAll("-", "")}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
      const [sale] = await tx
        .insert(salesTable)
        .values({
          saleNumber,
          subtotal,
          total: subtotal,
          paymentMethod: body.paymentMethod,
        })
        .returning();

      await tx.insert(saleItemsTable).values(
        lineItems.map((item) => ({
          saleId: sale.id,
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        })),
      );

      for (const item of lineItems) {
        const product = productsById.get(item.productId)!;
        await tx
          .update(productsTable)
          .set({
            stockOnHand: product.stockOnHand - item.quantity,
            updatedAt: new Date(),
          })
          .where(eq(productsTable.id, item.productId));
        await tx.insert(movementsTable).values({
          productId: item.productId,
          type: "out",
          quantity: item.quantity,
          note: `Sale ${saleNumber}`,
        });
      }

      return {
        id: sale.id,
        saleNumber: sale.saleNumber,
        items: lineItems,
        subtotal: sale.subtotal,
        total: sale.total,
        paymentMethod: paymentMethod(sale.paymentMethod),
        createdAt: sale.createdAt.toISOString(),
      };
    });

    res.status(201).json(CreateSaleResponse.parse(data));
  } catch (error) {
    if (error instanceof Error && (
      error.message.startsWith("Not enough stock") ||
      error.message.includes("no longer available")
    )) {
      res.status(400).json({ error: error.message });
      return;
    }
    next(error);
  }
});

export default router;