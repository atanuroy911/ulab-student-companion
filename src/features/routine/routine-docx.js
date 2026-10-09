// features/routine/routine-docx.js — dependency-free .docx writer for the
// student class routine.
//
// PORTED from ulab-faculty-companion's features/class-schedule/export-docx.js
// (the minimal ZIP writer, the OOXML part scaffolding, the cell/table
// helpers and the image-embedding trick), with the faculty-only
// buildConsultationDocx() dropped entirely — no consultation/counselling
// hours exist in the student version. What survives is one exporter,
// buildRoutineDocx(), which merges the two faculty exporters' good halves:
// the weekly Time x Day grid from buildScheduleDocx() plus the photo
// letterhead from buildConsultationDocx().
//
// Why hand-rolled instead of a library: MV3 forbids remote script
// execution, and a .docx is just a ZIP of XML parts. The ZIP spec allows
// "stored" (uncompressed) entries, so no deflate implementation is needed
// either. Nothing is vendored for this file.
(function () {
    // ── Minimal ZIP (stored, no compression) ────────────────────────────
    let crcTable = null;
    function crc32(bytes) {
        if (!crcTable) {
            crcTable = new Uint32Array(256);
            for (let n = 0; n < 256; n++) {
                let c = n;
                for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
                crcTable[n] = c >>> 0;
            }
        }
        let crc = 0xFFFFFFFF;
        for (let i = 0; i < bytes.length; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[i]) & 0xFF];
        return (crc ^ 0xFFFFFFFF) >>> 0;
    }

    function u16(n) { return [n & 0xFF, (n >> 8) & 0xFF]; }
    function u32(n) { return [n & 0xFF, (n >> 8) & 0xFF, (n >> 16) & 0xFF, (n >> 24) & 0xFF]; }

    // files: [{ name: 'word/document.xml', data: Uint8Array }]
    function buildZipBlob(files) {
        const encoder = new TextEncoder();
        const parts = [];
        const centralParts = [];
        let offset = 0;

        for (const f of files) {
            const nameBytes = encoder.encode(f.name);
            const data = f.data;
            const crc = crc32(data);
            const localHeader = new Uint8Array([
                ...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
                ...u32(crc), ...u32(data.length), ...u32(data.length),
                ...u16(nameBytes.length), ...u16(0),
            ]);
            parts.push(localHeader, nameBytes, data);

            const centralHeader = new Uint8Array([
                ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
                ...u32(crc), ...u32(data.length), ...u32(data.length),
                ...u16(nameBytes.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
                ...u32(0), ...u32(offset),
            ]);
            centralParts.push(centralHeader, nameBytes);

            offset += localHeader.length + nameBytes.length + data.length;
        }

        const centralStart = offset;
        const centralSize = centralParts.reduce((sum, p) => sum + p.length, 0);
        const eocd = new Uint8Array([
            ...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length),
            ...u32(centralSize), ...u32(centralStart), ...u16(0),
        ]);

        return new Blob([...parts, ...centralParts, eocd], {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });
    }

    function xmlEscape(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
    }

    function toFile(name, xml) {
        return { name, data: new TextEncoder().encode(xml) };
    }

    const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

    const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

    const DOC_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;

    // Word's palette here is fixed ink-on-paper, NOT the extension's theme:
    // a printed routine has no dark mode, and --bento-* custom properties
    // do not exist inside a .docx. These are document colours, not UI
    // colours, so the "no hardcoded hex" rule (which governs the extension
    // stylesheet) does not apply to them.
    const ACCENT = '0D9488';        // teal rule / name — matches the brand
    const ACCENT_LIGHT = 'D7F2EF';  // table header fill
    const TIME_FILL = 'F2F2F2';     // time column fill

    function shd(hex) { return `<w:shd w:val="clear" w:color="auto" w:fill="${hex}"/>`; }
    function withFill(cellStr, hex) { return cellStr.replace('</w:tcPr>', `${shd(hex)}</w:tcPr>`); }

    // Runs a plain text block into one or more <w:r> with <w:br/> between
    // lines, so a cell holding two classes shows each on its own line.
    function runsForLines(lines, bold) {
        return lines.map((line, i) => {
            const br = i > 0 ? '<w:br/>' : '';
            const rPr = bold ? '<w:rPr><w:b/></w:rPr>' : '';
            return `<w:r>${rPr}${br}<w:t xml:space="preserve">${xmlEscape(line)}</w:t></w:r>`;
        }).join('');
    }

    function cellXml(lines, { bold = false, widthTwips = 2000, center = false, gridSpan = null, vMerge = null } = {}) {
        const jc = center ? '<w:jc w:val="center"/>' : '';
        const content = lines.length
            ? `<w:p>${jc ? `<w:pPr>${jc}</w:pPr>` : ''}${runsForLines(lines, bold)}</w:p>`
            : '<w:p/>';
        const spanTag = gridSpan ? `<w:gridSpan w:val="${gridSpan}"/>` : '';
        const mergeTag = vMerge === 'restart' ? '<w:vMerge w:val="restart"/>' : vMerge === 'continue' ? '<w:vMerge/>' : '';
        return `<w:tc><w:tcPr><w:tcW w:w="${widthTwips}" w:type="dxa"/>${spanTag}${mergeTag}</w:tcPr>${content}</w:tc>`;
    }

    // Decodes a "data:image/png;base64,...." URL into raw bytes + the file
    // extension Word expects, or null if it isn't a data URL we recognise.
    function decodeDataUrl(dataUrl) {
        const m = /^data:image\/(png|jpe?g|gif|bmp);base64,(.+)$/i.exec(dataUrl || '');
        if (!m) return null;
        const ext = m[1].toLowerCase() === 'jpg' ? 'jpeg' : m[1].toLowerCase();
        const binary = atob(m[2]);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return { ext, bytes };
    }

    const BORDERS = `<w:tblBorders>
        <w:top w:val="single" w:sz="4" w:color="auto"/>
        <w:left w:val="single" w:sz="4" w:color="auto"/>
        <w:bottom w:val="single" w:sz="4" w:color="auto"/>
        <w:right w:val="single" w:sz="4" w:color="auto"/>
        <w:insideH w:val="single" w:sz="4" w:color="auto"/>
        <w:insideV w:val="single" w:sz="4" w:color="auto"/>
    </w:tblBorders>`;
    const NO_BORDERS = `<w:tblBorders>
        <w:top w:val="none" w:sz="0" w:color="auto"/><w:left w:val="none" w:sz="0" w:color="auto"/>
        <w:bottom w:val="none" w:sz="0" w:color="auto"/><w:right w:val="none" w:sz="0" w:color="auto"/>
        <w:insideH w:val="none" w:sz="0" w:color="auto"/><w:insideV w:val="none" w:sz="0" w:color="auto"/>
    </w:tblBorders>`;

    // opts:
    //   header:     { name, studentId, program, semester, note }
    //   photo:      null | { dataUrl, width, height }
    //   days:       ['SUN','MON',...] — only the days actually used
    //   dayNames:   { SUN: 'Sunday', ... }
    //   slots:      ['08:30 AM - 09:50 AM', ...] in display order
    //   cellLinesFor(day, slot) -> string[]
    //   courseRows: [[code, title, section, meetings]] for the listing table
    function buildRoutineDocx(opts) {
        const header = opts.header || {};
        const days = opts.days || [];
        const dayNames = opts.dayNames || {};
        const slots = opts.slots || [];
        const cellLinesFor = opts.cellLinesFor || (() => []);
        const courseRows = opts.courseRows || [];

        // ── Photo (a real embedded image part, not text) ────────────────
        let imagePart = null;
        let photoExt = null;
        let drawingXml = '';
        const photo = opts.photo;
        const decoded = photo && photo.dataUrl ? decodeDataUrl(photo.dataUrl) : null;
        if (decoded) {
            photoExt = decoded.ext;
            const displayWidthEmu = 1050000; // ~1.15in
            const aspect = (photo.height && photo.width) ? photo.height / photo.width : 1.25;
            const displayHeightEmu = Math.round(displayWidthEmu * aspect);
            imagePart = { name: `word/media/photo.${decoded.ext}`, data: decoded.bytes };
            drawingXml = `<w:r><w:drawing>
                <wp:inline distT="0" distB="0" distL="0" distR="0">
                    <wp:extent cx="${displayWidthEmu}" cy="${displayHeightEmu}"/>
                    <wp:docPr id="1" name="Photo"/>
                    <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                        <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                            <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                                <pic:nvPicPr><pic:cNvPr id="1" name="Photo"/><pic:cNvPicPr/></pic:nvPicPr>
                                <pic:blipFill><a:blip r:embed="rIdPhoto"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
                                <pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${displayWidthEmu}" cy="${displayHeightEmu}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>
                            </pic:pic>
                        </a:graphicData>
                    </a:graphic>
                </wp:inline>
            </w:drawing></w:r>`;
        }

        // ── Letterhead: borderless 2-col table — text block | photo ─────
        const nameRun = `<w:p><w:pPr><w:spacing w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="${ACCENT}"/></w:rPr><w:t xml:space="preserve">${xmlEscape(header.name || 'Student')}</w:t></w:r></w:p>`;
        const subLines = [
            header.studentId ? `Student ID: ${header.studentId}` : '',
            header.program ? `Program: ${header.program}` : '',
            header.semester ? `Semester: ${header.semester}` : '',
        ].filter(Boolean).map((line) =>
            `<w:p><w:pPr><w:spacing w:after="20"/></w:pPr><w:r><w:rPr><w:color w:val="555555"/></w:rPr><w:t xml:space="preserve">${xmlEscape(line)}</w:t></w:r></w:p>`
        ).join('');
        const textCell = `<w:tc><w:tcPr><w:tcW w:w="7500" w:type="dxa"/></w:tcPr>${nameRun}${subLines}</w:tc>`;
        const photoCell = `<w:tc><w:tcPr><w:tcW w:w="1600" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="right"/></w:pPr>${drawingXml}</w:p></w:tc>`;
        const letterhead = `<w:tbl><w:tblPr>${NO_BORDERS}<w:tblW w:w="0" w:type="auto"/></w:tblPr><w:tblGrid><w:gridCol w:w="7500"/><w:gridCol w:w="1600"/></w:tblGrid><w:tr>${textCell}${photoCell}</w:tr></w:tbl>`;

        // Accent rule under the letterhead — a thin, solid-filled 1-row table.
        const accentRule = `<w:tbl><w:tblPr>${NO_BORDERS}<w:tblW w:w="0" w:type="auto"/></w:tblPr><w:tblGrid><w:gridCol w:w="9100"/></w:tblGrid><w:tr><w:trPr><w:trHeight w:val="60" w:hRule="exact"/></w:trPr>${withFill('<w:tc><w:tcPr><w:tcW w:w="9100" w:type="dxa"/></w:tcPr><w:p/></w:tc>', ACCENT)}</w:tr></w:tbl>`;

        // ── Weekly grid: Time | <day> … ─────────────────────────────────
        let gridXml = '';
        if (days.length && slots.length) {
            const colCount = days.length + 1;
            const colWidth = Math.floor(13000 / colCount);
            const tblGrid = `<w:tblGrid>${Array.from({ length: colCount }, () => `<w:gridCol w:w="${colWidth}"/>`).join('')}</w:tblGrid>`;
            const headerRow = `<w:tr>${withFill(cellXml(['Time'], { bold: true, widthTwips: colWidth, center: true }), ACCENT_LIGHT)}${days
                .map((d) => withFill(cellXml([dayNames[d] || d], { bold: true, widthTwips: colWidth, center: true }), ACCENT_LIGHT))
                .join('')}</w:tr>`;
            const dataRows = slots.map((slot) => {
                const timeCell = withFill(cellXml([slot], { widthTwips: colWidth, bold: true, center: true }), TIME_FILL);
                const dayCells = days.map((day) => cellXml(cellLinesFor(day, slot), { widthTwips: colWidth })).join('');
                return `<w:tr>${timeCell}${dayCells}</w:tr>`;
            }).join('');
            gridXml = `<w:p><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>Weekly Routine</w:t></w:r></w:p>
<w:tbl><w:tblPr>${BORDERS}<w:tblW w:w="0" w:type="auto"/></w:tblPr>${tblGrid}${headerRow}${dataRows}</w:tbl>`;
        } else {
            gridXml = '<w:p><w:r><w:t>No class meetings in this routine.</w:t></w:r></w:p>';
        }

        // ── Course listing table ────────────────────────────────────────
        let listXml = '';
        if (courseRows.length) {
            const widths = [1800, 4200, 1000, 6000];
            const grid = `<w:tblGrid>${widths.map((w) => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>`;
            const head = `<w:tr>${['Course', 'Title', 'Sec', 'Meetings']
                .map((label, i) => withFill(cellXml([label], { bold: true, widthTwips: widths[i] }), ACCENT_LIGHT)).join('')}</w:tr>`;
            const body = courseRows.map((row) =>
                `<w:tr>${row.map((value, i) => cellXml(
                    Array.isArray(value) ? value : (value ? [String(value)] : []),
                    { widthTwips: widths[i] }
                )).join('')}</w:tr>`
            ).join('');
            listXml = `<w:p/><w:p><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>Courses</w:t></w:r></w:p>
<w:tbl><w:tblPr>${BORDERS}<w:tblW w:w="0" w:type="auto"/></w:tblPr>${grid}${head}${body}</w:tbl>`;
        }

        const noteXml = header.note
            ? `<w:p/><w:p><w:r><w:rPr><w:sz w:val="18"/><w:color w:val="777777"/></w:rPr><w:t xml:space="preserve">${xmlEscape(header.note)}</w:t></w:r></w:p>`
            : '';

        const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
<w:body>
${letterhead}
${accentRule}
<w:p/>
${gridXml}
${listXml}
${noteXml}
<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/></w:sectPr>
</w:body>
</w:document>`;

        const docRels = imagePart
            ? `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rIdPhoto" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/photo.${photoExt}"/>
</Relationships>`
            : DOC_RELS;

        const contentTypes = imagePart
            ? CONTENT_TYPES.replace('</Types>', `<Default Extension="${photoExt}" ContentType="image/${photoExt}"/></Types>`)
            : CONTENT_TYPES;

        const files = [
            toFile('[Content_Types].xml', contentTypes),
            toFile('_rels/.rels', ROOT_RELS),
            toFile('word/document.xml', documentXml),
            toFile('word/_rels/document.xml.rels', docRels),
        ];
        if (imagePart) files.push(imagePart);
        return buildZipBlob(files);
    }

    window.ULAB_RoutineDocx = { buildRoutineDocx };
})();
