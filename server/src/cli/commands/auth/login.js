import { cancel, confirm, intro, isCancel, outro } from "@clack/prompts";
import { logger } from "better-auth";
import { createAuthClient } from "better-auth/client";
import { deviceAuthorizationClient } from "better-auth/client/plugins";

import chalk from "chalk";
import { Command } from "commander";
import fs from "node:fs/promises";
import open from "open";
import os from "os";
import path from "path";
import yoctoSpinner from "yocto-spinner";
import * as z from "zod/v4";
import dotenv from "dotenv";
import prisma from "../../../lib/db.js";


dotenv.config();

const URL = "http://localhost:3005";
const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
export const CONFIG_DIR = path.join(os.homedir(), ".zyra-cli");
export const TOKEN_FILE = path.join(CONFIG_DIR, "token.json");

// TOKEN MANAGEMENT UTILITIES
export async function getStoredToken() {
    try {
        const data = await fs.readFile(TOKEN_FILE, 'utf-8');
        const token = JSON.parse(data);
        return token;
    } catch (error) {
        return null;
    }
}

export async function storeToken(token) {
   try {
    // Ensure the config directory exists
    await fs.mkdir(CONFIG_DIR, { recursive: true });

    const tokenData = {
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        token_type: token.token_type || "Bearer",
        scope: token.scope,
        expires_at: token.expires_in
            ? new Date(Date.now() + token.expires_in * 1000).toISOString()
            : null,
        created_at: new Date().toISOString(),
    };
    await fs.writeFile(TOKEN_FILE, JSON.stringify(tokenData, null, 2), 'utf-8');
    return true;
   } catch (error) {
    console.error(chalk.red("Failed to store token:"), error.message);
    return false;
   }
}

export async function clearStoredToken() {
    try {
        await fs.unlink(TOKEN_FILE);
        return true;
    } catch (error) {
        // If the file doesn't exist, consider it cleared
        return false;
    }
}

export async function isTokenExpired() {
    const token = await getStoredToken();
    if (!token || !token.expires_at) {
        return true;
    }
    const expiresAt = new Date(token.expires_at);
    const now = new Date();

    // Consider expired if less than 5 minutes left
    return expiresAt.getTime() - now.getTime() < 5 * 60 * 1000;
}

export async function requireAuth() {
    const token = await getStoredToken();

    if (!token) {
        console.log(
            chalk.red("❌ Not Authenticated. Please run 'your-cli login' first'.")
        )
        process.exit(1);
    }

    if (await isTokenExpired()) {
        console.log(
            chalk.yellow("⚠️  Your session has expired. Please login again.")
        )
        console.log(chalk.gray("Run: your-cli login\n"));
        process.exit(1);
    }
    return token;
}

export async function loginAction(opts) {
  const options = z.object({
    serverUrl: z.string().optional(),
    clientId: z.string().optional(),
  });
  const serverUrl = options.serverUrl || URL;
  const clientId = options.clientId || CLIENT_ID;

  intro(chalk.bold("🔐Auth Cli Login"));

  //TODO: CHANGE THIS WITH TOKEN MANAGEMENT UTILS
  const existingToken = await getStoredToken();
  const expired = await isTokenExpired();

  if (existingToken && !expired) {
    const shouldReAuth = await confirm({
      message: "You are already loggedIn. Do you want to login Again?",
      initialValue: false,
    });
    if (isCancel(shouldReAuth) || !shouldReAuth) {
      cancel("Login Cancelled");
      process.exit(0);
    }
  }
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
      logger.error(
        `Failed to request device authorization ${error.error_description}`
      );
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

    console.log(chalk.cyan("Device Authorization Requested"));

    console.log(
      `Please visit" ${chalk.underline.blue(
        verification_uri || verification_uri_complete
      )}`
    );

    console.log(`Enter Code: ${chalk.bold.green(user_code)}`);

    const shouldOpen = await confirm({
      message: "Open browser automatically",
      initialValue: true,
    });

    if (!isCancel(shouldOpen) && shouldOpen) {
      const urlToOpen = verification_uri_complete || verification_uri;
      await open(urlToOpen);
    }

    console.log(
      chalk.gray(
        `Waiting for authorization (expires in ${Math.floor(
          expires_in / 60
        )} minutes)...`
      )
    );
    const token = await pollForToken(
      authClient,
      device_code,
      clientId,
      interval
    );
    if (token) {
        const saved = await storeToken(token)

        if (!saved) {
            console.log(
                chalk.yellow("\n⚠️  Warning: Could not save authentication token.")
            )
            console.log(
                chalk.yellow("You many need to login again on next use.")
            )
        }

        //todo: get the user data
        outro(chalk.green("✅ Successfully logged in!"));

        console.log(chalk.gray(`\n Token saved to: ${TOKEN_FILE}`));

        console.log(
            chalk.gray("You can now use AI commands without logging in again.\n")
        )
    }
  } catch (error) {
    spinner.stop();
    console.error(chalk.red("\nLogin failed:"), error.message);
    process.exit(1);
  }
}

