import { Router } from "express";
import {
  adminGetProduct,
  adminListProducts,
  createProduct,
  deleteProduct,
  updateProduct,
} from "../controllers/product.controller.js";
import { requireImageKit } from "../config/imagekit.js";
import { authorize, protect } from "../middlewares/auth.middleware.js";
import { uploadProductImages } from "../middlewares/upload.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { ROLES } from "../models/user.model.js";
import {
  adminListProductsRules,
  createProductRules,
  productIdRules,
  updateProductRules,
} from "../validators/product.validator.js";

const router = Router();

router.use(protect, authorize(ROLES.ADMIN));

router.get("/", validate(adminListProductsRules), adminListProducts);
router.get("/:id", validate(productIdRules), adminGetProduct);

// Multipart parsing must run before validation so req.body / req.files are populated.
router.post(
  "/",
  requireImageKit,
  uploadProductImages,
  validate(createProductRules),
  createProduct,
);
router.put(
  "/:id",
  requireImageKit,
  uploadProductImages,
  validate(updateProductRules),
  updateProduct,
);
router.delete("/:id", requireImageKit, validate(productIdRules), deleteProduct);

export default router;
