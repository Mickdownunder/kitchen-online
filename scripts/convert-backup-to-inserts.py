#!/usr/bin/env python3
"""
Converts pg_dump COPY blocks to INSERT statements for Supabase SQL Editor.
Usage: python convert-backup-to-inserts.py backup.sql > backup_inserts.sql
"""

import re
import sys

def unescape_copy_field(field: str) -> str:
    r"""Unescape PostgreSQL COPY format: \\ -> \, \n -> newline, \t -> tab."""
    if not field or field == "\\N":
        return field
    result = []
    i = 0
    while i < len(field):
        if field[i] == "\\" and i + 1 < len(field):
            n = field[i + 1]
            if n == "\\":
                result.append("\\")
            elif n == "n":
                result.append("\n")
            elif n == "t":
                result.append("\t")
            elif n == "r":
                result.append("\r")
            else:
                result.append(field[i])
                result.append(n)
            i += 2
        else:
            result.append(field[i])
            i += 1
    return "".join(result)


def escape_sql(val: str) -> str:
    """Escape a value for SQL string literal."""
    if val is None:
        return "NULL"
    s = unescape_copy_field(str(val))
    # Escape single quotes for PostgreSQL
    s = s.replace("'", "''")
    return f"'{s}'"

def parse_copy_line(line: str):
    """Parse 'COPY public.table (col1, col2) FROM stdin;' -> (table, [col1, col2])"""
    match = re.match(r'COPY public\.(\w+)\s*\(([^)]+)\)\s+FROM stdin;', line.strip())
    if not match:
        return None, None
    table = match.group(1)
    # Preserve quoted column names like "time"
    cols = [c.strip().strip('"') for c in match.group(2).split(",")]
    return table, cols

def main():
    input_file = sys.argv[1] if len(sys.argv) > 1 else "backup.sql"
    
    with open(input_file, "r", encoding="utf-8", errors="replace") as f:
        lines = f.readlines()
    
    output = []
    i = 0
    
    while i < len(lines):
        line = lines[i]
        
        # Skip psql meta-commands and the problematic \restrict line
        if line.strip().startswith("\\") and not line.strip() == "\\. ":
            # Check if it's a COPY terminator - we'll handle that in the COPY block
            if line.strip() == "\\.":
                i += 1
                continue
            i += 1
            continue
        
        # Check for COPY block
        table, cols = parse_copy_line(line)
        if table and cols:
            # Collect data rows until \.
            rows = []
            i += 1
            while i < len(lines):
                data_line = lines[i]
                if data_line.strip() == "\\.":
                    i += 1
                    break
                if data_line.strip():
                    # Tab-separated values, \N = NULL
                    fields = data_line.rstrip("\n").split("\t")
                    row_values = []
                    for j, field in enumerate(fields):
                        if j < len(cols):
                            if field == "\\N":
                                row_values.append("NULL")
                            else:
                                row_values.append(escape_sql(field))
                    if len(row_values) == len(cols):
                        col_list = ", ".join(f'"{c}"' for c in cols)
                        val_list = ", ".join(row_values)
                        output.append(f"INSERT INTO public.{table} ({col_list}) VALUES ({val_list});")
                i += 1
            output.append("")
            continue
        
        # Regular line - keep it (schema, SET, etc.) but skip \. lines
        if line.strip() != "\\.":
            output.append(line.rstrip("\n"))
        i += 1
    
    for line in output:
        print(line)

if __name__ == "__main__":
    main()