async function pollForToken(
  authClient,
  deviceCode,
  clientId,
  initialIntervalue
) {
  let pollingInterval = initialIntervalue;
  const spinner = yoctoSpinner({ text: "", color: "cyan" });
  let dots = 0;

  return new Promise((resolve, reject) => {
    const poll = async () => {
      dots = (dots + 1) % 4;
      spinner.text = chalk.gray(
        `Polling for authorization${".".repeat(dots)}${" ".repeat(3 - dots)}`
      );
      if (!spinner.isSpinning) spinner.start();

      try {
        const { data, error } = await authClient.device.token({
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
          device_code: deviceCode,
          client_id: clientId,
          fetchOptions: {
            headers: {
              "user-agent": `My CLI`,
            },
          },
        });
        if(data?.access_token){
            console.log(
                chalk.bold.yellow(`Your access token: ${data.access_token}`)
            )
            spinner.stop();
            resolve(data);
            return;
        }
        else if (error) {
            switch (error.error) {
      case "authorization_pending":
        // Continue polling
        break;
      case "slow_down":
        pollingInterval += 5;
        break;
      case "access_denied":
        console.error("Access was denied by the user");
        return;
      case "expired_token":
        console.error("The device code has expired. Please try again.");
        return;
      default:
        spinner.stop();
        logger.error(`Error: ${error.error_description}`);
        process.exit(1);
    }
        }
      } catch (error) {
        spinner.stop();
        logger.error(`Network error: ${error.message}`);
        process.exit(1);
      }
      setTimeout(poll, pollingInterval * 1000);
    };
    setTimeout(poll, pollingInterval * 1000);
  });
}

export async function logoutAction() {
  intro(chalk.bold("👋 Logout"));

  const token = await getStoredToken();

  if (!token) {
    console.log(chalk.yellow("You're not logged in."))
    process.exit(0);
  }

  const shouldLogout = await confirm({
    message: "Are you sure you want to logout?",
    initialValue: false,
  });

  if(isCancel(shouldLogout || !shouldLogout)) {
    console.log("Logout cancelled.");
    process.exit(0);
  }

  const cleared = await clearStoredToken();

  if (cleared) {
    outro(chalk.green("✅ Successfully logged out!"));
  } else {
    console.log(chalk.yellow("⚠️  Could not clear token file."));
  }
}

export async function whoamiAction(opts) {
  const token = await requireAuth();
  if (!token?.access_token) {
    console.log("No access token found. Please login.")
    process.exit(1);
  }

  const user = await prisma.user.findFirst({
    where: {
      sessions: {
        some: {
          token: token.access_token
        },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
  });
  // Output user session info
  console.log(
    chalk.bold.greenBright(`\n
  👤 User: ${user.name}
  📧 Email: ${user.email}
  🆔 ID: ${user.id}`)
  )
}

export const login = new Command("login")
  .description("Login to Better Auth CLI")
  .option("--server-url <url>", "The Better Auth server URL", URL)
  .option("--client-id <id>", "The OAuth Client ID", CLIENT_ID)
  .action(loginAction);

export const logout = new Command("logout")
  .description("Logout and clear stored credentials")
  .action(logoutAction);

export const whoami = new Command("whoami")
  .description("Show current authenticated user")
  .option("--server-url <url>", "The Better Auth server URL", URL)
  .action(whoamiAction);
