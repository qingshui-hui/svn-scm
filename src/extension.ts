import {
  commands,
  Disposable,
  ExtensionContext,
  OutputChannel,
  window
} from "vscode";
import { ConstructorPolicy } from "./common/types";
import { configuration } from "./helpers/configuration";
import { SourceControlManager } from "./source_control_manager";
import { Svn } from "./svn";
import { SvnFinder } from "./svnFinder";
import { toDisposable } from "./util";
import { BranchChangesProvider } from "./historyView/branchChangesProvider";

async function init(
  _context: ExtensionContext,
  outputChannel: OutputChannel,
  disposables: Disposable[]
) {
  const pathHint = configuration.get<string>("path");
  const svnFinder = new SvnFinder();

  const info = await svnFinder.findSvn(pathHint);
  const svn = new Svn({ svnPath: info.path, version: info.version });
  const sourceControlManager = await new SourceControlManager(
    svn,
    ConstructorPolicy.Async
  );

  disposables.push(new BranchChangesProvider(sourceControlManager));

  outputChannel.appendLine(`Using svn "${info.version}" from "${info.path}"`);

  const onOutput = (str: string) => outputChannel.append(str);
  svn.onOutput.addListener("log", onOutput);
  disposables.push(
    toDisposable(() => svn.onOutput.removeListener("log", onOutput))
  );
}

async function _activate(context: ExtensionContext, disposables: Disposable[]) {
  const outputChannel = window.createOutputChannel("Svn2");
  commands.registerCommand("svn.showOutput2", () => outputChannel.show());
  disposables.push(outputChannel);

  const showOutput2 = configuration.get<boolean>("showOutput2");

  if (showOutput2) {
    outputChannel.show();
  }

  const tryInit = async () => {
    try {
      await init(context, outputChannel, disposables);
    } catch (err) {
      if (!/Svn installation not found/.test(err.message || "")) {
        throw err;
      }
    }
  };

  await tryInit();
}

export async function activate(context: ExtensionContext) {
  const disposables: Disposable[] = [];
  context.subscriptions.push(
    new Disposable(() => Disposable.from(...disposables).dispose())
  );

  await _activate(context, disposables).catch(err => console.error(err));
}

// this method is called when your extension is deactivated
// eslint-disable-next-line @typescript-eslint/no-empty-function
function deactivate() {}
exports.deactivate = deactivate;
