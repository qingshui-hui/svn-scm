import * as path from "path";
import {
  Uri
} from "vscode";

export function getIconObject(iconName: string): { light: Uri; dark: Uri } {
  // XXX Maybe use full path to extension?
  // Path needs to be relative from out/
  const iconsRootPath = path.join(__dirname, "..", "icons");
  const toUri = (theme: string) =>
    Uri.file(path.join(iconsRootPath, theme, `${iconName}.svg`));
  return {
    light: toUri("light"),
    dark: toUri("dark")
  };
}
