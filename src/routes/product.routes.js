import { Router } from "express";
import { getProduct, listProducts } from "../controllers/product.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import { listProductsRules, productIdRules } from "../validators/product.validator.js";

const router = Router();

// Public: guests and signed-in users can browse active products.
router.get("/", validate(listProductsRules), listProducts);
router.get("/:id", validate(productIdRules), getProduct);

export default router;
