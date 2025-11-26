import {promises as fs} from "fs";
import path from "path";
import chalk from "chalk";
import {generateObject} from "ai"
import {z} from "zod";

const ApplicationSchema = z.object({
    folderName: z.string().describe("Kebab-Case folder name for the application"),
    description: z.string().describe("Brief description of the what was created"),
    files:z.array(
        z.object({
            path: z.string().describe("Relative file path (e.g src/App.jsx)"),
            content: z.string().describe("Complete File Content")
        }).describe("All files needed for the application")
    ),
    setupCommands:z.array(
        z.string().describe("Bash commands to setup and run (e.g npm install && npm run dev)")
    ),
    dependencies: z.record(z.string())
    .optional()
    .describe("NPM dependencies with versions")
});