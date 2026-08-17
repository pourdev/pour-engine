export default {
  id: 'accesskeys',
  name: 'Duplicate access keys',
  impact: 'serious',
  tags: ['best-practice'],
  help: 'The same accesskey must not be assigned twice',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/character-key-shortcuts.html',
  selector: '[accesskey]',
  visibleOnly: false,
  // Judged as a set: duplicates are the problem.
  evaluateAll(elements) {
    const byKey = {};
    elements.forEach((element, index) => {
      const key = element.getAttribute('accesskey').trim().toLowerCase();
      (byKey[key] ??= []).push(index);
    });
    const outcomes = elements.map(() => ({ status: 'pass' }));
    for (const [key, indexes] of Object.entries(byKey)) {
      if (indexes.length < 2) continue;
      for (const index of indexes) {
        outcomes[index] = {
          status: 'fail',
          message: `accesskey="${key}" is used ${indexes.length} times — the browser can only honour one, so the others silently do nothing.`,
          fix: 'Give each accesskey a unique value, or remove them (they conflict with AT shortcuts anyway).',
        };
      }
    }
    return outcomes;
  },
};
