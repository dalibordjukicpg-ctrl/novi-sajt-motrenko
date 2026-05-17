/** Parsiranje jednostavnih phpMyAdmin INSERT izvršenja (stringovi u jednostrukim navodnicima). */

export const SQL_NULL = "__SQL_NULL__";

export function extractInsertTuples(sql: string, tableName: string): string[][] {
  const rows: string[][] = [];
  const needle = `INSERT INTO \`${tableName}\``;
  let pos = 0;

  while (pos < sql.length) {
    const i = sql.indexOf(needle, pos);
    if (i === -1) break;

    const valuesIdx = sql.indexOf("VALUES", i);
    if (valuesIdx === -1) {
      pos = i + needle.length;
      continue;
    }

    let j = valuesIdx + 6;
    while (j < sql.length && /\s/.test(sql[j]!)) j++;

    while (j < sql.length) {
      while (j < sql.length && /\s/.test(sql[j]!)) j++;
      if (sql[j] === ";") break;

      if (sql[j] !== "(") break;

      const { tuple, next } = parseTuple(sql, j);
      rows.push(tuple);
      j = next;

      while (j < sql.length && /\s/.test(sql[j]!)) j++;
      if (sql[j] === ",") {
        j++;
        continue;
      }
      if (sql[j] === ";") break;
    }

    pos = j;
  }

  return rows;
}

function parseTuple(
  sql: string,
  startParen: number,
): { tuple: string[]; next: number } {
  let i = startParen + 1;
  const tuple: string[] = [];

  while (true) {
    const v = parseValue(sql, i);
    tuple.push(v.val);
    i = v.next;
    while (i < sql.length && /\s/.test(sql[i]!)) i++;
    if (sql[i] === ",") {
      i++;
      continue;
    }
    if (sql[i] === ")") {
      i++;
      break;
    }
    throw new Error(`Neočekivano u tuple na poziciji ${i}`);
  }

  return { tuple, next: i };
}

function parseValue(sql: string, i: number): { val: string; next: number } {
  while (i < sql.length && /\s/.test(sql[i]!)) i++;

  if (sql.slice(i, i + 4) === "NULL") {
    const next = sql[i + 4];
    if (!next || /[\s,);]/.test(next)) {
      return { val: SQL_NULL, next: i + 4 };
    }
  }

  if (sql[i] === "'") {
    i++;
    let out = "";
    while (i < sql.length) {
      const c = sql[i]!;
      if (c === "'" && sql[i + 1] === "'") {
        out += "'";
        i += 2;
        continue;
      }
      if (c === "'") {
        return { val: out, next: i + 1 };
      }
      if (c === "\\" && i + 1 < sql.length) {
        out += sql[i + 1]!;
        i += 2;
        continue;
      }
      out += c;
      i++;
    }
    throw new Error("Nezatvoren string u SQL");
  }

  const start = i;
  while (i < sql.length && sql[i] !== "," && sql[i] !== ")") {
    i++;
  }
  return { val: sql.slice(start, i).trim(), next: i };
}
