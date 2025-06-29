require("dotenv").config();
const { REST, Routes } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");

const token = process.env.BOT_TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token || !clientId) {
  console.error(
    "❌ Assure-toi d’avoir défini BOT_TOKEN et CLIENT_ID dans ton .env"
  );
  process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, "dist/commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((f) => f.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ("data" in command && "execute" in command) {
    commands.push(command.data.toJSON());
  } else {
    console.warn(
      `[WARNING] Le fichier ${filePath} manque "data" ou "execute".`
    );
  }
}

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  try {
    console.log(`Déploiement de ${commands.length} commandes globales...`);
    const data = await rest.put(Routes.applicationCommands(clientId), {
      body: commands,
    });
    console.log(`✅ ${data.length} commandes globales déployées.`);
  } catch (error) {
    console.error(error);
  }
})();
