import {createAuthClient} from "better-auth/react"
import { deviceAuthorizationClient } from "better-auth/plugins"

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    plugins:[
        deviceAuthorizationClient(),
    ]
})