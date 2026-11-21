# This creates a context file for vibes...
import os
from pathlib import Path

ROOT = Path(".")
OUTPUT = ROOT / "project_context.txt"

# Directories and files to exclude
EXCLUDED_DIRS = {
    "node_modules",
    ".git",
    ".venv",
    "venv",
    "__pycache__",
    "dist",
    "build",
    ".next",
    ".pytest_cache",
    ".idea",
    ".vscode"
}

EXCLUDED_FILES = {
    ".env",
    ".env.local",
    ".env.production",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "project_context.txt",
    "export_project.py"
}

# File types worth sharing with an AI agent
INCLUDED_EXTENSIONS = {
    ".py", ".tsx", ".ts", ".jsx", ".js",
    ".css", ".html", ".json", ".md",
    ".yml", ".yaml", ".toml", ".sql",
    ".sh", ".txt"
}

def should_include(path):
    if path.name in EXCLUDED_FILES:
        return False

    if path.suffix not in INCLUDED_EXTENSIONS:
        return False

    return True


with open(OUTPUT, "w", encoding="utf-8") as out:

    # PROJECT TREE
    out.write("=" * 60 + "\n")
    out.write("PROJECT DIRECTORY TREE\n")
    out.write("=" * 60 + "\n\n")

    for current, dirs, files in os.walk(ROOT):
        dirs[:] = sorted(
            d for d in dirs if d not in EXCLUDED_DIRS
        )

        current_path = Path(current)
        depth = len(current_path.parts) - len(ROOT.parts)

        indent = "    " * depth
        out.write(f"{indent}{current_path.name or '.'}/\n")

        for filename in sorted(files):
            path = current_path / filename

            if should_include(path):
                out.write(
                    f"{indent}    {filename}\n"
                )

    # FILE CONTENTS
    out.write("\n\n" + "=" * 60 + "\n")
    out.write("PROJECT FILE CONTENTS\n")
    out.write("=" * 60 + "\n")

    for current, dirs, files in os.walk(ROOT):
        dirs[:] = sorted(
            d for d in dirs if d not in EXCLUDED_DIRS
        )

        for filename in sorted(files):
            path = Path(current) / filename

            if not should_include(path):
                continue

            out.write("\n\n" + "=" * 60 + "\n")
            out.write(f"FILE: {path.as_posix()}\n")
            out.write("=" * 60 + "\n\n")

            try:
                content = path.read_text(encoding="utf-8")
                out.write(content)
            except (UnicodeDecodeError, OSError):
                out.write("[Could not read file]")

            out.write("\n")

print(f"Project exported successfully: {OUTPUT}")
