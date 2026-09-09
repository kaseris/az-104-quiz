import { spawn } from 'node:child_process';
import { createServer } from 'vite';
import electron from 'electron';

const server = await createServer();
await server.listen();
const env = { ...process.env, AZ104_DEV_SERVER: 'http://127.0.0.1:5173' };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(electron, ['.'], { stdio: 'inherit', env });
const stop = async () => {
  child.kill();
  await server.close();
};
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
child.once('exit', async (code) => {
  await server.close();
  process.exitCode = code ?? 0;
});
