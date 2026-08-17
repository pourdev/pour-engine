// WCAG SC 1.3.1 Info and Relationships (Level A)
// WCAG 1.3.1: data tables must expose their header/data relationships in
// markup. Two failure modes, reported per TABLE (one fix point), not per
// cell:
//   - a clear data table with no header cells at all (no th, scope, headers)
//   - headers="" attributes referencing ids that aren't cells of this table
// Layout tables are skipped via a conservative heuristic (role=presentation,
// or too small/text-sparse to be a data grid) — a missed layout table is
// better than false positives on real pages.
export default {
  id: 'table-headers',
  name: 'Table header associations',
  impact: 'serious',
  tags: ['wcag2a', 'wcag131'],
  help: 'Data tables must have properly associated header cells',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html',
  selector: 'table',
  evaluate(element) {
    const role = element.getAttribute('role');
    if (role && !['table', 'grid'].includes(role)) return { status: 'pass' }; // presentation/none/other widget
    const rows = [...element.rows];
    const cells = rows.flatMap((row) => [...row.cells]);
    // Data-grid heuristic: at least a 2×2 grid with mostly-text cells.
    const isGrid = rows.length >= 2 && Math.max(0, ...rows.map((row) => row.cells.length)) >= 2;
    const textCells = cells.filter((cell) => cell.textContent.trim()).length;
    if (!isGrid || textCells < 4) return { status: 'pass' }; // likely layout or trivial
    // Nested tables are the signature of legacy LAYOUT markup, not data —
    // asserting "missing headers" there flags email-style scaffolding. A
    // human can tell in a glance; the machine can't.
    if (!element.querySelector('th') && element.querySelector('table')) {
      return {
        status: 'incomplete',
        message: 'This table has no header cells but contains nested tables — a layout-table signature. If it really presents data, mark its header cells with <th>; if it is layout scaffolding, add role="presentation".',
      };
    }

    const badRefs = cells.filter((cell) => {
      const headers = cell.getAttribute('headers');
      return headers && headers.trim().split(/\s+/).filter(Boolean).some((id) => {
        const target = element.getRootNode().getElementById?.(id);
        return !target || !element.contains(target) || !/^T[HD]$/.test(target.tagName);
      });
    });
    if (badRefs.length) {
      return {
        status: 'fail',
        message: `${badRefs.length} cell(s) have headers="…" referencing ids that are not header cells of this table — screen readers cannot relate the data to its headers.`,
        fix: 'Make each headers attribute list the id(s) of <th> cells in the same table.',
      };
    }

    const hasHeaders = element.querySelector('th, [scope], td[headers]');
    if (!hasHeaders) {
      return {
        status: 'fail',
        message: 'This looks like a data table but has no header cells — screen reader users get the data with no way to tell what each row/column means.',
        fix: 'Mark header cells with <th> (add scope="col" or scope="row" when the table has both).',
      };
    }
    return { status: 'pass' };
  },
};
