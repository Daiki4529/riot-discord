import axios from "axios";
import { Pool } from "pg";
import cron from "node-cron";
import { Client, EmbedBuilder, TextChannel } from "discord.js";
import dotenv from "dotenv";
import { AccountDto } from "./interfaces/account";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const discord = new Client({ intents: [] });
const threshold = Number(process.env.KDA_THRESHOLD);

const catchPhrases = [
  "GG EZ — T'as autant de kills que de braincells",
  'Même un Bronze V aurait dit "wow ur so trash"',
  "Jolie Bausen Law — t'as juste oublié de powerspike",
  "Espèce d'animal va, même Noé t'aurait pas pris dans son arche",
  "À moins que tu smurf, tu pues la merde, mais ça veut pas dire que tu dois arrêter, tu peux toujours descendre plus bas",
  "T'as tellement de morts que tu pourrais remplir un cimetière",
  "Je sais que tu fais de ton mieux, mais arrête, tes teammates veulent juste gagner",
  "Imagine si tes parents n'étaient pas frères et soeurs",
  'La touche F c\'est pour "Flash" pas pour "Feed"',
];

discord.login(process.env.BOT_TOKEN);

cron.schedule(
  process.env.CRON_SCHEDULE!,
  async () => {
    const client = discord;
    const srvRes = await pool.query(`SELECT * FROM serveur`);
    for (const srv of srvRes.rows) {
      const usrRes = await pool.query(
        `SELECT * FROM utilisateur WHERE id_serveur = $1`,
        [srv.id]
      );
      const channel = await client.channels.fetch(srv.channel_id);
      if (!channel || !(channel instanceof TextChannel)) continue;

      for (const u of usrRes.rows) {
        try {
          // Split Riot ID into gameName and tagLine
          const [gameName, tagLine] = u.riot_id.split("#");

          // 1) Fetch account via the Account-v1 endpoint and X-Riot-Token header
          const accountRes = await axios.get<AccountDto>(
            `https://${u.lol_server_name}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/` +
              `${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
            {
              headers: {
                "X-Riot-Token": process.env.RIOT_API_KEY!,
              },
            }
          );
          const puuid = accountRes.data.puuid;

          const fiveMinutesAgoEpoch = Math.floor(
            (Date.now() - 5 * 60 * 1000) / 1000
          );

          // 2) Fetch the most recent match ID
          const { data: matchIds } = await axios.get<string[]>(
            `https://${u.lol_server_name}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids`,
            {
              params: { start: 0, count: 1, startTime: fiveMinutesAgoEpoch },
              headers: {
                "X-Riot-Token": process.env.RIOT_API_KEY!,
              },
            }
          );
          if (matchIds.length === 0) continue;
          const matchId = matchIds[0];

          // 3) Fetch match details
          const { data: match } = await axios.get<any>(
            `https://${u.lol_server_name}.api.riotgames.com/lol/match/v5/matches/${matchId}`,
            {
              headers: {
                "X-Riot-Token": process.env.RIOT_API_KEY!,
              },
            }
          );

          // 4) Find participant and compute KDA
          const participant = match.info.participants.find(
            (p: any) => p.puuid === puuid
          );
          if (!participant) continue;

          const { kills, deaths, assists } = participant;
          const kdaValue = participant.kills - participant.deaths;

          if (kdaValue < threshold) {
            // Build and send an embed instead of plain text
            const alertEmbed = new EmbedBuilder()
              .setColor("#ED4245")
              .setTitle("⚠️ Alerte KDA négatif")
              .setDescription(
                `<@${u.user_id}>, ${
                  catchPhrases[Math.floor(Math.random() * catchPhrases.length)]
                }`
              )
              .addFields(
                { name: "Pseudo Riot", value: u.riot_id, inline: true },
                {
                  name: "Région",
                  value: u.lol_server_name.toUpperCase(),
                  inline: true,
                },
                { name: "Kills", value: `${kills}`, inline: true },
                { name: "Deaths", value: `${deaths}`, inline: true },
                { name: "Assists", value: `${assists}`, inline: true },
                { name: "K - D", value: `${kdaValue}`, inline: true }
              )
              .setFooter({ text: "Alerté automatiquement" })
              .setTimestamp();

            await channel.send({ embeds: [alertEmbed] });
          }
          console.log(
            `KDA pour ${u.riot_id}@${u.lol_server_name}: ${participant.kills}/${participant.deaths} (K-D: ${kdaValue})`
          );
        } catch (err: any) {
          console.error(
            `Erreur pour ${u.riot_id}@${u.lol_server_name}:`,
            err.message
          );
        }
      }
    }
  },
  { timezone: "Europe/Paris" }
);
