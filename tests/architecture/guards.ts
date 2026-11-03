// Pure checkers behind the architecture guard tests. Each takes source text, so the
// tests can run them on the repository and on deliberately violating samples.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

export function toPosix(file: string): string {
  return file.split(path.sep).join('/');
}

export function listFiles(directory: string, include: (name: string) => boolean, skip: (file: string) => boolean = () => false): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (skip(file)) return [];
    return entry.isDirectory() ? listFiles(file, include, skip) : include(entry.name) ? [file] : [];
  });
}

function parse(fileName: string, text: string): ts.SourceFile {
  const kind = /\.[cm]?tsx$|\.jsx$/.test(fileName) ? ts.ScriptKind.TSX : /\.[cm]?js$/.test(fileName) ? ts.ScriptKind.JS : ts.ScriptKind.TS;
  return ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, kind);
}

function where(source: ts.SourceFile, node: ts.Node): string {
  return `${source.fileName}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1}`;
}

function propertyName(node: ts.Node): string | undefined {
  if (ts.isPropertyAccessExpression(node)) return node.name.text;
  if (ts.isElementAccessExpression(node) && ts.isStringLiteralLike(node.argumentExpression)) return node.argumentExpression.text;
  return undefined;
}

function unwrap(node: ts.Expression): ts.Expression {
  let current = node;
  while (ts.isParenthesizedExpression(current) || ts.isNonNullExpression(current) || ts.isAsExpression(current)) current = current.expression;
  return current;
}

// ---------------------------------------------------------------------------
// Configuration boundary: process.env is read only in the allowed files.

const processModules = new Set(['process', 'node:process']);

function isProcessRequire(node: ts.Expression): boolean {
  const value = unwrap(node);
  return ts.isCallExpression(value) && ts.isIdentifier(value.expression) && value.expression.text === 'require' &&
    value.arguments.length === 1 && ts.isStringLiteralLike(value.arguments[0]) && processModules.has(value.arguments[0].text);
}

/**
 * Every read of the environment object: `process.env`, `process?.env`, `process['env']`,
 * `globalThis.process.env` (any receiver), `const { env } = process`, and `env` imported
 * from `process` or `node:process` (named, default, namespace or require).
 */
export function findEnvReads(fileName: string, text: string): string[] {
  const source = parse(fileName, text);
  const processNames = new Set(['process']);
  const reads: string[] = [];

  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteralLike(statement.moduleSpecifier)) continue;
    if (!processModules.has(statement.moduleSpecifier.text) || !statement.importClause) continue;
    const clause = statement.importClause;
    if (clause.name) processNames.add(clause.name.text);
    if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) processNames.add(clause.namedBindings.name.text);
    if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
      for (const element of clause.namedBindings.elements) {
        if ((element.propertyName ?? element.name).text === 'env') reads.push(`${where(source, element)} imports env from ${statement.moduleSpecifier.text}`);
      }
    }
  }

  const isProcess = (node: ts.Expression): boolean => {
    const value = unwrap(node);
    if (ts.isIdentifier(value)) return processNames.has(value.text);
    if (propertyName(value) === 'process') return true; // globalThis.process, global['process'], window?.process
    return isProcessRequire(value);
  };

  const visit = (node: ts.Node): void => {
    if ((ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) && propertyName(node) === 'env' && isProcess(node.expression)) {
      reads.push(`${where(source, node)} reads ${node.getText(source)}`);
    }
    if (ts.isVariableDeclaration(node) && ts.isObjectBindingPattern(node.name) && node.initializer && isProcess(node.initializer)) {
      for (const element of node.name.elements) {
        const key = element.propertyName ?? element.name;
        if ((ts.isIdentifier(key) || ts.isStringLiteralLike(key)) && key.text === 'env') reads.push(`${where(source, element)} destructures env from process`);
      }
    }
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && isProcessRequire(node.initializer)) {
      processNames.add(node.name.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return reads;
}

// ---------------------------------------------------------------------------
// Route policy.

export const httpMethods = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);
export const isRouteFile = (name: string): boolean => /^route\.[cm]?[jt]sx?$/.test(name);
export const DEFINE_ROUTE_MODULE = '@/lib/api';

