import path from "path"

// En producción PM2 arranca el standalone, que hace process.chdir(.next/standalone).
// Todo lo que vive en el repo real (content/, staging/, scripts/, docs/) hay que
// resolverlo desde CONTENT_ROOT; process.cwd() solo vale en dev y tests.
export function getProjectRoot(): string {
  return process.env.CONTENT_ROOT || process.cwd()
}

export function fromProjectRoot(...segments: string[]): string {
  return path.resolve(getProjectRoot(), ...segments)
}
