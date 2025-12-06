import express from "express";
import {fromNodeHeaders, toNodeHandler} from "better-auth/node"
import { auth } from "../lib/auth.js";
import dotenv from "dotenv";
import cors from "cors"

dotenv.config()

const app = express()

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use("/api/auth", toNodeHandler(auth)); 

app.use(express.json());

app.get("/device", async(req, res) => {
  const {user_code} = req.query
  res.redirect(`http://localhost:3000/device?user_code=${user_code}`)
})

app.get("/api/me", async (req, res) => {
    try {
      const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
      return res.json(session);
    } catch (err) {
      console.error("Failed to fetch session:", err);
      return res.status(500).json({ error: "Failed to fetch session" });
    }
});

app.listen(process.env.PORT, () => {
    console.log(`Your application is running on https://localhost:${process.env.PORT}`)
})