import { execFileSync, execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bundleDir = path.join(root, 'bundle');
const frontendOutput = path.join(root, 'frontend', 'dist', 'snip-frontend', 'browser');
const shouldPush = process.argv.includes('--push');

function runGit(args, cwd = root) {
    execFileSync('git', args, { cwd, stdio: 'inherit' });
}

function runShell(command, cwd) {
    execSync(command, { cwd, stdio: 'inherit', shell: true });
}

function hasStagedChanges(cwd) {
    try {
        execFileSync('git', ['diff', '--cached', '--quiet'], { cwd, stdio: 'ignore' });
        return false;
    } catch {
        return true;
    }
}

async function writeGeneratedFiles() {
    await mkdir(bundleDir, { recursive: true });

    await cp(path.join(root, 'backend', 'server.js'), path.join(bundleDir, 'server.js'));
    await cp(path.join(root, 'cli', 'cli.js'), path.join(bundleDir, 'cli.js'));

    const publicDir = path.join(bundleDir, 'public');
    await rm(publicDir, { recursive: true, force: true });
    await cp(frontendOutput, publicDir, { recursive: true });

    await writeFile(path.join(bundleDir, '.env'), 'PUBLIC_DIR=./public\n');
    await writeFile(
        path.join(bundleDir, 'package.json'),
        `${JSON.stringify({ name: 'snip-bundle', private: true, scripts: { start: 'bun server.js' } }, null, 2)}\n`,
    );
    await writeFile(
        path.join(bundleDir, 'Dockerfile'),
        'FROM oven/bun:1-alpine\nCOPY . .\nENV PORT=3000\nEXPOSE 3000\nCMD bun server.js\n',
    );
    await writeFile(
        path.join(bundleDir, '.dockerignore'),
        '.git\nnode_modules\nnpm-debug.log\n',
    );
    await writeFile(
        path.join(bundleDir, 'railway.json'),
        `${JSON.stringify({ $schema: 'https://railway.com/railway.schema.json', build: { builder: 'DOCKERFILE' } }, null, 2)}\n`,
    );
}

function commitIfChanged(cwd, message) {
    runGit(['add', '-A'], cwd);
    if (!hasStagedChanges(cwd)) {
        console.log(`No changes to commit in ${path.relative(root, cwd) || '.'}.`);
        return false;
    }
    runGit(['commit', '-m', message], cwd);
    return true;
}

runGit(['submodule', 'update', '--init', '--remote', 'backend', 'frontend', 'cli']);
runShell('npm install', path.join(root, 'frontend'));
runShell('npx ng build', path.join(root, 'frontend'));

if (!existsSync(path.join(frontendOutput, 'index.html'))) {
    throw new Error(`Frontend build output is missing: ${path.join(frontendOutput, 'index.html')}`);
}

await writeGeneratedFiles();
const bundleChanged = commitIfChanged(bundleDir, 'Generate bundle output');

if (shouldPush && bundleChanged) {
    runGit(['push', 'origin', 'HEAD:bundle'], bundleDir);
} else if (shouldPush) {
    console.log('Bundle unchanged; no bundle push needed.');
}

const pointerChanged = commitIfChanged(root, 'Bump bundle submodule');
if (shouldPush && pointerChanged) {
    runGit(['push', 'origin', 'main'], root);
} else if (shouldPush) {
    console.log('Main unchanged; no main push needed.');
}
