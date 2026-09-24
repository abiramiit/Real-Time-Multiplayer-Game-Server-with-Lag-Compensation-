import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

async function run() {
    console.log("=== PHASE 11 BENCHMARK RUNNER ===");

    // 1. Boot Node Server
    const indexPath = path.join(__dirname, '../src/index.ts');
    console.log("Booting Server on port 9700...");
    const server = spawn('npx.cmd', ['tsx', indexPath], {
        env: { ...process.env, PORT: '9700', SERVER_ID: 'BENCH_NODE' },
        shell: true
    });

    server.stdout?.on('data', d => { });
    server.stderr?.on('data', d => console.log(`[SERVER-ERR] ${d.toString().trim()}`));

    // Wait for boot
    await new Promise(r => setTimeout(r, 6000));

    const scales = [1, 5, 10, 25, 50, 100];

    for (const count of scales) {
        console.log(`\n>> TARGETING: ${count} PLAYERS...`);
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
            console.error(`>> FAILED at ${count} players!`, e);
        }
        await new Promise(r => setTimeout(r, 2000));
    }

    console.log("Closing Server...");
    server.kill();
    process.exit(0);
}

run();
