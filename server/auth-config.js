import dotenv from "dotenv"

dotenv.config()

const authConfig = {
    domain: process.env.AUTH0_DOMAIN,
    clientId: process.env.AUTH0_CLIENT_ID
}

export default authConfig
