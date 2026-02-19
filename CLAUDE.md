# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Employee onboarding survey dashboard — reads Excel (.xlsx) files client-side and renders interactive visualizations. No backend, no npm dependencies.

## Build

Source lives in `src/`. Run `just build` (or `uv run build.py`) to produce `dashboard.html` (single-file output). **Do not edit `dashboard.html` directly** — edit files in `src/` and rebuild.

## Architecture

```
src/
  template.html             # HTML skeleton with BUILD:INLINE placeholders
  styles.css                # All CSS
  js/
    utils.js                # esc(), showLoading/hideLoading, state vars
    file-handling.js        # Drag-drop, FileReader, sheet navigation
    data-processing.js      # loadSheet, classifyColumns, detectType, cleanHeader
    kpis.js                 # buildKPIs — KPI strip calculations and rendering
    cards.js                # buildRatingCard, buildYnCard, comments, trends
    rendering.js            # renderDashboard orchestration, sort/scroll helpers
    table.js                # buildTable, sortTable, renderTableBody, toggleTable
build.py                    # Inlines src/ files → dashboard.html (stdlib only)
justfile                    # `just build` command runner
```

**`dashboard.html`** — Generated single-file HTML/CSS/JS dashboard. CDN dependencies:
- **SheetJS (xlsx)** — Parses Excel files in the browser via drag-and-drop/file picker
- **Chart.js** — Renders bar charts (rating distributions) and doughnut charts (yes/no splits)
- **Google Fonts** — DM Serif Display + IBM Plex Sans

**`Week 3.xlsx`** — Source data with employee onboarding survey responses across multiple sheets (Day 1, Week 1, Week 3, Week 4). Each sheet has a different question set.

## How the Dashboard Works

1. User uploads one or more .xlsx files → SheetJS parses them → upload summary appears with week numbers
2. `classifyColumns()` auto-detects column types from headers and data values:
   - `name`, `client`, `coach`, `date` — metadata columns
   - `rating` — 1-5 scale questions → horizontal bar charts
   - `yesno` — Yes/No questions → doughnut charts
   - `text` — free-text (skipped in charts)
3. "If the answer..." and "Actions taken..." columns are linked to their preceding question via `reasonIndex`/`actionIndex` and shown as expandable comments per card
4. KPI strip, card grid, and data table are built dynamically

## Key Conventions

- All data is read dynamically from Excel — never hardcode survey data
- Warm color palette: terracotta (#C4654A), deep-green (#2D6A4F), amber (#D4A035) defined as CSS variables
- Problem thresholds: rating avg < 4 or Yes% < 80% triggers warning indicators
- Use `uv` for any Python tooling needs (Python is not installed system-wide)
