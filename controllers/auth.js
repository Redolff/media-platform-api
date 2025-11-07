import 'dotenv/config'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { UserModel } from "../models/user.js"
import { validateUser } from "../schemas/users.js"
import { connect } from '../database/connection.js'
import { ObjectId } from 'mongodb'

export class AuthController {

    static generateTokens = (user) => {
        const access_token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.SECRET_JWT_KEY,
            { expiresIn: process.env.ACCESS_TOKEN_EXPIRES || '10m' }
        )

        const refresh_token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.REFRESH_JWT_KEY,
            { expiresIn: process.env.REFRESH_TOKEN_EXPIRES || '7d' }
        )

        return { access_token, refresh_token }
    }

    static login = async (req, res) => {
        const { email, password } = req.body
        const db = await connect()
        const users = db.collection('users')

        try {

            const user = await users.findOne({ email })
            if (!user) return res.status(401).json({ message: 'El usuario no esta registrado' })
            const validPassword = await bcrypt.compare(password, user.password)
            if (!validPassword) return res.status(401).json({ message: 'Contraseña incorrecta' })

            const { access_token, refresh_token } = AuthController.generateTokens(user)
            const { password: _, ...safeUser } = user

            res.cookie('access_token', access_token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 1000 * 60 * 10 // 10 minutos
            })

            res.cookie('refresh_token', refresh_token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 1000 * 60 * 60 * 24 * 7, // 7 días
            })

            return res.json({ user: safeUser, message: 'Login exitoso' })
        } catch (error) {
            console.error('Error en el login: ', error)
            return res.status(500).json({ message: 'Error interno en el servidor' })
        }
    }

    static loginGoogle = async (req, res) => {
        const db = await connect()
        const users = db.collection('users')

        const { email, firstName, lastName, avatar } = req.body

        if (!email) return res.status(400).json({ message: 'Email is required' })

        try {
            let user = await users.findOne({ email })
            if (!user) {
                const newUser = {
                    firstName,
                    lastName,
                    email,
                    avatar,
                    role: 'user',
                    provider: 'google',
                    profiles: []
                }
                const result = await users.insertOne(newUser)
                user = { _id: result.insertedId, ...newUser }
            }

            const { access_token, refresh_token } = AuthController.generateTokens(user)

            res.cookie('access_token', access_token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 1000 * 60 * 60
            })

            res.cookie('refresh_token', refresh_token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 1000 * 60 * 60 * 24 * 7
            })

            const { password, ...safeUser } = user
            return res.status(200).json({ message: 'Login exitoso con Google', user: safeUser })
        } catch (error) {
            console.error('Error en el login Google: ', error)
            return res.status(500).json({ message: 'Error interno en el servidor' })
        }
    }

    static register = async (req, res) => {
        const db = await connect()
        const users = db.collection('users')
        const result = validateUser(req.body)
        if (result.error) return res.status(400).json({ message: result.error })
        const existingUser = await users.findOne({ email: result.data.email })
        if (existingUser) return res.status(409).json({ message: 'El mail ya está registrado' })

        try {
            const newUser = await UserModel.create({
                ...result.data,
                role: 'user'
            })

            // Genero token automaticamente despues de loguearse
            const { access_token, refresh_token } = AuthController.generateTokens(newUser)

            res.cookie('access_token', access_token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 1000 * 60 * 60
            })

            res.cookie('refresh_token', refresh_token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 1000 * 60 * 60 * 24 * 7
            })

            return res.status(201).json({ message: 'Registro exitoso', user: newUser })
        } catch (error) {
            res.status(500).json({ message: 'Error al registrar usuario', error: error.message })
        }
    }

    static refresh = async(req, res) => {
        const refresh_token = req.cookies?.refresh_token
        if(!refresh_token) return res.status(401).json({ message: 'Not refresh token' })

        const db = await connect()
        const users = db.collection('users')

        try {
            const decoded = jwt.verify(refresh_token, process.env.REFRESH_JWT_KEY)
            const objectDecodedId = new ObjectId(decoded.id)
            
            const user = await users.findOne({ _id: objectDecodedId })
            if(!user) return res.status(401).json({ message: 'User not found' })

            const new_access_token = jwt.sign(
                { id: user._id, email: user.email },
                process.env.SECRET_JWT_KEY,
                { expiresIn: '10m' }
            )

            res.cookie('access_token', new_access_token, {
                httpOnly: true,
                secure: true,
                sameSite: 'strict',
                maxAge: 1000 * 60 * 10
            })

            return res.json({ message: 'Token renoved', user: user })
        } catch(error) {
            console.error('Error al refrescar el token: ', error)
            return res.status(403).json({ message: 'Refresh token invalido o expirado' })
        }
    }

    static logout = async (req, res) => {
        res
            .clearCookie('access_token')
            .clearCookie('refresh_token')
            .json({ message: 'Logout successful' })
    }

}