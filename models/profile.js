import { ObjectId } from "mongodb"
import { connect } from "../database/connection.js"

export class ProfileModel {

    static getAll = async ({ userId }) => {
        const db = await connect()
        const users = db.collection('users')

        const objectId = new ObjectId(userId)

        const user = await users.findOne({ _id: objectId })
        if (!user) throw new Error('User not found')

        const result = user.profiles || []
        return result
    }

    static getById = async ({ userId, profileId }) => {
        const db = await connect()
        const users = db.collection('users')

        const objectId = new ObjectId(userId)
        const profileObjectId = new ObjectId(profileId)

        const user = await users.findOne({ _id: objectId })
        if (!user) throw new Error('User not found')

        if (!user.profiles || !Array.isArray(user.profiles)) {
            throw new Error('User has not profiles')
        }

        const result = user.profiles.find(
            (p) => p._id.toString() === profileObjectId.toString()
        )
        if (!result) throw new Error('Profile not found')

        return result
    }

    static update = async ({ userId, profileId, category, item }) => {
        const db = await connect()
        const users = db.collection('users')

        if (!userId || !profileId) throw new Error("Missing user or profile ID")
        if (!category || !item) throw new Error("Missing category or item")

        const objectId = new ObjectId(userId)
        const profileObjectId = new ObjectId(profileId)

        const user = await users.findOne({ _id: objectId })
        if (!user) throw new Error("User not found")

        const profile = user.profiles?.find((p) => p._id.toString() === profileObjectId.toString())
        if (!profile) throw new Error("Profile not found")

        if (!profile.myList || !profile.myList[category]) {
            throw new Error("Invalid category in myList")
        }

        const exists = profile.myList[category].some(
            (i) => i._id?.toString() === item._id?.toString()
        )

        const updateOperation = exists
            ? { $pull: { [`profiles.$.myList.${category}`]: { _id: item._id } } }
            : { $push: { [`profiles.$.myList.${category}`]: item } }

        const result = await users.updateOne(
            { _id: objectId, "profiles._id": profileObjectId },
            updateOperation
        )

        if (result.modifiedCount === 0) {
            throw new Error("Failed to update myList")
        }

        const updatedUser = await users.findOne({ _id: objectId })
        const updatedProfile = updatedUser.profiles.find(
            (p) => p._id.toString() === profileObjectId.toString()
        )

        return updatedProfile
    }

    static create = async ({ userId, profile }) => {
        const db = await connect()
        const users = db.collection('users')

        const objectId = new ObjectId(userId)

        const user = await users.findOne({ _id: objectId })
        if (!user) throw new Error('User not found')
        if (user.profiles && user.profiles?.length >= 4) throw new Error('Maximum number of profiles reached')

        const result = {
            _id: new ObjectId(),
            name: profile.name,
            avatar: profile.avatar,
            myList: { movies: [], series: [], games: [] }
        }

        await users.updateOne(
            { _id: objectId },
            { $push: { profiles: result } },
        )

        return result
    }

    static delete = async ({ userId, profileId }) => {
        const db = await connect()
        const users = db.collection('users')

        const objectId = new ObjectId(userId)
        const profileObjectId = new ObjectId(profileId)

        const user = await users.findOne({ _id: objectId })
        if (!user) throw new Error('User not found')

        const result = await users.findOneAndUpdate(
            { _id: objectId },
            { $pull: { profiles: { _id: profileObjectId } } },
            { returnDocument: 'after', projection: { password: 0 } }
        )

        return result
    }

}