export interface RouteReport {
  /** Exported HTTP handlers assigned from the imported defineRoute. */
  handlers: number;
  problems: string[];
}

function isExported(statement: ts.Statement): boolean {
  return Boolean(ts.canHaveModifiers(statement) && ts.getModifiers(statement)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword));
}

/** Checks one route file. Exempt routes skip only the defineRoute rules, never maxDuration. */
export function checkRoute(fileName: string, text: string, { exempt = false } = {}): RouteReport {
  const source = parse(fileName, text);
  const problems: string[] = [];
  let handlers = 0;
  let defineRouteImported = false;
  let maxDuration = false;

  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement) && statement.importClause?.namedBindings && ts.isNamedImports(statement.importClause.namedBindings)) {
      const specifier = ts.isStringLiteralLike(statement.moduleSpecifier) ? statement.moduleSpecifier.text : '';
      for (const element of statement.importClause.namedBindings.elements) {
        if (element.name.text !== 'defineRoute' && element.propertyName?.text !== 'defineRoute') continue;
        if (specifier === DEFINE_ROUTE_MODULE && !element.propertyName) defineRouteImported = true;
        else problems.push(`${where(source, element)}: import defineRoute by that name from '${DEFINE_ROUTE_MODULE}', not '${specifier}'`);
      }
    }
    if (ts.isExportDeclaration(statement)) {
      if (!statement.exportClause || (ts.isNamedExports(statement.exportClause) &&
        statement.exportClause.elements.some((item) => httpMethods.has(item.name.text) || item.name.text === 'maxDuration'))) {
        problems.push(`${where(source, statement)}: re-exported handlers or segment config bypass the checks`);
      }
    }
    if (ts.isFunctionDeclaration(statement) && statement.name) {
      if (statement.name.text === 'defineRoute') problems.push(`${where(source, statement)}: declares its own defineRoute`);
      if (isExported(statement) && httpMethods.has(statement.name.text) && !exempt) problems.push(`${where(source, statement)}: ${statement.name.text} is a plain function, not defineRoute`);
    }
    if (ts.isClassDeclaration(statement) && statement.name?.text === 'defineRoute') problems.push(`${where(source, statement)}: declares its own defineRoute`);
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name)) continue;
        const name = declaration.name.text;
        if (name === 'defineRoute') problems.push(`${where(source, declaration)}: declares its own defineRoute`);
        if (!isExported(statement)) continue;
        if (name === 'maxDuration') {
          if (declaration.initializer && ts.isNumericLiteral(declaration.initializer)) maxDuration = true;
          else problems.push(`${where(source, declaration)}: maxDuration must be a number literal`);
        }
        if (!httpMethods.has(name) || exempt) continue;
        const value = declaration.initializer && unwrap(declaration.initializer);
        if (value && ts.isCallExpression(value) && ts.isIdentifier(value.expression) && value.expression.text === 'defineRoute') handlers++;
        else problems.push(`${where(source, declaration)}: ${name} must be assigned directly from defineRoute(...)`);
      }
    }
  }
  if (handlers > 0 && !defineRouteImported) problems.push(`${fileName}: defineRoute is not imported from '${DEFINE_ROUTE_MODULE}'`);
  if (!exempt && handlers === 0) problems.push(`${fileName}: no exported HTTP handler uses defineRoute`);
  if (!maxDuration) problems.push(`${fileName}: export const maxDuration = <seconds> is missing`);
  return { handlers, problems };
}

/** vercel.json must not override route durations; the route files are the single source. */
export function checkVercelConfig(text: string): string[] {
  const config = JSON.parse(text) as Record<string, unknown>;
  return 'functions' in config ? ['vercel.json declares a functions block; set maxDuration in the route file instead'] : [];
}

// ---------------------------------------------------------------------------
// Documentation paths, links and the ADR index.

