const http = require('http');
const shell = require('shelljs');
const eURL = require('url');
const fs = require('fs');
const logger = require('logger').createLogger("vpn.log");
const sleep = require('sleep-promise');
const httpPort = 7199;

const site_server = http.createServer();

startHttpServer();

async function startHttpServer() {
    logger.info("HTTP server starting...");

    site_server.on('error', (err) => {
        logger.error("HTTP server error:", err.stack);
    });

    site_server.on('request', async (req, res) => {
        logger.info("Start request:", req.method);

        try {
            let U = eURL.parse(req.url, true);
            logger.info("Request info:", req.method, JSON.stringify(U));

            if (req.method === "GET") {
                switch (U.pathname.replace(/^\/|\/$/g, '')) {
                    case "create":
                        await addVpn(req, res, U.query);
                        break;
                    case "remove":
                        await removeVpn(req, res, U.query);
                        break;
                    case "list":
                        await listUser(req, res, U.query);
                        break;
                    case "check":
                        await checkToken(req, res, U.query);
                        break;
                    case "enableVpn":
                        await enableVpn(req, res, U.query);
                        break;
                    case "disableVpn":
                        await disableVpn(req, res, U.query);
                        break;
                    default:
                        logger.info("Pathname not found:", U.pathname);
                        res.write("Path not found");
                }
            }

            logger.info("End request");
        } catch (e) {
            logger.error("Error in request:", e.message);
            res.write("Server error occurred");
        }

        res.end();
    });

    site_server.listen(httpPort);
    logger.info("HTTP server listening on port " + httpPort);
}

async function findIp() {
    const data = fs.readFileSync('/etc/wireguard/wg0.conf', 'utf8');
    const allowedIPs = [];

    const lines = data.split('\n');
    for (let line of lines) {
        line = line.trim();
        if (line.startsWith('AllowedIPs')) {
            const ips = line.split('=')[1].trim().split(',');
            allowedIPs.push(...ips.map(ip => ip.trim()));
        }
    }

    for (let i = 3; i < 250; i++) {
        const ipToCheck = `10.66.66.${i}/32`;
        if (!allowedIPs.includes(ipToCheck)) {
            logger.info(`${ipToCheck} is available.`);
            return i;
        }
    }

    throw new Error('No available IP found');
}

async function checkToken(req, res, query) {
    const filePath = `/root/wg0-client-${query.publicKey}.conf`;
    if (fs.existsSync(filePath)) {
        res.write('true');
    } else {
        res.write('false');
    }
}

async function addVpn(req, res, query) {
    const privateIP = await findIp();
    await sleep(2222);
    logger.info('Assigned IP:', privateIP);

    const filePath = `/root/wg0-client-${query.publicKey}.conf`;
    if (!fs.existsSync(filePath)) {
        const result = shell.exec('/home/jwpn/wireguard-install.sh', { async: true });
        result.stdin.write(`1\n${query.publicKey}\n${privateIP}\n${privateIP}\n`);
        result.stdin.end();

        result.on('close', async () => {
            await sleep(2000);

            if (fs.existsSync(filePath)) {
                let fileContent = fs.readFileSync(filePath, 'utf8');
                fileContent = fileContent.replace('[Interface]', '[Interface]\nMTU = 1280');
                fileContent = fileContent.replace('[Peer]', '[Peer]\nPersistentKeepalive = 1');
                fs.writeFileSync(filePath, fileContent, 'utf8');

                res.write(fileContent);
            } else {
                res.write('File not found after creation');
            }
        });
    } else {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        res.write(fileContent);
    }
}

async function removeVpn(req, res, query) {
    const result = shell.exec('/home/jwpn/wireguard-install.sh', { async: true });
    result.stdin.write('3\n');

    result.stdout.on('data', (data) => {
        const regex = new RegExp(`(\\d+)\\) ${query.publicKey}`);
        const matches = regex.exec(data.toString());

        if (matches && matches[1]) {
            const number = matches[1];
            logger.info('Selected user number:', number);
            result.stdin.write(`${number}\n`);
        } else {
            logger.info('No match found for the public key');
        }
    });

    result.on('close', (code) => {
        logger.info('Command exited with code:', code);
        res.write('VPN removed.');
    });

    result.stdin.end();
}

async function listUser(req, res, query) {
    const result = shell.exec('/home/jwpn/wireguard-install.sh', { async: true });
    result.stdin.write('2\n');

    let listUserData = '';

    result.stdout.on('data', (data) => {
        listUserData += data.toString();
    });

    result.on('close', () => {
        logger.info('List of users:', listUserData);
        res.write(listUserData);
    });

    result.stdin.end();
}

async function enableVpn(req, res, query) {
    const filePath = `/root/wg0-client-${query.publicKey}.conf`;

    if (fs.existsSync(filePath)) {
        let fileContent = fs.readFileSync(filePath, 'utf8');
        const regex = /^PrivateKey\s*=\s*(.*)$/m;
        const match = regex.exec(fileContent);

        if (match && match[1].endsWith("1")) {
            const activeKey = match[1].slice(0, -1);
            fileContent = fileContent.replace(match[1], activeKey);
            fs.writeFileSync(filePath, fileContent, 'utf8');
            logger.info("VPN configuration activated for key:", query.publicKey);
            res.write("VPN configuration enabled.");
        } else {
            res.write("VPN configuration is already active.");
        }
    } else {
        res.write("Configuration file not found.");
    }
}

async function disableVpn(req, res, query) {
    const filePath = `/root/wg0-client-${query.publicKey}.conf`;

    if (fs.existsSync(filePath)) {
        let fileContent = fs.readFileSync(filePath, 'utf8');
        const regex = /^PrivateKey\s*=\s*(.*)$/m;
        const match = regex.exec(fileContent);

        if (match && !match[1].endsWith("1")) {
            const inactiveKey = match[1] + "1";
            fileContent = fileContent.replace(match[1], inactiveKey);
            fs.writeFileSync(filePath, fileContent, 'utf8');
            logger.info("VPN configuration deactivated for key:", query.publicKey);
            res.write("VPN configuration disabled.");
        } else {
            res.write("VPN configuration is already inactive.");
        }
    } else {
        res.write("Configuration file not found.");
    }
}
