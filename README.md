# start
sudo apt update && apt upgrade -y


sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
NODE_MAJOR=20
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list
sudo apt-get update
sudo apt-get install nodejs -y




git clone https://github.com/alireza1364sh/jwpn.git
mv jwpn/ /home
cd /home
cd jwpn




npm i

chmod +x wireguard-install.sh
./wireguard-install.sh
nano /etc/systemd/system/jwpn.service

[Unit]
Description=Tunnel WireGuard with udp2raw
After=network.target

[Service]
Type=simple
User=root
ExecStart=sudo node /home/jwpn/main.js
Restart=no

[Install]
WantedBy=multi-user.target

systemctl enable --now jwpn.service 


you should upload install file to server

nano install.sh

chmod +x install.sh
./install.sh

or
sudo apt install nodejs npm -y


sudo npm install -g pm2

pm2 start main.js
pm2 list


sudo mkdir -p /usr/local/bin/udp2raw-tunnel
sudo mv /home/jwpn/udp2raw-tunnel/udp2raw /usr/local/bin/udp2raw-tunnel/
sudo systemctl status udp2raw
