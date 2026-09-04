#!/usr/bin/env python3
"""claudemem - persistent project memory stored in the repo.

Entries live in .claude/memory/entries.jsonl (one JSON object per line) so they
are versioned with the code and survive ephemeral Claude Code sessions.
"""

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone

TYPES = ["decision", "fact", "gotcha", "todo", "preference"]


def repo_root():
    try:
        out = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True, text=True, check=True,
        )
        return out.stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))


def store_path():
    return os.environ.get(
        "CLAUDEMEM_STORE", os.path.join(repo_root(), ".claude", "memory", "entries.jsonl")
    )


def load():
    path = store_path()
    if not os.path.exists(path):
        return []
    entries = []
    with open(path, encoding="utf-8") as fh:
        for lineno, line in enumerate(fh, 1):
            line = line.strip()
            if not line:
                continue
            try:
                entries.append(json.loads(line))
            except json.JSONDecodeError:
                print(f"warning: skipping malformed line {lineno}", file=sys.stderr)
    return entries


def save_all(entries):
    path = store_path()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        for entry in entries:
            fh.write(json.dumps(entry, ensure_ascii=False) + "\n")
    os.replace(tmp, path)


def next_id(entries, today):
    prefix = f"m-{today}-"
    used = [int(e["id"].rsplit("-", 1)[1]) for e in entries
            if e.get("id", "").startswith(prefix) and e["id"].rsplit("-", 1)[1].isdigit()]
    return f"{prefix}{max(used, default=0) + 1:03d}"


def fmt(entry, width=0):
    tags = " ".join(f"#{t}" for t in entry.get("tags", []))
    head = f"{entry['id']}  [{entry.get('type', 'fact')}]  {entry.get('ts', '')[:10]}"
    if tags:
        head += f"  {tags}"
    text = entry.get("text", "")
    if width and len(text) > width:
        text = text[: width - 1] + "…"
    return f"{head}\n    {text}"


def cmd_add(args):
    entries = load()
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    entry = {
        "id": next_id(entries, today),
        "ts": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "type": args.type,
        "tags": [t.strip() for t in (args.tags or "").split(",") if t.strip()],
        "text": " ".join(args.text).strip(),
    }
    if not entry["text"]:
        sys.exit("error: refusing to store an empty memory")
    if any(e.get("text", "").strip().lower() == entry["text"].lower() for e in entries):
        print("duplicate: an identical memory already exists, nothing written")
        return
    entries.append(entry)
    save_all(entries)
    print(f"stored {entry['id']}")


def cmd_recent(args):
    entries = load()[-args.n:]
    if not entries:
        print("no memories yet")
        return
    for entry in entries:
        print(fmt(entry, args.width))


def cmd_search(args):
    terms = [t.lower() for t in args.query if t.strip()]
    scored = []
    for entry in load():
        haystack = " ".join(
            [entry.get("text", ""), entry.get("type", ""), " ".join(entry.get("tags", []))]
        ).lower()
        score = sum(len(re.findall(re.escape(t), haystack)) for t in terms)
        if score:
            scored.append((score, entry))
    if not scored:
        print("no matches")
        return
    scored.sort(key=lambda pair: (-pair[0], pair[1].get("ts", "")))
    for _, entry in scored[: args.n]:
        print(fmt(entry, args.width))


def cmd_list(args):
    entries = [e for e in load() if not args.type or e.get("type") == args.type]
    if args.tag:
        entries = [e for e in entries if args.tag in e.get("tags", [])]
    if not entries:
        print("no matching memories")
        return
    for entry in entries:
        print(fmt(entry, args.width))


def cmd_forget(args):
    entries = load()
    kept = [e for e in entries if e.get("id") != args.id]
    if len(kept) == len(entries):
        sys.exit(f"error: no memory with id {args.id}")
    save_all(kept)
    print(f"forgot {args.id}")


def cmd_stats(_args):
    entries = load()
    print(f"{len(entries)} memories in {store_path()}")
    counts = {}
    for entry in entries:
        counts[entry.get("type", "fact")] = counts.get(entry.get("type", "fact"), 0) + 1
    for kind, count in sorted(counts.items(), key=lambda pair: -pair[1]):
        print(f"  {kind:<11} {count}")
    if entries:
        print(f"  oldest      {entries[0].get('ts', '')[:10]}")
        print(f"  newest      {entries[-1].get('ts', '')[:10]}")


def main():
    parser = argparse.ArgumentParser(prog="mem.py", description=__doc__)
    sub = parser.add_subparsers(dest="cmd", required=True)

    width = argparse.ArgumentParser(add_help=False)
    width.add_argument("--width", type=int, default=0, help="truncate memory text to N chars")

    p_add = sub.add_parser("add", help="store a memory")
    p_add.add_argument("text", nargs="+")
    p_add.add_argument("--type", choices=TYPES, default="fact")
    p_add.add_argument("--tags", help="comma-separated tags")
    p_add.set_defaults(func=cmd_add)

    p_recent = sub.add_parser("recent", help="show the newest memories", parents=[width])
    p_recent.add_argument("-n", type=int, default=10)
    p_recent.set_defaults(func=cmd_recent)

    p_search = sub.add_parser("search", help="keyword search across memories", parents=[width])
    p_search.add_argument("query", nargs="+")
    p_search.add_argument("-n", type=int, default=10)
    p_search.set_defaults(func=cmd_search)

    p_list = sub.add_parser("list", help="list memories, optionally filtered", parents=[width])
    p_list.add_argument("--type", choices=TYPES)
    p_list.add_argument("--tag")
    p_list.set_defaults(func=cmd_list)

    p_forget = sub.add_parser("forget", help="delete one memory by id")
    p_forget.add_argument("id")
    p_forget.set_defaults(func=cmd_forget)

    sub.add_parser("stats", help="summarize the store").set_defaults(func=cmd_stats)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
