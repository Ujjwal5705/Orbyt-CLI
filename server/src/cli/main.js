#!/usr/bin/env node

import dotenv from 'dotenv'
import chalk from 'chalk'
import figlet from 'figlet'
import { Command } from 'commander'
import { login, logout, whoami } from './commands/auth/login.js'
import { wakeup } from './commands/ai/wakeUp.js'

dotenv.config()

async function main() {
    // Display banner
    console.log(
        chalk.cyan(
            figlet.textSync('Orbyt CLI', {
                font: 'Standard',
                horizontalLayout: 'default'
            })
        )
    )

    console.log(chalk.gray('A CLI based AI tool \n'))

    const program = new Command('orbyt')
    program.version('0.0.1')
    .description('Orbyt CLI - A CLI based AI tool')
    .addCommand(login)
    .addCommand(logout)
    .addCommand(whoami)
    .addCommand(wakeup)

    // Default action shows help
    program.action(() => {
        program.help()
    })

    program.parse()
}

main().catch((err) => {
    console.log(chalk.red('Error running Orbyt CLI :', err))
    process.exit(1)
})