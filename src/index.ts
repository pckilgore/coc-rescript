import {
  ExtensionContext,
  ServerOptions,
  LanguageClient,
  services,
  workspace,
} from 'coc.nvim';
import fs from 'fs';
import path from 'path';
import Zip from 'adm-zip';
import fetch from 'node-fetch';

const GITHUB = 'https://api.github.com';
const TAGS = '/repos/rescript-lang/rescript-vscode/tags';
const VS_MARKETPLACE =
  'https://marketplace.visualstudio.com/_apis/public/gallery';
const PUBLISHER = 'chenglou92';
const NAME = 'rescript-vscode';

/**
 * Path to compiled extension zipbell
 */
function extensionUrl(version: string) {
  return [
    VS_MARKETPLACE,
    `/publishers/${PUBLISHER}`,
    '/vsextensions',
    `/${NAME}/${version}`,
    '/vspackage',
  ].join('');
}

async function downloadServer(basePath: string): Promise<void> {
  workspace.showMessage(`Finding latest rescript-language-server ...`);

  // TODO: Ask Patrick to use releases...
  const tagRes = await fetch(GITHUB + TAGS);
  const tags = await tagRes.json();
  const version = tags[0].name;

  workspace.showMessage(`Downloading rescript-language-server@${version}`);

  const data = await fetch(extensionUrl(version), {
    headers: { 'User-Agent': 'curl' },
  });
  const zip = await data.buffer();

  const zipName = `rls-${version}.zip`;
  const zipPath = path.join(basePath, zipName);

  fs.writeFileSync(zipPath, zip);
  new Zip(zipPath).extractAllTo(basePath, true);

  workspace.showMessage(`Installed rescript-language-server@${version}!`);
}

async function getCommand(basePath: string): Promise<string> {
  const cmdPath = path.join(
    basePath,
    'extension',
    'server',
    'out',
    'server.js'
  );

  if (!fs.existsSync(cmdPath)) {
    await downloadServer(basePath);
  }

  return cmdPath;
}

async function activate(context: ExtensionContext) {
  const basePath = context.asAbsolutePath('./rls');
  const module = await getCommand(basePath);

  const serverOptions: ServerOptions = {
    run: { module },
    debug: {
      module,
      options: {
        execArgv: [`--nolazy`, '--inspect=6009'],
      },
    },
  };

  const clientOptions = {
    documentSelector: [{ language: 'rescript', scheme: 'file' }],
    synchronize: {
      configurationSection: 'rescript',
    },
  };

  const languageClient = new LanguageClient(
    'coc-rescript',
    'coc-rescript',
    serverOptions,
    clientOptions
  );

  context.subscriptions.push(services.registLanguageClient(languageClient));
}

export { activate };
