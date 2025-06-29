import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
  EmbedBuilder,
} from "discord.js";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const data = new SlashCommandBuilder()
  .setName("register-riot")
  .setDescription("Enregistre ton compte Riot pour les alertes KDA")
  .addStringOption((opt) =>
    opt
      .setName("riotid")
      .setDescription("Ton pseudo Riot (ex: SummonerName)")
      .setRequired(true)
  )
  .addStringOption((opt) =>
    opt
      .setName("region")
      .setDescription("Région de ton serveur Riot")
      .setRequired(true)
      .addChoices(
        { name: "🇪🇺 EUW (Europe West)", value: "europe" },
        { name: "🇺🇸 NA (Americas)", value: "americas" },
        { name: "🇰🇷 KR (Korea)", value: "asia" }
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const riotId = interaction.options.getString("riotid", true);
  const region = interaction.options.getString("region", true);
  const userId = interaction.user.id;
  const serverId = interaction.guildId!;

  const res = await pool.query(`SELECT id FROM serveur WHERE server_id=$1`, [
    serverId,
  ]);
  if (!res.rowCount) {
    return interaction.reply({
      content:
        "Le channel d'alerte n'est pas défini ici. `/set-channel` d’abord.",
      flags: MessageFlags.Ephemeral,
    });
  }
  const idServeur = res.rows[0].id;

  await pool.query(
    `INSERT INTO utilisateur (id_serveur, riot_id, user_id, lol_server_name)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (id_serveur, user_id) DO UPDATE
       SET riot_id=EXCLUDED.riot_id, lol_server_name=EXCLUDED.lol_server_name`,
    [idServeur, riotId, userId, region]
  );

  const embed = new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle("✅ Compte Riot enregistré")
    .addFields(
      { name: "Riot ID", value: riotId, inline: true },
      { name: "Région", value: region.toUpperCase(), inline: true }
    )
    .setFooter({ text: `Utilisateur : ${interaction.user.tag}` })
    .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });
}
