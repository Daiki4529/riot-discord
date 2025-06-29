# Riot-Discord Bot

Bot Discord en TypeScript / discord.js v14 qui :
- Permet aux utilisateurs d’enregistrer leur compte Riot (`/register-riot`)
- Définit un channel d’alerte par serveur (`/set-channel`)
- Vérifie périodiquement (cron) le dernier match de chaque user
- Envoie un message si le joueur a un KDA négatif

---

## Prérequis

- Node.js ≥ 24
- Docker & Docker Compose
- Clé Discord Bot (token) et Client ID
- Clé Riot API

---

## Installation

1. **Clone**  
   ```bash
   git clone https://github.com/Daiki4529/riot-discord.git
   cd riot-discord