export const pathPrefixes = /^(?:src|tests|docs|scripts|public|\.github)\/\S+$/;
export const rootFiles = new Set(['ARCHITECTURE.md', 'GLOSSARY.md', 'README.md', 'THIRD_PARTY_NOTICES.md', 'LICENSE', '.env.example',
  'package.json', 'package-lock.json', 'vercel.json', 'next.config.mjs', 'tsconfig.json', 'vitest.config.mts', '.nvmrc']);

/** Backticked repository paths in a document; placeholders and globs are not concrete paths. */
export function backtickedPaths(text: string): string[] {
  const paths: string[] = [];
  for (const [, token] of Array.from(text.matchAll(/`([^`\n]+)`/g))) {
    if (/[<>{}*?[\]]/.test(token)) continue;
    const clean = token.replace(/:\d+(?:[-–]\d+)?$/, ''); // file.ts:42 points at a line
    if (rootFiles.has(clean) || pathPrefixes.test(clean)) paths.push(clean);
  }
  return paths;
}

/** Relative link targets in a markdown document, without anchors; web, mail and in-page links are skipped. */
export function relativeLinks(text: string): string[] {
  const links: string[] = [];
  for (const [, target] of Array.from(text.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g))) {
    if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(target)) continue;
    links.push(decodeURI(target.split('#')[0]));
  }
  return links;
}

/** Missing backticked paths and broken relative links in one document, resolved from the repository root. */
export function checkDocument(document: string, text: string, root: string, exists: (file: string) => boolean = existsSync): string[] {
  const problems: string[] = [];
  for (const file of backtickedPaths(text)) if (!exists(path.resolve(root, file))) problems.push(`${document}: \`${file}\` does not exist`);
  for (const link of relativeLinks(text)) {
    if (!exists(path.resolve(root, path.dirname(document), link))) problems.push(`${document}: link (${link}) does not resolve`);
  }
  return problems;
}

export const adrFilePattern = /^\d{4}-[a-z0-9-]+\.md$/;
export const adrStatus = /^Status: (Accepted|Proposed|Not adopted|Deprecated|Superseded by ADR \d{4})(?: \([^)]+\))?$/m;

/** The ADR's base status, or a problem when its Status line is missing or not an allowed value. */
export function readAdrStatus(name: string, text: string): { status?: string; problem?: string } {
  const match = text.match(adrStatus);
  if (match) return { status: match[1] };
  const line = text.split('\n').find((item) => item.startsWith('Status:'));
  return { problem: `${name}: ${line ? `"${line}" is not an allowed status` : 'has no Status line'}` };
}

/** The index must list every ADR file once, link only to existing files and agree with each ADR's status. */
export function checkAdrIndex(index: string, adrs: Map<string, string>): string[] {
  const problems: string[] = [];
  const rows = new Map<string, string>();
  for (const [, file, status] of Array.from(index.matchAll(/^\|\s*\[\d{4}\]\((\d{4}-[a-z0-9-]+\.md)\)\s*\|\s*([^|]+?)\s*\|/gm))) {
    if (rows.has(file)) problems.push(`index lists ${file} twice`);
    rows.set(file, status);
  }
  for (const [file, text] of Array.from(adrs)) {
    const { status, problem } = readAdrStatus(file, text);
    if (problem) problems.push(problem);
    if (!rows.has(file)) problems.push(`index does not list ${file}`);
    else if (status && rows.get(file) !== status.replace(/ by ADR \d{4}$/, '')) problems.push(`index says ${rows.get(file)} for ${file}, the ADR says ${status}`);
  }
  for (const file of Array.from(rows.keys())) if (!adrs.has(file)) problems.push(`index lists ${file}, which does not exist`);
  return problems;
}

export function readAdrs(directory: string): Map<string, string> {
  return new Map(readdirSync(directory).filter((name) => adrFilePattern.test(name)).sort()
    .map((name) => [name, readFileSync(path.join(directory, name), 'utf8')] as [string, string]));
}
