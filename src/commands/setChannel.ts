import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
  EmbedBuilder,
} from "discord.js";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const data = new SlashCommandBuilder()
  .setName("set-channel")
  .setDescription("Définit le channel d'alerte pour ce serveur")
  .addChannelOption((opt) =>
    opt
      .setName("channel")
      .setDescription("Channel où poster les alertes")
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const channel = interaction.options.getChannel("channel", true);
  const guildId = interaction.guildId!;

  await pool.query(
    `INSERT INTO serveur (server_id, channel_id)
     VALUES ($1, $2)
     ON CONFLICT (server_id) DO UPDATE SET channel_id = EXCLUDED.channel_id`,
    [guildId, channel.id]
  );

  const embed = new EmbedBuilder()
    .setColor("#57F287")
    .setTitle("🔧 Channel d'alerte mis à jour")
    .setDescription(`${channel} est désormais le channel d'alerte.`)
    .setFooter({ text: `Demandé par ${interaction.user.tag}` })
    .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });
}
