import { Router } from "express";
import { ProfileController } from "../controllers/profile.js";

export const profileRouter = ({ profileModel }) => {
    const profileRouter = new Router()

    const profileController = new ProfileController({ profileModel })

    profileRouter.get('/:userId', profileController.getAll)
    profileRouter.post('/:userId', profileController.create)
    profileRouter.patch('/myList/:userId', profileController.update)

    profileRouter.get('/:userId/:profileId', profileController.getById)
    profileRouter.delete('/:userId/:profileId', profileController.delete)

    return profileRouter
}