import 'dotenv/config'
import { ObjectId } from "mongodb"
import { connect } from "../database/connection.js"
import bcrypt from 'bcrypt'

export class UserModel {

    static getAll = async () => {
        const db = await connect()
        const users = db.collection('users')

        const usuarios = await users.find({}).toArray()
        const allUsers = usuarios.map(({ password: _, ...rest }) => rest)
        return allUsers
    }

    static getById = async ({ id }) => {
        const db = await connect()
        const users = db.collection('users')

        const objectId = new ObjectId(id)
        const user = await users.findOne({ _id: objectId })

        const { password: _, ...userId } = user
        return userId
    }

    static update = async ({ id, input }) => {
        const db = await connect()
        const users = db.collection('users')

        const objectId = new ObjectId(id)
        const result = await users.findOneAndUpdate(
            { _id: objectId },
            { $set: input },
            { returnDocument: 'after' }
        )

        return result
    }

    static create = async (input) => { // Proceso interno, crea usuarios en la DB, administrar usuarios.
        const db = await connect()
        const users = db.collection('users')

        const { password, email, ...rest } = input

        const existingUser = await users.findOne({ email })
        if (existingUser) {
            const error = new Error('El usuario ya existe')
            error.status = 409
            throw error
        }

        const SALT_ROUNDS = Number(process.env.SALT_ROUND)
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)

        const newUser = {
            ...rest,
            email,
            password: hashedPassword
        }

        const result = await users.insertOne(newUser)
        const userCreated = await users.findOne({ _id: result.insertedId })

        const { password: _, ...user } = userCreated
        return user
    }

    static delete = async ({ id }) => {
        const db = await connect()
        const users = db.collection('users')

        const objectId = new ObjectId(id)
        const result = await users.deleteOne({ _id: objectId })

        return result
    }

}