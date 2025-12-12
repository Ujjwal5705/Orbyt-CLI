import chalk from "chalk"
import { Command } from "commander"
import yoctoSpinner from "yocto-spinner"
import { getStoredToken } from "../../../../lib/token.js"
import prisma from "../../../../lib/db.js"
import { select } from "@clack/prompts"
import { startChat } from "../../chat/chat-with-ai.js"
import { startToolChat } from "../../chat/chat-with-ai-tool.js"

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const wakeUpAction = async() => {
    const token = await getStoredToken()

    if (!token?.access_token){
        console.log(chalk.red("Not authenticated. Please login."))
        return;
    }

    const spinner = yoctoSpinner({text: "Fetching user information..."})
    spinner.start()

    let user = null;
    const MAX_RETRIES = 3;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            user = await prisma.user.findFirst({
                where:{
                    sessions: {
                        some: {
                            token: token.access_token,
                        }
                    }
                },
                select: {
                    id:true,
                    email:true,
                    name:true,
                    image:true
                }
            })
            break;
        } catch (error) {
            if (attempt === MAX_RETRIES) {
                spinner.error("Failed to connect to database after multiple attempts.")
                console.error(chalk.dim(error.message));
                return;
            }
            spinner.text = `${chalk.yellow("Database is sleeping...")} Waking up (Attempt ${attempt}/${MAX_RETRIES})`
            await sleep(5000);
        }
    }

    spinner.stop()

    if (!user){
        console.log(chalk.red("User doesn't exist or session expired."))
        return
    }

    console.log(chalk.green(`Welcome back, ${user.name} \n`))

    const choice = await select({
        message: "Select an option:",
        options: [
            {
                value: "chat",
                label: "Chat",
                hint: "Simple chat with AI",
            },
            {
                value: "tool",
                label: "Tool Calling",
                hint: "Chat with tools (Google Search, Code Execution)",
            },
            {
                value: "agent",
                label: "Agentic Mode",
                hint: "Advanced AI agent (Coming soon)",
            },
        ]
    })

    switch(choice){
        case "chat":
            startChat()
            break
        case "tool":
            startToolChat()
            break
        case "agent":
            console.log(chalk.yellow("Agentic mode coming soon... \n"))
            break
    }
}

export const wakeup = new Command("wakeup")
.description("Wake up the AI")
.action(wakeUpAction)