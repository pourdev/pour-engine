// WCAG SC 1.3.1 Info and Relationships (Level A)
// WCAG 1.3.1: data tables must expose their header/data relationships in
// markup. Two failure modes, reported per TABLE (one fix point), not per
// cell:
//   - a clear data table with no header cells at all (no th, scope, headers)
//   - headers="" attributes referencing ids that aren't cells of this table
// Layout tables are skipped via a conservative heuristic (role=presentation,
// or too small/text-sparse to be a data grid) — a missed layout table is
// better than false positives on real pages.
//
// Block-level content inside cells (headings, paragraphs, lists, forms,
// navigation) is the other layout signature: tabular data is inline text,
// and a page scaffold built as a table (site name / nav / sidebar / article
// / footer) meets the 2 x 2 x 4-text-cells heuristic while conveying no
// header relationship at all. H51 and F91 are scoped to "tabular
// information"; the DOM cannot prove such a table is data, so it asks
// rather than asserts (2026-08-25 overnight audit).
const BLOCK_CONTENT = 'h1, h2, h3, h4, h5, h6, p, ul, ol, dl, menu, form, nav, main, header, footer, '
  + 'section, article, aside, blockquote, figure, fieldset, pre, hr, table';

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
    // The table's OWN rows and cells (table.rows / row.cells stop at the
    // table's boundary): a header cell inside a nested table belongs to that
    // table, so it neither satisfies the outer table nor lifts it out of the
    // nested-layout demotion (2026-08-25 overnight audit; a deep
    // querySelector('th') did both).
    const rows = [...element.rows];
    const cells = rows.flatMap((row) => [...row.cells]);
    // Data-grid heuristic: at least a 2×2 grid with mostly-text cells.
    const isGrid = rows.length >= 2 && Math.max(0, ...rows.map((row) => row.cells.length)) >= 2;
    const textCells = cells.filter((cell) => cell.textContent.trim()).length;
    if (!isGrid || textCells < 4) return { status: 'pass' }; // likely layout or trivial
    // A header cell is a <th>, or a <td> given the columnheader/rowheader
    // role: ARIA in HTML permits any role on a td of a role-less table, and
    // the header roles are the header semantics ARIA defines (Chromium
    // exposes td[role=columnheader] as columnheader). 1.3.1 asks that the
    // relationship be programmatically determinable, which the role
    // satisfies (2026-08-25 overnight audit).
    const cellRole = (cell) => cell.getAttribute('role')?.trim().split(/\s+/)[0]?.toLowerCase();
    const isHeaderCell = (cell) => cell.tagName === 'TH' || ['columnheader', 'rowheader'].includes(cellRole(cell));
    const hasHeaderCell = cells.some(isHeaderCell);
    // Nested tables are the signature of legacy LAYOUT markup, not data —
    // asserting "missing headers" there flags email-style scaffolding. A
    // human can tell in a glance; the machine can't. The signature reads in
    // both directions: a table INSIDE another table (Hacker News's story
    // list inside its page-scaffold table) is the same legacy layout.
    if (!hasHeaderCell && (element.querySelector('table') || element.parentElement?.closest('table'))) {
      return {
        status: 'incomplete',
        message: 'This table has no header cells and is part of a nested-table structure — a layout-table signature. If it really presents data, mark its header cells with <th>; if it is layout scaffolding, add role="presentation".',
      };
    }

    const badRefs = cells.filter((cell) => {
      const headers = cell.getAttribute('headers');
      return headers && headers.trim().split(/\s+/).filter(Boolean).some((id) => {
        const target = element.getRootNode().getElementById?.(id);
        return !target || !cells.includes(target) || !(/^T[HD]$/.test(target.tagName) || isHeaderCell(target));
      });
    });
    if (badRefs.length) {
      return {
        status: 'fail',
        message: `${badRefs.length} cell(s) have headers="…" referencing ids that are not header cells of this table — screen readers cannot relate the data to its headers.`,
        fix: 'Make each headers attribute list the id(s) of <th> cells in the same table.',
      };
    }

    const hasHeaders = hasHeaderCell || cells.some((cell) => cell.hasAttribute('scope') || cell.hasAttribute('headers'));
    if (!hasHeaders) {
      if (cells.some((cell) => cell.querySelector(BLOCK_CONTENT))) {
        return {
          status: 'incomplete',
          message: 'This table has no header cells and its cells hold block content (headings, paragraphs, lists or forms), which is a layout-table signature. If it really presents data, mark its header cells with <th>; if it is layout scaffolding, add role="presentation".',
        };
      }
      // A two-column table is a list of label-and-value pairs; its first
      // column is the row headers, and that is the whole fix (gov.uk
      // inheritance tax guidance, 2026-09-01: five such tables, all td).
      const twoColumns = Math.max(0, ...rows.map((row) => row.cells.length)) === 2;
      return {
        status: 'fail',
        message: 'This looks like a data table but has no header cells — screen reader users get the data with no way to tell what each row/column means.',
        fix: twoColumns
          ? 'Mark the first cell of each row as <th scope="row">: in a two-column table the first column names what the second holds.'
          : 'Mark header cells with <th> (add scope="col" or scope="row" when the table has both).',
      };
    }
    return { status: 'pass' };
  },
};
