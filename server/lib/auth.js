import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { deviceAuthorization } from "better-auth/plugins"; 
import prisma from "./db.js";
import dotenv from "dotenv"

dotenv.config()

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  basePath: "/api/auth",
  trustedOrigins: ["http://localhost:3000"],
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    },
  },
  plugins: [
    deviceAuthorization({ 
      verificationUri: "/device", 
    }), 
  ],
});
