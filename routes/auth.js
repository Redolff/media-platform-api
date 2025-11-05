import { Router } from "express"
import { AuthController } from "../controllers/auth.js"

export const authRouter = () => {
    const AuthRouter = Router()

    AuthRouter.post('/login', AuthController.login)
    AuthRouter.post('/loginGoogle', AuthController.loginGoogle)
    AuthRouter.post('/register', AuthController.register)
    AuthRouter.post('/logout', AuthController.logout)

    return AuthRouter
}