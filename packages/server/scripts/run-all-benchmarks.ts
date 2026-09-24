import { execSync } from 'child_process';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

async function run() {
    const indexPath = path.join(__dirname, '../src/index.ts');

    console.log("Booting Server on port 9700...");
    const server = spawn('npx.cmd', ['tsx', indexPath], {
        env: { ...process.env, PORT: '9700', SERVER_ID: 'BENCH_NODE' },
        shell: true
    });

    server.stdout?.on('data', d => console.log(`[SERVER] ${d.toString().trim()}`));
    server.stderr?.on('data', d => console.log(`[SERVER-ERR] ${d.toString().trim()}`));

    await new Promise(r => setTimeout(r, 6000));

    const scales = [1, 5, 10, 25, 50, 100];

    for (const count of scales) {
        console.log(`\n================================`);
        console.log(`RUNNING BENCHMARK: ${count} PLAYERS`);
        console.log(`================================`);

        try {
            execSync(`npx.cmd tsx scripts/loadTest.ts`, {
                env: {
                    ...process.env,
                    TARGET_HOST: 'ws://localhost:9700',
                    PLAYERS: count.toString(),
                    DURATION: '15'
                },
                stdio: 'inherit'
            });
        } catch (e) {
            console.error(`Benchmark failed for ${count} players!`, e);
            break;
        }
        await new Promise(r => setTimeout(r, 2000));
    }

    console.log("Tearing down Server...");
    server.kill();
    process.exit(0);
}

run();
