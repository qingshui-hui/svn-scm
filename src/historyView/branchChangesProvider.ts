import {
  TreeDataProvider,
  Disposable,
  TreeItem,
  commands,
  EventEmitter,
  window
} from "vscode";
import { SourceControlManager } from "../source_control_manager";
import { ISvnPathChange, Status } from "../common/types";
import { getIconObject } from "./common";
import { dispose } from "../util";

export class BranchChangesProvider
  implements TreeDataProvider<ISvnPathChange>, Disposable {
  private _dispose: Disposable[] = [];
  private _onDidChangeTreeData = new EventEmitter<ISvnPathChange | undefined>();
  public readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private fromRevision = "PREV";
  private toRevision = "BASE";

  constructor(private model: SourceControlManager) {
    this._dispose.push(
      window.registerTreeDataProvider("revisiondiffs", this),
      commands.registerCommand(
        "svn.revisiondiffs.refresh",
        () => this._onDidChangeTreeData.fire(),
        this
      ),
      commands.registerCommand(
        "svn.revisiondiffs.changeRevision",
        async (item: ISvnPathChange) => this.changeRevision(item)
      ),
      this.model.onDidChangeRepository(() => this._onDidChangeTreeData.fire())
    );
  }

  dispose() {
    dispose(this._dispose);
  }

  getTreeItem(element: ISvnPathChange): TreeItem | Thenable<TreeItem> {
    if (element.item === "fromRevision") {
      return {
        label: "From Revision: " + element.oldRevision,
        contextValue: "changeRevision"
      };
    } else if (element.item === "toRevision") {
      return {
        label: "To Revision: " + element.oldRevision,
        contextValue: "changeRevision"
      };
    }

    let iconName: string = "";
    if (element.item === Status.ADDED) {
      iconName = "status-added";
    } else if (element.item === Status.DELETED) {
      iconName = "status-deleted";
    } else if (element.item === Status.MODIFIED) {
      iconName = "status-modified";
    }

    const iconPath = getIconObject(iconName);

    return {
      label: element.localPath.fsPath,
      command: {
        command: "svn.branchchanges.openDiff",
        title: "Open diff",
        arguments: [element]
      },
      iconPath,
      tooltip: `${element.oldPath.fsPath.replace(element.repo.fsPath, "")}@r${
        element.oldRevision
      } → ${element.newPath.fsPath.replace(element.repo.fsPath, "")}@r${
        element.newRevision
      }`
    };
  }

  getChildren(element?: ISvnPathChange): Promise<ISvnPathChange[]> {
    if (element !== undefined) {
      return Promise.resolve([]);
    }

    const changes: Promise<ISvnPathChange[]>[] = [];

    // show revision
    changes.push(
      {
        oldRevision: this.fromRevision,
        item: "fromRevision"
      },
      {
        oldRevision: this.toRevision,
        item: "toRevision"
      }
    );

    for (const repo of this.model.repositories) {
      changes.push(repo.getChanges(this.fromRevision, this.toRevision));
    }

    return Promise.all(changes).then(value =>
      value.reduce((prev, curr) => prev.concat(curr), [])
    );
  }

  public async changeRevision(element: ISvnPathChange) {
    if (element.item === "fromRevision") {
      const revision = await window.showInputBox({
        prompt: "Enter from revision"
      });
      if (revision === undefined) {
        return;
      }
      element.oldRevision = revision;
      this.fromRevision = revision;
      // update view
      this._onDidChangeTreeData.fire(element);
    } else if (element.item === "toRevision") {
      const revision = await window.showInputBox({
        prompt: "Enter to revision"
      });
      if (revision === undefined) {
        return;
      }
      element.oldRevision = revision;
      this.toRevision = revision;
      // update view
      this._onDidChangeTreeData.fire(element);
    }
  }
}
