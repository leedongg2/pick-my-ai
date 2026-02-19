let katexLib: typeof import('katex') | null = null;

function getKatex() {
  if (typeof window === 'undefined') return null;
  if (katexLib) return katexLib;
  try {
    katexLib = require('katex');
    return katexLib;
  } catch {
    return null;
  }
}

export function renderLatex(latex: string): string {
  const katex = getKatex();
  if (!katex) return latex;
  try {
    return katex.renderToString(latex, {
      throwOnError: false,
      displayMode: false,
    });
  } catch {
    return latex;
  }
}

export function renderLatexBlock(latex: string): string {
  const katex = getKatex();
  if (!katex) return latex;
  try {
    return katex.renderToString(latex, {
      throwOnError: false,
      displayMode: true,
    });
  } catch {
    return latex;
  }
}
