# Icons Folder

This app now uses asset-based icons loaded by `IconDirective` (`appIcon`).

Note: The build uses the `public/` folder for static assets. Place icons in `public/icons/`, not here.

Source path (local to copy from):
/Users/ramu/Documents/cinchdocspoc-adinovis_ntr-1e8c3f66b5b9/Adinivois_UI/src/assets

Supported icon names (use either `name.svg` or `name.png`):

- pdf, doc, docx, xls, xlsx, ppt, pptx, txt
- jpg, jpeg, png, gif, webp, svg
- mp4, avi, mov, mp3, wav
- zip, rar
- js, jsx, ts, tsx, json, html, css, scss, sass
- md, markdown
- file (fallback for unknown types)

Examples (actual path used at runtime):

- public/icons/pdf.svg
- public/icons/docx.svg
- public/icons/file.svg (fallback generic file icon)

Tip: Prefer SVG where possible for crisp rendering and themeability.
