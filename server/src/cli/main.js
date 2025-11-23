#!/usr/bin/env node

import dotenv from 'dotenv';
import chalk from 'chalk';
import figlet from 'figlet';

import { Command } from 'commander';
import { login, logout, whoami } from './commands/auth/login.js';

dotenv.config();

async function main() {
    //Display Banner
    console.log(
        chalk.cyan(
            figlet.textSync("Zyra CLI", {
                font: "Standard",
                horizontalLayout: "default",
            })
        )
    )
    console.log(chalk.red("A cli based AI Tool \n"));

    const program = new Command("zyra");

    program.version("0.0.1")
    .description("Zyra CLI - A Cli based AI Tool")
    .addCommand(login)
    .addCommand(logout)
    .addCommand(whoami)

    program.action(() => {
        program.help();
    })

    program.parse()
}

main().catch((err)=>{
    console.log(chalk.red("Error running zyra CLI: ", err));
    process.exit(1);
})