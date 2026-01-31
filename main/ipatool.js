const path = require('node:path');
const { spawn } = require('node:child_process');
const fs = require('node:fs');

const IPATOOL_FORMAT = 'text';
const ANSI_REGEX = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

const stripAnsi = (value) => (value ? value.replace(ANSI_REGEX, '') : value);

function getIpatoolPath() {
  const arch = process.arch;
  if (arch === 'arm64') {
    return path.join(__dirname, '../include/ipatool-2.2.0-windows-arm64.exe');
  }
  return path.join(__dirname, '../include/ipatool-2.2.0-windows-amd64.exe');
}

const ensureBinary = () => {
  const ipatoolPath = getIpatoolPath();
  if (!fs.existsSync(ipatoolPath)) {
    throw new Error(`ipatool.exe not found at ${ipatoolPath}`);
  }
  return ipatoolPath;
};

const runCommand = (args) =>
  new Promise((resolve) => {
    let ipatoolPath;
    try {
      ipatoolPath = ensureBinary();
    } catch (error) {
      resolve({ code: -1, output: error.message, stdout: '', stderr: error.message });
      return;
    }
    const child = spawn(ipatoolPath, args, { windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    child.on('error', (err) => {
      resolve({ code: -1, output: err.message, stdout, stderr: err.message });
    });
    child.on('close', (code) => {
      const cleanStdout = stripAnsi(stdout).trim();
      const cleanStderr = stripAnsi(stderr).trim();
      const output = `${cleanStdout}\n${cleanStderr}`.trim();
      resolve({ code, output, stdout: cleanStdout, stderr: cleanStderr });
    });
  });

const isTestAccount = ({ email, password }) => email === 'test' && password === 'test';

const login = async ({ email, password, authCode, passphrase }) => {
  if (isTestAccount({ email, password })) {
    return {
      ok: true,
      mock: true,
      message: '测试账户登录成功（模拟）'
    };
  }
  const args = [
    'auth',
    'login',
    '--email',
    email,
    '--password',
    password,
    '--keychain-passphrase',
    passphrase,
    '--format',
    IPATOOL_FORMAT
  ];
  if (authCode) {
    args.push('--auth-code', authCode);
  }
  const result = await runCommand(args);
  return {
    ok: result.code === 0,
    ...result
  };
};

const authInfo = async ({ passphrase, currentAuth }) => {
  if (currentAuth?.isTest) {
    return {
      ok: true,
      mock: true,
      message: '测试账户处于登录状态',
      email: currentAuth.email
    };
  }
  const result = await runCommand([
    'auth',
    'info',
    '--keychain-passphrase',
    passphrase,
    '--format',
    IPATOOL_FORMAT
  ]);
  return { ok: result.code === 0, ...result };
};

const authRevoke = async ({ currentAuth }) => {
  if (currentAuth?.isTest) {
    return { ok: true, mock: true, message: '测试账户已登出' };
  }
  const result = await runCommand(['auth', 'revoke', '--format', IPATOOL_FORMAT]);
  return { ok: result.code === 0, ...result };
};

const purchase = async ({ bundleIds, passphrase, currentAuth }) => {
  if (!Array.isArray(bundleIds) || bundleIds.length === 0) {
    return { ok: false, message: 'No bundleIds provided', results: [] };
  }
  if (currentAuth?.isTest) {
    return {
      ok: true,
      mock: true,
      results: bundleIds.map((bundleId) => ({
        bundleId,
        ok: true,
        stdout: '测试账户购买成功'
      }))
    };
  }

  const results = [];
  for (const bundleId of bundleIds) {
    const res = await runCommand([
      'purchase',
      '--keychain-passphrase',
      passphrase,
      '--bundle-identifier',
      bundleId,
      '--format',
      IPATOOL_FORMAT
    ]);
    results.push({ bundleId, ...res, ok: res.code === 0 });
  }
  const ok = results.every((r) => r.ok);
  return { ok, results };
};

const download = async ({ bundleIds, passphrase, outputDir, currentAuth }) => {
  if (!Array.isArray(bundleIds) || bundleIds.length === 0) {
    return { ok: false, message: 'No bundleIds provided', results: [] };
  }
  if (currentAuth?.isTest) {
    const files = bundleIds.map((bundleId) => path.join(outputDir, `${bundleId}.ipa`));
    for (const file of files) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, 'mock ipa content');
    }
    return {
      ok: true,
      mock: true,
      results: bundleIds.map((bundleId) => ({
        bundleId,
        ok: true,
        stdout: `测试账户下载成功 -> ${path.join(outputDir, bundleId + '.ipa')}`
      }))
    };
  }

  const results = [];
  for (const bundleId of bundleIds) {
    const outFile = path.join(outputDir, `${bundleId}.ipa`);
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    const res = await runCommand([
      'download',
      '--keychain-passphrase',
      passphrase,
      '--output',
      outFile,
      '--bundle-identifier',
      bundleId,
      '--format',
      IPATOOL_FORMAT
    ]);
    results.push({ bundleId, target: outFile, ...res, ok: res.code === 0 });
  }
  const ok = results.every((r) => r.ok);
  return { ok, results };
};

module.exports = {
  login,
  authInfo,
  authRevoke,
  purchase,
  download
};
