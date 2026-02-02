const buildArch = process.env.BUILD_ARCH || 'x64';
const isArm64 = buildArch === 'arm64';

const buildConfig = {
  appId: 'IPAbuyer.IPAbuyer',
  productName: 'IPAbuyer',
  buildVersion: '0.2.0.0',
  buildNumber: '1',
  icon: 'assets/Icon.ico',
  asarUnpack: ['include/*.exe'],
  directories: {
    buildResources: 'assets',
    output: 'release'
  },
  files: [
    'node_modules/**/*',
    'dist/**/*',
    'main/**/*',
    'include/**/*',
    'db/**/*',
    'package.json',
    isArm64 ? '!include/ipatool-2.2.0-windows-amd64.exe' : '!include/ipatool-2.2.0-windows-arm64.exe'
  ],
  win: {
    target: [
      {
        target: 'appx',
        arch: [buildArch]
      }
    ]
  },
  appx: {
    setBuildNumber: true,
    identityName: 'IPAbuyer.IPAbuyer',
    publisher: 'CN=68F867E4-B304-4B5D-9818-31B1910E0771',
    languages: ['zh-CN'],
    displayName: 'IPAbuyer',
    publisherDisplayName: 'IPAbuyer',
    applicationId: 'IPAbuyer',
    backgroundColor: '#ffffff'
  }
};

if (process.env.THUMBPRINT) {
  buildConfig.win.signtoolOptions = {
    certificateSha1: process.env.THUMBPRINT
  };
}

module.exports = buildConfig;
