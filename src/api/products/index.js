import Express from "express";
import createHttpError from "http-errors";
import multer from "multer";
import q2m from "query-to-mongo";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import ProductsModel from "./model.js";
import { checkProductsSchema, triggerBadRequest } from "../users/validation.js";
import { JWTAuthMiddleware } from "../../lib/auth/jwt.js";

const productRouter = Express.Router();

productRouter.post(
  "/",
  checkProductsSchema,
  triggerBadRequest,
  async (req, res, next) => {
    try {
      const product = new ProductsModel(req.body);
      const { _id } = await product.save();
      res.status(201).send({ _id });
    } catch (error) {
      next(error);
    }
  }
);

productRouter.get("/", JWTAuthMiddleware, async (req, res, next) => {
  try {
    console.log("req.query", req.query);
    console.log("q2m", q2m(req.query));
    const mongoQuery = q2m(req.query);
    console.log("mongoQuery", mongoQuery);

    const { name, category, price, search } = mongoQuery.criteria;

    if (name) name.$regex = name.$regex ? new RegExp(name.$regex, "i") : "";
    if (category) mongoQuery.criteria.category = category;
    if (price) {
      mongoQuery.criteria.price = {
        ...mongoQuery.criteria.price,
        $lte: price.$lte ? parseFloat(price.$lte) : "",
      };
    }

    if (search) {
      mongoQuery.criteria.$or = [
        { name: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }

    const products = await ProductsModel.find(
      mongoQuery.criteria,
      mongoQuery.options.fields
    )
      .limit(mongoQuery.options.limit)
      .skip(mongoQuery.options.skip)
      .sort(mongoQuery.options.sort);
    //   .populate({ path: "reviews", select: "comment rate" });
    const total = await ProductsModel.countDocuments(mongoQuery.criteria);
    // no matter the order of usage of these methods, Mongo will ALWAYS apply SORT then SKIP then LIMIT
    res.send({
      links: mongoQuery.links(process.env.LOCAL_URL + "/products", total),
      total,
      numberOfPages: Math.ceil(total / mongoQuery.options.limit),
      products,
    });
  } catch (error) {
    next(error);
  }
});

productRouter.get("/sort", async (req, res, next) => {
  try {
    console.log("req.query", req.query);

    const { name, category, price, search, page = 1, limit = 10 } = req.query;
    const criteria = {};
    console.log("criteria", criteria);
    if (name) criteria.name = { $regex: name, $options: "i" };
    if (category) criteria.category = category;
    if (price) criteria.price = { $lte: price };
    if (search) {
      criteria.$or = [
        { name: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }

    const sort = {};
    if (req.query.sort) {
      const sortBy = req.query.sort.split(":")[0];
      const sortOrder = req.query.sort.split(":")[1] === "desc" ? -1 : 1;
      sort[sortBy] = sortOrder;
    } else {
      sort._id = -1; // sort by descending _id by default
    }

    const skip = (page - 1) * limit;

    const products = await ProductsModel.find(criteria)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate({ path: "reviews", select: "comment rate" });

    const total = await ProductsModel.countDocuments(criteria);

    const totalPages = Math.ceil(total / limit);
    const links = {};
    if (page < totalPages) {
      links.nextPage = `${process.env.LOCAL_URL}/products?page=${
        page + 1
      }&limit=${limit}`;
    }
    if (page > 1) {
      links.prevPage = `${process.env.LOCAL_URL}/products?page=${
        page - 1
      }&limit=${limit}`;
    }

    res.send({
      links,
      total,
      totalPages,
      products,
    });
  } catch (error) {
    next(error);
  }
});

productRouter.get("/:productId", JWTAuthMiddleware, async (req, res, next) => {
  try {
    const products = await ProductsModel.findById(req.params.productId);
    if (products) {
      res.send(products);
    } else {
      next(
        createHttpError(
          404,
          `Product with id ${req.params.productId} not found!`
        )
      );
    }
  } catch (error) {
    next(error);
  }
});

productRouter.put("/:productId", JWTAuthMiddleware, async (req, res, next) => {
  try {
    const updatedProduct = await ProductsModel.findByIdAndUpdate(
      req.params.productId, // WHO
      req.body, // HOW
      { new: true, runValidators: true } // OPTIONS. By default findByIdAndUpdate returns the record pre-modification. If you want to get the newly updated one you shall use new: true
      // By default validation is off in the findByIdAndUpdate --> runValidators: true
    );
    if (updatedProduct) {
      res.send(updatedProduct);
    } else {
      next(
        createHttpError(
          404,
          `Product with id ${req.params.productId} not found!`
        )
      );
    }
  } catch (error) {
    next(error);
  }
});

productRouter.delete(
  "/:productId",
  JWTAuthMiddleware,
  async (req, res, next) => {
    try {
      const deletedProduct = await ProductsModel.findByIdAndDelete(
        req.params.productId
      );
      if (deletedProduct) {
        res.status(204).send();
      } else {
        next(
          createHttpError(
            404,
            `Product with id ${req.params.productId} not found!`
          )
        );
      }
    } catch (error) {
      next(error);
    }
  }
);

const cloudinaryUploader = multer({
  storage: new CloudinaryStorage({
    cloudinary, // cloudinary is going to search for smth in .env vars called process.env.CLOUDINARY_URL
    params: {
      folder: "wareTrack/products",
    },
  }),
}).single("imageUrl");

productRouter.post(
  "/:productId/upload",
  cloudinaryUploader,
  async (req, res, next) => {
    try {
      console.log("FILE:", req.file);
      const product = await ProductsModel.findByIdAndUpdate(
        req.params.productId,
        { imageUrl: req.file.path },
        { new: true, runValidators: true }
      );

      console.log("product", product);
      if (product) {
        res.send(product);
      } else {
        next(
          createHttpError(
            404,
            `Product with id ${req.params.productId} not found!`
          )
        );
      }
    } catch (error) {
      next(error);
    }
  }
);

export default productRouter;
