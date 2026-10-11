# Robot de test
Lance le serveur en local (ADMINS=Dave PORT=8897 ACCOUNTS_FILE=/tmp/acc-test.json node server.js), crée les comptes Dave et Bob (mot de passe testpass123), puis :
- `python3 bot.py [modes…]` : le robot joue les deux camps dans chaque mode solo et signale les blocages et les erreurs
- `python3 vs.py` : deux clients robots en versus, vérifie que les PV restent synchronisés
