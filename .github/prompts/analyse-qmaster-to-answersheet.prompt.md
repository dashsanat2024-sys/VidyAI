---
title: Analyse Question Master → Answer Sheet (Remove Box, Keep Bubbles)
description: >
  Automate the process of generating answer sheets from Question Master data by removing boxes from objective question answers and keeping only the bubbles. After making these changes, run the application locally to verify.
inputs:
  - source: The Question Master data or file
  - output_format: Desired answer sheet format (PDF, HTML, etc.)
  - preview: (optional) If true, show a preview before saving
output:
  - Modified answer sheet with only bubbles for objective questions (no boxes)
  - Confirmation that the app runs locally after changes
steps:
  - Analyse the Question Master data for objective questions
  - Remove any box elements from the answer sheet generation logic
  - Ensure only bubbles are rendered for objective answers
  - Regenerate the answer sheet in the specified format
  - Run the application locally and verify the output
examples:
  - "Generate answer sheet from QMaster.xlsx, PDF output, preview enabled"
  - "Update answer sheet logic to remove boxes for MCQs, keep only bubbles, then run app"
---

# Analyse Question Master → Answer Sheet (Remove Box, Keep Bubbles)

Automate answer sheet generation by:
- Removing boxes from objective question answers
- Keeping only bubbles for marking answers
- Verifying changes by running the app locally

## Usage
- Provide the Question Master data/file and desired output format
- Optionally enable preview
- The prompt will update answer sheet logic and verify by running the app

## Example Invocations
- Generate answer sheet from QMaster.xlsx, PDF output, preview enabled
- Update answer sheet logic to remove boxes for MCQs, keep only bubbles, then run app

## Related Customizations
- Add support for custom bubble shapes
- Enable answer key overlay
- Export to additional formats (CSV, DOCX)
