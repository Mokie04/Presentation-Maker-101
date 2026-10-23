import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { expect, it } from 'vitest';

const methods = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
const exemptions = new Set(['session/route.ts']); // Session bootstraps auth and cannot require an existing session.

function routeFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? routeFiles(file) : entry.name === 'route.ts' ? [file] : [];
  });
}

it('assigns every protected HTTP handler directly from defineRoute', () => {
  const root = path.resolve('src/app/api');
  const files = routeFiles(root).filter((file) => !exemptions.has(path.relative(root, file).split(path.sep).join('/')));
  expect(files).toHaveLength(11);
  const offenders: string[] = [];
  let handlers = 0;
  for (const file of files) {
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    for (const statement of source.statements) {
      if (ts.isExportDeclaration(statement)) {
        if (!statement.exportClause || (ts.isNamedExports(statement.exportClause) &&
          statement.exportClause.elements.some((item) => methods.has(item.name.text)))) offenders.push(file);
        continue;
      }
      const exported = ts.canHaveModifiers(statement) && ts.getModifiers(statement)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
      if (!exported) continue;
      if (ts.isFunctionDeclaration(statement) && statement.name && methods.has(statement.name.text)) {
        offenders.push(file);
      }
      if (ts.isVariableStatement(statement)) {
        for (const declaration of statement.declarationList.declarations) {
          if (!ts.isIdentifier(declaration.name) || !methods.has(declaration.name.text)) continue;
          handlers++;
          const value = declaration.initializer;
          if (!value || !ts.isCallExpression(value) || !ts.isIdentifier(value.expression) || value.expression.text !== 'defineRoute') {
            offenders.push(file);
          }
        }
      }
    }
  }
  expect(Array.from(new Set(offenders)).map((file) => path.relative(root, file)), 'HTTP handlers must use defineRoute').toEqual([]);
  expect(handlers).toBeGreaterThanOrEqual(files.length);
});
