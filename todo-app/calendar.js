// ── ICS helpers ───────────────────────────────────────────────

function pad(n) { return String(n).padStart(2, '0'); }

function toIcsDate(dateStr) {
  // dateStr: 'YYYY-MM-DD' → '20260522'
  return dateStr.replace(/-/g, '');
}

function toIcsDatetime(iso) {
  // iso → '20260522T090000Z'
  const d = new Date(iso);
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function nextDay(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function escIcs(str) {
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function buildVevent(todo) {
  const now = toIcsDatetime(new Date().toISOString());
  const uid = `todo-${todo.id}-${Date.now()}@dailytodo`;
  const lines = [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `SUMMARY:${escIcs(todo.text)}`,
    `STATUS:${todo.completedAt ? 'COMPLETED' : 'CONFIRMED'}`,
  ];

  if (todo.dueDate) {
    lines.push(`DTSTART;VALUE=DATE:${toIcsDate(todo.dueDate)}`);
    lines.push(`DTEND;VALUE=DATE:${toIcsDate(nextDay(todo.dueDate))}`);
  } else {
    const today = new Date().toISOString().slice(0, 10);
    lines.push(`DTSTART;VALUE=DATE:${toIcsDate(today)}`);
    lines.push(`DTEND;VALUE=DATE:${toIcsDate(nextDay(today))}`);
  }

  if (todo.completedAt) {
    lines.push(`COMPLETED:${toIcsDatetime(todo.completedAt)}`);
  }

  lines.push('END:VEVENT');
  return lines.join('\r\n');
}

function buildIcs(todos) {
  const vevents = todos.map(buildVevent).join('\r\n');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Daily Todo//Daily Todo App//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    vevents,
    'END:VCALENDAR',
  ].join('\r\n');
}

export function exportSingleIcs(todo) {
  downloadIcs(buildIcs([todo]), `todo-${todo.id}.ics`);
}

export function exportAllIcs(todos) {
  downloadIcs(buildIcs(todos), 'daily-todo-all.ics');
}

function downloadIcs(content, filename) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── ICS parser (import) ───────────────────────────────────────

function parseIcsDate(str) {
  // handles: 20260522 or 20260522T090000Z or 20260522T090000
  str = str.trim();
  if (str.length === 8) {
    return `${str.slice(0,4)}-${str.slice(4,6)}-${str.slice(6,8)}`;
  }
  const y = str.slice(0,4), mo = str.slice(4,6), d = str.slice(6,8);
  return `${y}-${mo}-${d}`;
}

export function parseIcs(text) {
  const todos = [];
  const events = text.split('BEGIN:VEVENT').slice(1);

  for (const block of events) {
    const get = key => {
      const re = new RegExp(`^${key}[;:][^\r\n]*`, 'mi');
      const m = block.match(re);
      if (!m) return '';
      return m[0].replace(/^[^:]+:/, '').trim()
        .replace(/\\n/g, '\n').replace(/\\,/g, ',')
        .replace(/\\;/g, ';').replace(/\\\\/g, '\\');
    };

    const summary = get('SUMMARY');
    if (!summary) continue;

    const dtstart = get('DTSTART');
    const dueDate = dtstart ? parseIcsDate(dtstart.replace(/;VALUE=DATE/i, '')) : null;
    const status = get('STATUS').toUpperCase();

    todos.push({
      text: summary,
      dueDate: dueDate || new Date().toISOString().slice(0, 10),
      completed: status === 'COMPLETED',
    });
  }

  return todos;
}
