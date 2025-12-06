import chalk from "chalk";
import fs from "node:fs/promises";
import { CONFIG_DIR, TOKEN_FILE } from "../src/cli/commands/auth/login.js";

export async function getStoredToken() {
  try {
    const data = await fs.readFile(TOKEN_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function storeToken(token) {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });

    const tokenData = {
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      scope: token.scope,
      token_type: token.token_type || "Bearer",
      expires_at: token.expires_in
        ? new Date(Date.now() + token.expires_in * 1000).toISOString()
        : null,
      created_at: new Date().toISOString(),
    };

    await fs.writeFile(TOKEN_FILE, JSON.stringify(tokenData, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error(chalk.red("Failed to store token:"), err.message);
    return false;
  }
}

export async function clearStoredToken() {
  try {
    await fs.unlink(TOKEN_FILE);
    return true;
  } catch {
    return false;
  }
}

export async function isTokenExpired() {
  const token = await getStoredToken();
  if (!token?.expires_at) return true;

  const expiresAt = new Date(token.expires_at);
  const now = new Date();

  return (expiresAt - now) < (5 * 60 * 1000); // 5 minutes
}

export async function requireAuth() {
  const token = await getStoredToken();

  if (!token) {
    console.log(chalk.red("❌ Not authenticated. Run `orbyt login`."));
    process.exit(1);
  }

  if (await isTokenExpired()) {
    console.log(chalk.yellow("⚠️ Session expired. Please login again."));
    process.exit(1);
  }

  return token;
}