import Express from "express";
import passport from "passport";
import createHttpError from "http-errors";
import UsersModel from "./model.js";
import { checkUsersSchema, triggerBadRequest } from "./validation.js";
import { JWTAuthMiddleware } from "../../lib/auth/jwt.js";
import q2m from "query-to-mongo";
import { createAccessToken } from "../../lib/auth/tools.js";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

const usersRouter = Express.Router();

usersRouter.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "consent",
  })
);

usersRouter.get(
  "/auth/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res, next) => {
    // session:false option tells the middleware to not use sessions for authentication.
    //By default, passport.js will use sessions to maintain user authentication across requests.
    //However, there may be cases where you want to disable sessions, such as when implementing stateless authentication using tokens.
    try {
      // console.log("accessToken", req.user.accessToken);
      res.redirect(
        `${process.env.FE_URL}/dashboard?accessToken=${req.user.accessToken}`
      );
    } catch (error) {
      next(error);
    }
  }
);

usersRouter.post(
  "/",
  checkUsersSchema,
  triggerBadRequest,
  async (req, res, next) => {
    try {
      const newUser = new UsersModel(req.body);
      const { _id } = await newUser.save();
      res.status(201).send({ _id });
    } catch (error) {
      next(error);
    }
  }
);

usersRouter.get("/", JWTAuthMiddleware, async (req, res, next) => {
  try {
    console.log("req.query", req.query);
    console.log("q2m", q2m(req.query));
    const mongoQuery = q2m(req.query);
    //  price: '>10' should be converted somehow into price: {$gt: 10}
    const users = await UsersModel.find(
      mongoQuery.criteria,
      mongoQuery.options.fields
    )
      .limit(mongoQuery.options.limit)
      .skip(mongoQuery.options.skip)
      .sort(mongoQuery.options.sort);
    const total = await UsersModel.countDocuments(mongoQuery.criteria);
    // no matter the order of usage of these methods, Mongo will ALWAYS apply SORT then SKIP then LIMIT
    res.send({
      links: mongoQuery.links(process.env.LOCAL_URL + "/users", total),
      total,
      numberOfPages: Math.ceil(total / mongoQuery.options.limit),
      users,
    });
  } catch (error) {
    next(error);
  }
});

usersRouter.get("/me", JWTAuthMiddleware, async (req, res, next) => {
  try {
    const user = await UsersModel.findById(req.user._id);
    res.send(user);
  } catch (error) {
    next(error);
  }
});

usersRouter.put("/me", JWTAuthMiddleware, async (req, res, next) => {
  try {
    const updatedUser = await UsersModel.findByIdAndUpdate(
      req.user._id,
      req.body,
      { new: true, runValidators: true }
    );
    res.send(updatedUser);
  } catch (error) {
    next(error);
  }
});

usersRouter.delete("/me", JWTAuthMiddleware, async (req, res, next) => {
  try {
    await UsersModel.findOneAndDelete(req.user._id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

usersRouter.get("/:userId", JWTAuthMiddleware, async (req, res, next) => {
  try {
    const foundUser = await UsersModel.findById(req.params.userId);
    if (foundUser) {
      res.send(foundUser);
    } else {
      next(
        createHttpError(404, `User with id ${req.params.userId} is not found`)
      );
    }
  } catch (error) {
    next(error);
  }
});

usersRouter.put("/:userId", JWTAuthMiddleware, async (req, res, next) => {
  try {
    const updatedUser = await UsersModel.findByIdAndUpdate(
      req.params.userId,
      req.body,
      { new: true, runValidators: true }
    );

    if (updatedUser) {
      res.send(updatedUser);
    } else {
      next(
        createHttpError(404, `User with id ${req.params.userId} is not found`)
      );
    }
  } catch (error) {
    next(error);
  }
});

const cloudinaryUploaderAvatar = multer({
  storage: new CloudinaryStorage({
    cloudinary, // cloudinary is going to search for smth in .env vars called process.env.CLOUDINARY_URL
    params: {
      folder: "wareTrack/user-avatar",
    },
  }),
}).single("avatar");

usersRouter.post(
  "/:userId/uploadAvatar",
  cloudinaryUploaderAvatar,
  async (req, res, next) => {
    try {
      console.log("FILE:", req.file);
      const updatedUser = await UsersModel.findByIdAndUpdate(
        req.params.userId,
        { avatar: req.file.path },
        { new: true, runValidators: true }
      );
      console.log("updatedUser", updatedUser);
      if (updatedUser) {
        res.send(updatedUser);
      } else {
        next(
          createHttpError(404, `User with id ${req.params.userId} is not found`)
        );
      }
    } catch (error) {
      next(error);
    }
  }
);

usersRouter.delete("/:userId", JWTAuthMiddleware, async (req, res, next) => {
  try {
    const deletedUser = await UsersModel.findByIdAndDelete(req.params.userId);
    if (deletedUser) {
      res.status(204).send();
    } else {
      next(
        createHttpError(404, `User with id ${req.params.userId} is not found`)
      );
    }
  } catch (error) {
    next(error);
  }
});

usersRouter.post("/register", async (req, res, next) => {
  try {
    const { email } = req.body;
    // Check if user already exists
    const existingUser = await UsersModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email has already existed" });
    }
    const newUser = new UsersModel(req.body);
    const newUserData = await newUser.save();
    res.status(201).send(newUserData);
  } catch (error) {
    next(error);
  }
});

usersRouter.post("/login", async (req, res, next) => {
  try {
    // 1. Obtain credentials from req.body
    const { email, password } = req.body;

    // 2. Verify the credentials
    const user = await UsersModel.checkCredentials(email, password);

    if (user) {
      // 3.1 If credentials are fine --> create an access token (JWT) and send it back as a response
      const payload = { _id: user._id, role: user.role };
      const accessToken = await createAccessToken(payload);

      res.send({ accessToken });
    } else {
      // 3.2 If they are not --> trigger a 401 error
      next(createHttpError(401, "Credentials are not ok!"));
    }
  } catch (error) {
    next(error);
  }
});

export default usersRouter;
