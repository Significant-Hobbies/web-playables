import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { element, finishMarkdown, decodeText } from '../../../shared/public-markdown-format.mjs';

const require = createRequire(new URL('../landing-astro/package.json', import.meta.url));
const astroRequire = createRequire(require.resolve('astro/package.json'));

/** The three registered informational pages are pure source components. */
async function reactPage(file) {
  const source = await readFile(new URL('../src/pages/' + file, import.meta.url), 'utf8');
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const statements = tree.statements.filter((statement) => {
    if (!ts.isImportDeclaration(statement)) return true;
    if (statement.moduleSpecifier.text !== 'react-router-dom')
      throw new Error('Unregistered public component import');
    return false;
  });
  const code = statements.map((statement) => statement.getText(tree)).join('\n');
  const compiled = ts.transpileModule(code, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.React,
      jsxFactory: 'h',
    },
  }).outputText;
  const exports = {};
  new Function('h', 'Link', 'exports', compiled)(element, 'a', exports);
  return finishMarkdown(exports.default());
}

function astroExpression(node) {
  if (node.type === 'text') return JSON.stringify(decodeText(node.value));
  if (['comment', 'frontmatter', 'doctype'].includes(node.type)) return 'null';
  if (node.type === 'expression')
    return (
      '(' +
      node.children
        .map((child) => (child.type === 'text' ? child.value : astroExpression(child)))
        .join('') +
      ')'
    );
  if (['svg', 'script', 'style'].includes(node.name)) return 'null';
  const children = (node.children || []).map(astroExpression).join(',');
  if (node.type === 'root' || node.type === 'fragment') return `[${children}]`;
  if (node.type !== 'element') throw new Error(`Unsupported public Astro node: ${node.type}`);
  const props = (node.attributes || [])
    .filter((attribute) =>
      ['href', 'alt', 'src', 'aria-hidden', 'aria-label'].includes(attribute.name)
    )
    .map(
      (attribute) =>
        `${JSON.stringify(attribute.name)}:${attribute.kind === 'expression' ? '(' + attribute.value + ')' : attribute.kind === 'empty' ? 'true' : JSON.stringify(attribute.value)}`
    )
    .join(',');
  return `h(${JSON.stringify(node.name)},{${props}},${children})`;
}

async function astroSection(name) {
  const { parse } = await import(astroRequire.resolve('@astrojs/compiler'));
  const source = await readFile(
    new URL('../landing-astro/src/components/' + name + '.astro', import.meta.url),
    'utf8'
  );
  const { ast } = await parse(source);
  const frontmatter = ast.children.find((node) => node.type === 'frontmatter')?.value || '';
  if (/^\s*(?:import|export)\s/m.test(frontmatter))
    throw new Error('Unregistered public Astro dependency');
  const script = ts.transpileModule(frontmatter, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return finishMarkdown(new Function('h', script + '\nreturn ' + astroExpression(ast))(element));
}

export async function sourceMarkdown() {
  return {
    '/': (await Promise.all(['Hero', 'ValueProp', 'Features', 'Cta'].map(astroSection))).join('\n'),
    '/about': await reactPage('AboutPage.tsx'),
    '/privacy': await reactPage('PrivacyPage.tsx'),
    '/pax-historia-alternative': await reactPage('PaxHistoriaAlternativePage.tsx'),
  };
}
