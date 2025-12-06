import { cancel, confirm, intro, isCancel, outro } from "@clack/prompts";
import { logger } from "better-auth";
import { createAuthClient } from "better-auth/client";
import { deviceAuthorizationClient } from "better-auth/client/plugins";

import chalk from "chalk";
import { Command } from "commander";
import open from "open";
import os from "os";
import path from "path";
import yoctoSpinner from "yocto-spinner";
import * as z from "zod/v4";
import dotenv from "dotenv";

import { clearStoredToken, getStoredToken, isTokenExpired, requireAuth, storeToken } from "../../../../lib/token.js";
import { fileURLToPath } from "url";
import prisma from "../../../../lib/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../../../../.env") });

const URL = "http://localhost:3005";
const CLIENT_ID = process.env.GITHUB_CLIENT_ID;

export const CONFIG_DIR = path.join(os.homedir(), ".better-auth");
export const TOKEN_FILE = path.join(CONFIG_DIR, "token.json");

// LOGIN ACTION
export async function loginAction(opts) {
  const options = z.object({
    serverUrl: z.string().optional(),
    clientId: z.string().optional(),
  });

  // Correct parsing of commander options
  const parsed = options.parse(opts);

  const serverUrl = parsed.serverUrl || URL;
  const clientId = parsed.clientId || CLIENT_ID;

  intro(chalk.bold("🔐 Auth CLI Login"));

  const existingToken = await getStoredToken();
  const expired = await isTokenExpired();

  // If token exists and is NOT expired -> ask for re-login
  if (existingToken && !expired) {
    const shouldReAuth = await confirm({
      message: "You are already logged in. Login again?",
      initialValue: false,
    });

    if (isCancel(shouldReAuth) || !shouldReAuth) {
      cancel("Login Cancelled");
      process.exit(0);
    }
  }

  // Create client
  const authClient = createAuthClient({
    baseURL: serverUrl,
    plugins: [deviceAuthorizationClient()],
  });

  const spinner = yoctoSpinner({ text: "Requesting device authorization..." });
  spinner.start();

  try {
    const { data, error } = await authClient.device.code({
      client_id: clientId,
      scope: "openid profile email",
    });

    spinner.stop();

    if (error || !data) {
      logger.error(`Failed to request device authorization: ${error?.error_description}`);
      process.exit(1);
    }

    const {
      device_code,
      user_code,
      verification_uri,
      verification_uri_complete,
      interval = 5,
      expires_in,
    } = data;

    console.log(chalk.cyan("\nDevice Authorization Required"));
    console.log(`Visit: ${chalk.underline.blue(verification_uri || verification_uri_complete)}`);
    console.log(`Enter Code: ${chalk.bold.green(user_code)}\n`);

    const shouldOpen = await confirm({
      message: "Open browser automatically?",
      initialValue: true,
    });

    if (!isCancel(shouldOpen) && shouldOpen) {
      await open(verification_uri_complete || verification_uri);
    }

    console.log(
      chalk.gray(
        `Waiting for authorization (expires in ${Math.floor(expires_in / 60)} minutes)...`
      )
    );

    // Poll for token correctly
    const token = await pollForToken(authClient, device_code, clientId, interval);

    if (token) {
      const saved = await storeToken(token);

      if (!saved) console.log(chalk.yellow("\n⚠️ Could not save authentication token."));
      else console.log(chalk.green("\nToken saved successfully."));
    }

    outro(chalk.green("Login Successful!"));
    console.log(chalk.gray(`Token stored at: ${TOKEN_FILE}\n`));
  } catch (error) {
    spinner.stop();
    console.error(chalk.red("Login failed:"), error.message);
    process.exit(1);
  }
}

// LOGOUT ACTION
export async function logoutAction(){
  intro(chalk.bold("👋 Logout"))

  const token = await getStoredToken()

  if (!token){
    console.log("You're not logged in")
    process.exit(0)
  }

  const shouldLogout = await confirm({
    message: "Are you sure you want to logout?",
    initialValue: false,
  })

  if (isCancel(shouldLogout) || !shouldLogout){
    cancel("Logout Cancelled!")
    process.exit(0)
  }

  const cleared = await clearStoredToken();

  if (cleared){
    outro(chalk.green("✅ Successfully logged out!"))
  }
  else{
    console.log(chalk.yellow("⚠️ Could not clear token file."))
  }
}

// CURRENT USER
export async function whoamiAction(opts){
  const token = await requireAuth()

  if(!token?.access_token){
    console.log("No access token found. Please login.")
    process.exit(1)
  }

  const user = await prisma.user.findFirst({
    where: {
      sessions: {
        some: {
          token: token.access_token,
        },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true
    },
  })

  console.log(
    chalk.bold.greenBright(`\n User: ${user.name} \n Email: ${user.email} \n ID: ${user.id}`)
  )
}

// POLLING FUNCTION
async function pollForToken(authClient, deviceCode, clientId, initialInterval) {
  let pollingInterval = initialInterval;
  const spinner = yoctoSpinner({ text: "", color: "cyan" });
  let dots = 0;

  return new Promise((resolve) => {
    const poll = async () => {
      dots = (dots + 1) % 4;
      spinner.text = chalk.gray(`Polling for Authorization${".".repeat(dots)}${" ".repeat(3 - dots)}`)
      spinner.start();

      try {
        const { data, error } = await authClient.device.token({
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
          device_code: deviceCode,
          client_id: clientId,
        });

        if (data?.access_token) {
          spinner.stop();
          resolve(data);
          return;
        }

        if (error) {
          switch (error.error) {
            case "authorization_pending":
              break;
            case "slow_down":
              pollingInterval += 5;
              break;
            case "access_denied":
              spinner.stop();
              console.error("User denied access.");
              process.exit(1);
            case "expired_token":
              spinner.stop();
              console.error("Device code expired. Start login again.");
              process.exit(1);
            default:
              spinner.stop();
              logger.error(error.error_description);
              process.exit(1);
          }
        }
      } catch (e) {
        spinner.stop();
        console.error("Network Error:", e.message);
        process.exit(1);
      }

      setTimeout(poll, pollingInterval * 1000);
    };

    poll();
  });
}

// COMMANDER SETUP
export const login = new Command("login")
  .description("Login to Better Auth")
  .option("--server-url <url>", "Better Auth server URL", URL)
  .option("--client-id <id>", "OAuth Client ID", CLIENT_ID)
  .action(loginAction);

export const logout = new Command("logout")
  .description("Logout and clear stored credentials")
  .action(logoutAction);

export const whoami = new Command("whoami")
  .description("Show current authenticated user")
  .option("--server-url <url>", "Better Auth server URL", URL)
  .action(whoamiAction);