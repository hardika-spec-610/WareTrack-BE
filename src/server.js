// const express = require("express") OLD IMPORT SYNTAX
import Express from "express"; // NEW IMPORT SYNTAX (We can use it only if we add "type": "module", to package.json)
import listEndpoints from "express-list-endpoints";
import cors from "cors";
import {
  genericErrorHandler,
  badRequestHandler,
  unauthorizedHandler,
  notfoundHandler,
  forbiddenErrorHandler,
} from "./errorsHandlers.js";
import mongoose from "mongoose";
import passport from "passport";
import usersRouter from "./api/users/index.js";
import googleStrategy from "./lib/auth/googleOauth.js";
import productRouter from "./api/products/index.js";
import orderRouter from "./api/orders/index.js";

const server = Express();
const port = process.env.PORT || 3001;
passport.use("google", googleStrategy); // Do not forget to inform Passport that we want to use Google Strategy!
// ************************** MIDDLEWARES *********************
const whitelist = [process.env.FE_URL, process.env.FE_PROD_URL];
server.use(
  cors({
    origin: (currentOrigin, corsNext) => {
      if (!currentOrigin || whitelist.indexOf(currentOrigin) !== -1) {
        corsNext(null, true);
      } else {
        corsNext(
          createHttpError(
            400,
            `Origin ${currentOrigin} is not in the whitelist!`
          )
        );
      }
    },
  })
);
server.use(Express.json()); // If you don't add this line BEFORE the endpoints all request bodies will be UNDEFINED!!!!!!!!!!!!!!!
server.use(passport.initialize()); // Do not forget to inform Express that we are using Passport!

// ************************** ENDPOINTS ***********************
server.use("/users", usersRouter);
server.use("/products", productRouter);
server.use("/orders", orderRouter);
// ************************* ERROR HANDLERS *******************
server.use(badRequestHandler); // 400
server.use(unauthorizedHandler); // 401
server.use(forbiddenErrorHandler); // 403
server.use(notfoundHandler); // 404
server.use(genericErrorHandler); // 500 (this should ALWAYS be the last one)

mongoose.connect(process.env.MONGO_URL);

mongoose.connection.on("connected", () => {
  console.log("✅ Successfully connected to Mongo!");
  server.listen(port, () => {
    console.table(listEndpoints(server));
    console.log(`✅ Server is running on port ${port}`);
  });
});
