import { checkSchema, validationResult } from "express-validator";
import createHttpError from "http-errors";

const usersSchema = {
  firstName: {
    in: ["body"],
    isString: {
      errorMessage: "firstName is a mandatory field and needs to be a string!",
    },
  },
  lastName: {
    in: ["body"],
    isString: {
      errorMessage: "lastName is a mandatory field and needs to be a string!",
    },
  },
  password: {
    in: ["body"],
    isString: {
      errorMessage: "password is a mandatory field and needs to be a string!",
    },
  },
  // avatar: {
  //   in: ["body"],
  //   isString: {
  //     errorMessage: "avatar is a mandatory field and needs to be a string!",
  //   },
  // },
  // role: {
  //   in: ["body"],
  //   isString: {
  //     errorMessage: "role is a mandatory field and needs to be a string!",
  //   },
  // },
};

export const checkUsersSchema = checkSchema(usersSchema); // this function creates a middleware

export const triggerBadRequest = (req, res, next) => {
  // 1. Check if checkBooksSchema has found any error in req.body
  const errors = validationResult(req);
  console.log(errors.array());
  if (errors.isEmpty()) {
    // 2.1 If we don't have errors --> normal flow (next)
    next();
  } else {
    // 2.2 If we have any error --> trigger 400
    next(
      createHttpError(400, "Errors during blog validation", {
        errorsList: errors.array(),
      })
    );
  }
};
