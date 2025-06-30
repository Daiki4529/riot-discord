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
  // 1. Récupération brute
  const rawRiotId = interaction.options.getString("riotid", true);
  const region = interaction.options.getString("region", true);
  const userId = interaction.user.id;
  const serverId = interaction.guildId!;

  // 2. Normalisation & suppression des isolats invisibles
  const cleaned = rawRiotId
    .normalize("NFC")
    .replace(/[\u2066\u2069]/g, "") // U+2066 “⁦” et U+2069 “⁩”
    .trim();

  // 3. Extraction des deux parties autour de "#"
  const parts = cleaned.split("#");
  if (parts.length !== 2) {
    return interaction.reply({
      content:
        "Format invalide : votre Riot ID doit impérativement contenir un seul “#” (ex : SummonerName#1234).",
      flags: MessageFlags.Ephemeral,
    });
  }
  const [summonerName, tagLine] = parts;

  // 4. Validation stricte :
  //    - summonerName : lettres, chiffres, underscore, points ou tirets (3–16 chars)
  //    - tagLine : lettres ou chiffres (1–5 chars)
  const nameRe = /^[A-Za-z0-9_.-]{3,16}$/;
  const tagRe = /^[A-Za-z0-9]{1,5}$/;
  if (!nameRe.test(summonerName) || !tagRe.test(tagLine)) {
    return interaction.reply({
      content:
        "Votre pseudo doit : 3–16 caractères (lettres, chiffres, `_ . -`) et votre tag 1–5 chiffres ou lettres.",
      flags: MessageFlags.Ephemeral,
    });
  }

  // 5. Reconstruction du riotId “propre”
  const riotId = `${summonerName}#${tagLine}`;

  // --- reste inchangé : récupération de l'id_serveur et insertion SQL ---

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
    `INSERT INTO utilisateur (id_serveur, riot_id, user_id, region)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (id_serveur, user_id) DO UPDATE
       SET riot_id=EXCLUDED.riot_id, region=EXCLUDED.region`,
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
