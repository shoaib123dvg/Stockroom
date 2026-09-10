import { Router, type IRouter } from "express";
import healthRouter from "./health";
import inventoryRouter from "./inventory";
import salesRouter from "./sales";

const router: IRouter = Router();

router.use(healthRouter);
router.use(inventoryRouter);
router.use(salesRouter);

export default router;
