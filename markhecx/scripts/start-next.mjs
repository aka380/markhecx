import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const mode = process.argv[2] || 'dev';
if (!['dev', 'start'].includes(mode)) throw Error('Expected dev or start');
process.env.NODE_ENV = mode === 'dev' ? 'development' : 'production';
if (existsSync('server/.env')) process.loadEnvFile('server/.env');
const cli = new URL('../node_modules/next/dist/bin/next', import.meta.url);
process.argv = [process.execPath, fileURLToPath(cli), mode, '--hostname', '127.0.0.1', '--port', '3001'];
await import(cli.href);
