import { Router, type IRouter } from "express";
import { and, desc, eq, gte, ilike, or } from "drizzle-orm";
import {
  AdjustProductStockBody,
  AdjustProductStockParams,
  CreateProductBody,
  CreateProductResponse,
  DeleteProductParams,
  GetDashboardSummaryResponse,
  ListMovementsQueryParams,
  ListMovementsResponse,
  ListProductsQueryParams,
  ListProductsResponse,
  UpdateProductBody,
  UpdateProductParams,
} from "@workspace/api-zod";
import {
  db,
  movementsTable,
  productsTable,
} from "@workspace/db";

const router: IRouter = Router();

function toProductResponse(product: typeof productsTable.$inferSelect) {
  const status =
    product.stockOnHand === 0
      ? "out_of_stock"
      : product.stockOnHand <= product.reorderPoint
        ? "low_stock"
        : "healthy";

  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    category: product.category,
    unitPrice: product.unitPrice,
    stockOnHand: product.stockOnHand,
    reorderPoint: product.reorderPoint,
    stockValue: Number((product.unitPrice * product.stockOnHand).toFixed(2)),
    status,
    updatedAt: product.updatedAt.toISOString(),
  };
}

router.get("/products", async (req, res, next) => {
  try {
    const params = ListProductsQueryParams.parse(req.query);
    const filters = [];
    if (params.search) {
      const search = `%${params.search}%`;
      filters.push(
        or(ilike(productsTable.name, search), ilike(productsTable.sku, search)),
      );
    }
    if (params.category) {
      filters.push(eq(productsTable.category, params.category));
    }

    const products = await db
      .select()
      .from(productsTable)
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(productsTable.name);

    const data = products
      .map(toProductResponse)
      .filter((product) =>
        params.status && params.status !== "all"
          ? product.status === params.status
          : true,
      );

    res.json(ListProductsResponse.parse(data));
  } catch (error) {
    next(error);
  }
});

router.post("/products", async (req, res, next) => {
  try {
    const body = CreateProductBody.parse(req.body);
    const [product] = await db
      .insert(productsTable)
      .values(body)
      .returning();
    const data = toProductResponse(product);
    res.status(201).json(CreateProductResponse.parse(data));
  } catch (error) {
    next(error);
  }
});

router.patch("/products/:id", async (req, res, next) => {
  try {
    const { id } = UpdateProductParams.parse({ id: Number(req.params.id) });
    const body = UpdateProductBody.parse(req.body);
    const [product] = await db
      .update(productsTable)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(productsTable.id, id))
      .returning();
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json(toProductResponse(product));
  } catch (error) {
    next(error);
  }
});

router.delete("/products/:id", async (req, res, next) => {
  try {
    const { id } = DeleteProductParams.parse({ id: Number(req.params.id) });
    const [product] = await db
      .delete(productsTable)
      .where(eq(productsTable.id, id))
      .returning({ id: productsTable.id });
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.post("/products/:id/stock", async (req, res, next) => {
  try {
    const { id } = AdjustProductStockParams.parse({
      id: Number(req.params.id),
    });
    const body = AdjustProductStockBody.parse(req.body);
    const data = await db.transaction(async (tx) => {
      const [product] = await tx
        .select()
        .from(productsTable)
        .where(eq(productsTable.id, id));
      if (!product) {
        return null;
      }

      const delta = body.type === "out" ? -body.quantity : body.quantity;
      const nextStock = product.stockOnHand + delta;
      if (nextStock < 0) {
        throw new Error("Stock cannot go below zero");
      }

      const [updated] = await tx
        .update(productsTable)
        .set({ stockOnHand: nextStock, updatedAt: new Date() })
        .where(eq(productsTable.id, id))
        .returning();
      await tx.insert(movementsTable).values({
        productId: id,
        type: body.type,
        quantity: body.quantity,
        note: body.note ?? null,
      });
      return toProductResponse(updated);
    });

    if (!data) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json(data);
  } catch (error) {
    if (error instanceof Error && error.message === "Stock cannot go below zero") {
      res.status(400).json({ error: error.message });
      return;
    }
    next(error);
  }
});

router.get("/movements", async (req, res, next) => {
  try {
    const { limit = 8 } = ListMovementsQueryParams.parse(req.query);
    const rows = await db
      .select({
        id: movementsTable.id,
        productId: movementsTable.productId,
        productName: productsTable.name,
        type: movementsTable.type,
        quantity: movementsTable.quantity,
        note: movementsTable.note,
        createdAt: movementsTable.createdAt,
      })
      .from(movementsTable)
      .innerJoin(productsTable, eq(movementsTable.productId, productsTable.id))
      .orderBy(desc(movementsTable.createdAt))
      .limit(limit);

    res.json(
      ListMovementsResponse.parse(
        rows.map((movement) => ({
          ...movement,
          type: movement.type as "in" | "out" | "adjustment",
          createdAt: movement.createdAt.toISOString(),
        })),
      ),
    );
  } catch (error) {
    next(error);
  }
});

router.get("/dashboard/summary", async (_req, res, next) => {
  try {
    const products = await db.select().from(productsTable);
    const since = new Date();
    since.setDate(since.getDate() - 6);
    const movements = await db
      .select({
        type: movementsTable.type,
        quantity: movementsTable.quantity,
        createdAt: movementsTable.createdAt,
      })
      .from(movementsTable)
      .where(
        gte(movementsTable.createdAt, since),
      )
      .orderBy(movementsTable.createdAt);

    const trend = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(since);
      date.setDate(since.getDate() + index);
      const key = date.toISOString().slice(0, 10);
      return { date: key, inbound: 0, outbound: 0 };
    });

    for (const movement of movements) {
      const point = trend.find(
        (entry) => entry.date === movement.createdAt.toISOString().slice(0, 10),
      );
      if (!point) continue;
      if (movement.type === "out") {
        point.outbound += movement.quantity;
      } else {
        point.inbound += movement.quantity;
      }
    }

    res.json(
      GetDashboardSummaryResponse.parse({
        totalProducts: products.length,
        totalUnits: products.reduce((total, product) => total + product.stockOnHand, 0),
        inventoryValue: Number(
          products
            .reduce(
              (total, product) =>
                total + product.unitPrice * product.stockOnHand,
              0,
            )
            .toFixed(2),
        ),
        lowStockCount: products.filter(
          (product) =>
            product.stockOnHand > 0 &&
            product.stockOnHand <= product.reorderPoint,
        ).length,
        outOfStockCount: products.filter((product) => product.stockOnHand === 0)
          .length,
        movementTrend: trend,
      }),
    );
  } catch (error) {
    next(error);
  }
});

export default router;