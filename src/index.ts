import dotenv from "dotenv";
dotenv.config();

import { Client, Collection, GatewayIntentBits } from "discord.js";
import * as fs from "node:fs";
import * as path from "node:path";
import { ClientWithCommands } from "./types/client";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
}) as ClientWithCommands;
client.commands = new Collection();

// Charge les commandes
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((f) => f.endsWith(".js"));
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
  }
}

client.once("ready", () => {
  console.log(`Connecté en tant que ${client.user!.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: "Erreur interne.", ephemeral: true });
  }
});

// Démarre cron après login
import "./cron";

client.login(process.env.BOT_TOKEN);
