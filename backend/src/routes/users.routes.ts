import { Router } from "express";
import {
  createUserController,
  deleteUserController,
  listUsersController,
  patchUserController
} from "../controllers/users.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";

export const usersRouter = Router();

usersRouter.use(authenticate, authorize("ADMIN"));

usersRouter.get("/", listUsersController);
usersRouter.post("/", createUserController);
usersRouter.patch("/:id", patchUserController);
usersRouter.delete("/:id", deleteUserController);
