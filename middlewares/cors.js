import cors from 'cors'

const ACCEPTED_ORIGINS = [
    'http://localhost:8080',
    'http://localhost:5173',
    'http://localhost:5174'
]

export const corsMiddleware = ({ accepted_origins = ACCEPTED_ORIGINS } = {}) => cors({
    origin: (origin, callback) => { // validacion para aceptar PUERTOS
        if(accepted_origins.includes(origin) || (!origin)){
            return callback(null, true)
        }

        return callback(new Error('Not allowerd by CORS'))
    },
    credentials: true,
})