const API_BASE_URL = "http://localhost:8000/api";

const CHART_TYPES = [
  "line",
  "area",
  "spline",
  "bar",
  "stacked_bar",
  "scatter",
  "bubble",
  "histogram",
  "box",
  "violin",
  "density",
  "heatmap_corr",
  "pie",
  "donut",
  "treemap",
];

const state = {
  datasetId: null,
  sessionId: null,
  datasetRows: [],
  columns: [],
  numericColumns: [],
  activeRecognition: null,
};

const el = {
  file: document.getElementById("csvFile"),
  uploadBtn: document.getElementById("uploadBtn"),
  uploadStatus: document.getElementById("uploadStatus"),
  datasetMeta: document.getElementById("datasetMeta"),
  previewTableWrap: document.getElementById("previewTableWrap"),
  profileTopMetrics: document.getElementById("profileTopMetrics"),
  profileTableWrap: document.getElementById("profileTableWrap"),

  chartType: document.getElementById("chartType"),
  xAxis: document.getElementById("xAxis"),
  yAxis: document.getElementById("yAxis"),
  sizeBy: document.getElementById("sizeBy"),
  colorBy: document.getElementById("colorBy"),
  renderChartBtn: document.getElementById("renderChartBtn"),
  chartNlp: document.getElementById("chartNlp"),
  nlpChartBtn: document.getElementById("nlpChartBtn"),
  chartHint: document.getElementById("chartHint"),
  chartContainer: document.getElementById("chartContainer"),

  analysisPrompt: document.getElementById("analysisPrompt"),
  analysisVoiceBtn: document.getElementById("analysisVoiceBtn"),
  analyzeBtn: document.getElementById("analyzeBtn"),
  analysisSpeakBtn: document.getElementById("analysisSpeakBtn"),
  analysisOutput: document.getElementById("analysisOutput"),

  chatPrompt: document.getElementById("chatPrompt"),
  chatVoiceBtn: document.getElementById("chatVoiceBtn"),
  chatBtn: document.getElementById("chatBtn"),
  chatSpeakBtn: document.getElementById("chatSpeakBtn"),
  chatOutput: document.getElementById("chatOutput"),

  scrapeUrl: document.getElementById("scrapeUrl"),
  scrapeInstruction: document.getElementById("scrapeInstruction"),
  scrapeBtn: document.getElementById("scrapeBtn"),
  scrapeOutput: document.getElementById("scrapeOutput"),
};

const speechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatRichText(text) {
  const escaped = escapeHtml(text || "");
  const withBold = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  return withBold.replace(/\n/g, "<br>");
}

function setOutput(target, text) {
  target.innerHTML = formatRichText(text);
}

function setStatus(message, isError = false) {
  el.uploadStatus.textContent = message;
  el.uploadStatus.className = isError ? "status error" : "status";
}

function setChartHint(message, isError = false) {
  el.chartHint.textContent = message;
  el.chartHint.className = isError ? "status error" : "status";
}

function renderMeta(profile) {
  el.datasetMeta.innerHTML = "";
  const cards = [
    ["Dataset", profile.filename],
    ["Rows", profile.rows],
    ["Columns", profile.columns],
    ["Dataset ID", profile.dataset_id.slice(0, 12) + "..."],
  ];

  cards.forEach(([label, value]) => {
    const item = document.createElement("div");
    item.className = "meta-item";
    item.innerHTML = `<div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(value)}</div>`;
    el.datasetMeta.appendChild(item);
  });
}

function renderPreview(rows) {
  if (!rows || rows.length === 0) {
    el.previewTableWrap.innerHTML = "";
    return;
  }
  const cols = Object.keys(rows[0]);
  const thead = `<thead><tr>${cols.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}</tr></thead>`;
  const tbody = `<tbody>${rows
    .map((r) => `<tr>${cols.map((c) => `<td>${escapeHtml(r[c] ?? "")}</td>`).join("")}</tr>`)
    .join("")}</tbody>`;
  el.previewTableWrap.innerHTML = `<table>${thead}${tbody}</table>`;
}

function renderProfiler(profile) {
  if (!profile) {
    el.profileTopMetrics.innerHTML = "";
    el.profileTableWrap.innerHTML = "";
    return;
  }

  const duplicateRows = Number.isFinite(Number(profile.duplicate_rows))
    ? Number(profile.duplicate_rows)
    : "N/A";
  const duplicatePct = Number.isFinite(Number(profile.duplicate_percentage))
    ? `${Number(profile.duplicate_percentage).toFixed(2)}%`
    : "N/A";
  const memoryMb = Number.isFinite(Number(profile.memory_usage_mb))
    ? Number(profile.memory_usage_mb).toFixed(3)
    : "N/A";

  const topCards = [
    ["Duplicate Rows", duplicateRows],
    ["Duplicate %", duplicatePct],
    ["Memory (MB)", memoryMb],
    ["Columns", profile.columns],
  ];

  el.profileTopMetrics.innerHTML = "";
  topCards.forEach(([label, value]) => {
    const item = document.createElement("div");
    item.className = "meta-item";
    item.innerHTML = `<div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(value)}</div>`;
    el.profileTopMetrics.appendChild(item);
  });

  const cols = ["Column", "DType", "Missing", "Missing %", "Unique"];
  const totalRows = Number(profile.rows) || 0;
  const localUniqueByCol = {};
  if (Array.isArray(state.datasetRows) && state.datasetRows.length) {
    profile.column_names.forEach((col) => {
      const set = new Set();
      state.datasetRows.forEach((r) => {
        const v = r?.[col];
        if (v !== null && v !== undefined && v !== "") set.add(String(v));
      });
      localUniqueByCol[col] = set.size;
    });
  }

  const rows = profile.column_names.map((col) => {
    const missing = Number(profile.missing_counts?.[col] ?? 0);
    const missingPctRaw = profile.missing_percentages?.[col];
    const missingPct = Number.isFinite(Number(missingPctRaw))
      ? Number(missingPctRaw)
      : totalRows > 0
        ? Number(((missing / totalRows) * 100).toFixed(2))
        : 0;
    const uniqueRaw = profile.unique_counts?.[col];
    const unique = Number.isFinite(Number(uniqueRaw))
      ? Number(uniqueRaw)
      : Number(localUniqueByCol[col] ?? 0);

    return {
      column: col,
      dtype: profile.dtypes?.[col] ?? "",
      missing,
      missingPct,
      unique,
    };
  });

  const thead = `<thead><tr>${cols.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}</tr></thead>`;
  const tbody = `<tbody>${rows
    .map((r) => `<tr>
      <td>${escapeHtml(r.column)}</td>
      <td>${escapeHtml(r.dtype)}</td>
      <td>${escapeHtml(r.missing)}</td>
      <td>${escapeHtml(r.missingPct)}%</td>
      <td>${escapeHtml(r.unique)}</td>
    </tr>`)
    .join("")}</tbody>`;
  el.profileTableWrap.innerHTML = `<table>${thead}${tbody}</table>`;
}

function inferNumericColumns(rows) {
  if (!rows.length) return [];
  const sampleSize = Math.min(rows.length, 160);
  return Object.keys(rows[0]).filter((col) => {
    let numericCount = 0;
    for (let i = 0; i < sampleSize; i += 1) {
      const val = rows[i][col];
      if (val === null || val === "") continue;
      if (!Number.isNaN(Number(val))) numericCount += 1;
    }
    return numericCount >= Math.floor(sampleSize * 0.65);
  });
}

function fillSelect(select, values, includeNone = false, defaultValue = "") {
  select.innerHTML = "";
  if (includeNone) {
    const none = document.createElement("option");
    none.value = "";
    none.textContent = "None";
    select.appendChild(none);
  }

  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });

  if (defaultValue && values.includes(defaultValue)) {
    select.value = defaultValue;
  }
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function safePairs(xKey, yKey) {
  const x = [];
  const y = [];
  state.datasetRows.forEach((row) => {
    const yVal = toNumber(row[yKey]);
    if (yVal === null) return;
    x.push(row[xKey]);
    y.push(yVal);
  });
  return { x, y };
}

function groupRows(groupKey) {
  const groups = new Map();
  state.datasetRows.forEach((row) => {
    const group = String(row[groupKey] ?? "Unknown");
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(row);
  });
  return [...groups.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 10);
}

function correlationMatrix() {
  const cols = state.numericColumns.slice(0, 14);
  const vectors = cols.map((col) => state.datasetRows.map((row) => toNumber(row[col])));

  function corr(a, b) {
    const x = [];
    const y = [];
    for (let i = 0; i < a.length; i += 1) {
      if (a[i] === null || b[i] === null) continue;
      x.push(a[i]);
      y.push(b[i]);
    }
    if (x.length < 3) return 0;
    const xMean = x.reduce((s, v) => s + v, 0) / x.length;
    const yMean = y.reduce((s, v) => s + v, 0) / y.length;
    let num = 0;
    let denX = 0;
    let denY = 0;
    for (let i = 0; i < x.length; i += 1) {
      const dx = x[i] - xMean;
      const dy = y[i] - yMean;
      num += dx * dy;
      denX += dx * dx;
      denY += dy * dy;
    }
    if (denX === 0 || denY === 0) return 0;
    return num / Math.sqrt(denX * denY);
  }

  const matrix = cols.map((_, i) => cols.map((__, j) => Number(corr(vectors[i], vectors[j]).toFixed(3))));
  return { cols, matrix };
}

function buildChartSpec(type, xKey, yKey, colorKey, sizeKey) {
  const baseLayout = {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: "#d9edff" },
    margin: { l: 45, r: 20, t: 46, b: 45 },
    legend: { orientation: "h", y: -0.2 },
  };

  if (type === "heatmap_corr") {
    if (state.numericColumns.length < 2) {
      throw new Error("Need at least 2 numeric columns for correlation heatmap.");
    }
    const { cols, matrix } = correlationMatrix();
    return {
      traces: [{ type: "heatmap", x: cols, y: cols, z: matrix, colorscale: "RdBu", zmid: 0 }],
      layout: {
        ...baseLayout,
        title: "Correlation Heatmap",
        xaxis: { tickangle: -35 },
      },
    };
  }

  if (type === "pie" || type === "donut" || type === "treemap") {
    const category = colorKey || xKey;
    if (!category || !yKey) {
      throw new Error("Composition charts need category (X/Color) and Y axis.");
    }
    const agg = new Map();
    state.datasetRows.forEach((row) => {
      const key = String(row[category] ?? "Unknown");
      const val = toNumber(row[yKey]);
      if (val === null) return;
      agg.set(key, (agg.get(key) || 0) + val);
    });
    const sorted = [...agg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14);
    const labels = sorted.map((x) => x[0]);
    const values = sorted.map((x) => Number(x[1].toFixed(4)));

    if (type === "treemap") {
      return {
        traces: [{ type: "treemap", labels, parents: labels.map(() => ""), values }],
        layout: { ...baseLayout, title: `Treemap | ${yKey} by ${category}` },
      };
    }

    return {
      traces: [{ type: "pie", labels, values, hole: type === "donut" ? 0.45 : 0 }],
      layout: { ...baseLayout, title: `${type === "donut" ? "Donut" : "Pie"} | ${yKey} by ${category}` },
    };
  }

  if (type === "stacked_bar") {
    if (!xKey || !yKey || !colorKey) {
      throw new Error("Stacked bar needs X axis, Y axis, and Color group.");
    }
    const groups = groupRows(colorKey);
    const traces = groups.map(([groupName, rows]) => {
      const agg = new Map();
      rows.forEach((row) => {
        const xVal = String(row[xKey]);
        const yVal = toNumber(row[yKey]);
        if (yVal === null) return;
        agg.set(xVal, (agg.get(xVal) || 0) + yVal);
      });
      const entries = [...agg.entries()].slice(0, 60);
      return {
        type: "bar",
        name: groupName,
        x: entries.map((e) => e[0]),
        y: entries.map((e) => Number(e[1].toFixed(4))),
      };
    });
    return {
      traces,
      layout: {
        ...baseLayout,
        title: `Stacked Bar | ${yKey} by ${xKey}`,
        barmode: "stack",
        xaxis: { title: xKey, gridcolor: "rgba(100,150,200,0.2)" },
        yaxis: { title: yKey, gridcolor: "rgba(100,150,200,0.2)" },
      },
    };
  }

  if (type === "box" || type === "violin") {
    if (!yKey) {
      throw new Error("Box/Violin requires Y axis.");
    }
    const grouped = colorKey ? groupRows(colorKey) : [[yKey, state.datasetRows]];
    const traces = grouped.map(([name, rows]) => ({
      type,
      name,
      y: rows.map((r) => toNumber(r[yKey])).filter((v) => v !== null),
      boxmean: type === "box" ? true : undefined,
      points: false,
    }));
    return {
      traces,
      layout: {
        ...baseLayout,
        title: `${type === "box" ? "Box Plot" : "Violin Plot"} | ${yKey}`,
        yaxis: { title: yKey, gridcolor: "rgba(100,150,200,0.2)" },
      },
    };
  }

  if (type === "histogram") {
    if (!yKey) {
      throw new Error("Histogram requires Y axis.");
    }
    return {
      traces: [{ type: "histogram", x: state.datasetRows.map((r) => toNumber(r[yKey])).filter((v) => v !== null), marker: { color: "#33d1ff" } }],
      layout: {
        ...baseLayout,
        title: `Histogram | ${yKey}`,
        xaxis: { title: yKey, gridcolor: "rgba(100,150,200,0.2)" },
      },
    };
  }

  if (type === "density") {
    if (!xKey || !yKey) {
      throw new Error("Density contour needs X and Y axes.");
    }
    const x = [];
    const y = [];
    state.datasetRows.forEach((row) => {
      const xVal = toNumber(row[xKey]);
      const yVal = toNumber(row[yKey]);
      if (xVal === null || yVal === null) return;
      x.push(xVal);
      y.push(yVal);
    });
    return {
      traces: [{ type: "histogram2dcontour", x, y, colorscale: "Viridis", contours: { coloring: "heatmap" } }],
      layout: {
        ...baseLayout,
        title: `Density Contour | ${yKey} vs ${xKey}`,
        xaxis: { title: xKey, gridcolor: "rgba(100,150,200,0.2)" },
        yaxis: { title: yKey, gridcolor: "rgba(100,150,200,0.2)" },
      },
    };
  }

  if (colorKey) {
    const traces = groupRows(colorKey).map(([groupName, rows]) => {
      const x = [];
      const y = [];
      const size = [];
      rows.forEach((row) => {
        const yVal = toNumber(row[yKey]);
        if (yVal === null) return;
        x.push(row[xKey]);
        y.push(yVal);
        size.push(Math.abs(toNumber(row[sizeKey]) || yVal));
      });

      const marker = {
        size: type === "bubble" ? size.map((v) => Math.max(6, Math.min(36, v))) : (type === "scatter" ? 8 : undefined),
      };

      return {
        type: type === "line" || type === "area" || type === "spline" || type === "bubble" ? "scatter" : type,
        mode: type === "line" || type === "area" || type === "spline" ? "lines+markers" : "markers",
        fill: type === "area" ? "tozeroy" : undefined,
        line: type === "spline" ? { shape: "spline", width: 2 } : undefined,
        marker,
        name: groupName,
        x,
        y,
      };
    });

    return {
      traces,
      layout: {
        ...baseLayout,
        title: `${type.toUpperCase()} | ${yKey}${xKey ? ` by ${xKey}` : ""}`,
        xaxis: { title: xKey || yKey, gridcolor: "rgba(100,150,200,0.2)" },
        yaxis: { title: yKey, gridcolor: "rgba(100,150,200,0.2)" },
      },
    };
  }

  const { x, y } = safePairs(xKey, yKey);
  const marker = {
    color: "#00ffa3",
    size: type === "bubble"
      ? y.map((v, i) => {
        const base = toNumber(state.datasetRows[i]?.[sizeKey]) || Math.abs(v);
        return Math.max(6, Math.min(36, base));
      })
      : type === "scatter" ? 8 : undefined,
  };

  return {
    traces: [{
      type: type === "line" || type === "area" || type === "spline" || type === "bubble" ? "scatter" : type,
      mode: type === "line" || type === "area" || type === "spline" ? "lines+markers" : "markers",
      fill: type === "area" ? "tozeroy" : undefined,
      line: type === "spline" ? { shape: "spline", width: 2, color: "#33d1ff" } : { color: "#33d1ff", width: 2 },
      marker,
      x,
      y,
    }],
    layout: {
      ...baseLayout,
      title: `${type.toUpperCase()} | ${yKey}${xKey ? ` by ${xKey}` : ""}`,
      xaxis: { title: xKey || yKey, gridcolor: "rgba(100,150,200,0.2)" },
      yaxis: { title: yKey, gridcolor: "rgba(100,150,200,0.2)" },
    },
  };
}

async function fetchDatasetRows() {
  if (!state.datasetId) return;
  const res = await fetch(`${API_BASE_URL}/dataset/${state.datasetId}/rows?limit=2500`);
  if (!res.ok) throw new Error((await res.json()).detail || "Failed to load dataset rows");
  const data = await res.json();
  state.datasetRows = data.rows || [];
  state.columns = state.datasetRows.length ? Object.keys(state.datasetRows[0]) : [];
  state.numericColumns = inferNumericColumns(state.datasetRows);

  const defaultX = state.columns.find((c) => c.toLowerCase().includes("date")) || state.columns[0] || "";
  const defaultY = state.numericColumns[0] || state.columns[1] || state.columns[0] || "";
  const defaultSize = state.numericColumns[1] || defaultY;

  fillSelect(el.xAxis, state.columns, false, defaultX);
  fillSelect(el.yAxis, state.numericColumns.length ? state.numericColumns : state.columns, false, defaultY);
  fillSelect(el.sizeBy, state.numericColumns, true, defaultSize);
  fillSelect(el.colorBy, state.columns, true, "");
}

function renderChart() {
  if (!state.datasetRows.length) {
    setChartHint("Upload dataset first to render chart.", true);
    return;
  }

  const type = el.chartType.value;
  const xKey = el.xAxis.value;
  const yKey = el.yAxis.value;
  const colorKey = el.colorBy.value;
  const sizeKey = el.sizeBy.value;

  try {
    const { traces, layout } = buildChartSpec(type, xKey, yKey, colorKey, sizeKey);
    Plotly.newPlot(el.chartContainer, traces, layout, { responsive: true, displaylogo: false });
    setChartHint(`Chart rendered: ${type}. Available modules: ${CHART_TYPES.length} chart types.`);
  } catch (error) {
    setChartHint(error.message || "Chart render failed.", true);
  }
}

function normalize(str) {
  return String(str || "").toLowerCase().replace(/[^a-z0-9_ ]/g, " ").replace(/\s+/g, " ").trim();
}

function parseChartCommand(commandText) {
  const text = normalize(commandText);
  if (!text) return null;

  const aliases = {
    line: ["line", "trend"],
    area: ["area"],
    spline: ["spline", "smooth"],
    bar: ["bar", "column"],
    stacked_bar: ["stacked", "stack"],
    scatter: ["scatter"],
    bubble: ["bubble"],
    histogram: ["histogram", "distribution"],
    box: ["box"],
    violin: ["violin"],
    density: ["density", "contour"],
    heatmap_corr: ["heatmap", "correlation"],
    pie: ["pie"],
    donut: ["donut"],
    treemap: ["treemap"],
  };

  let chartType = "line";
  for (const [type, words] of Object.entries(aliases)) {
    if (words.some((word) => text.includes(word))) {
      chartType = type;
      break;
    }
  }

  const columnMap = new Map(state.columns.map((c) => [normalize(c), c]));
  const matchedCols = [];
  for (const [norm, original] of columnMap.entries()) {
    if (text.includes(norm)) matchedCols.push(original);
  }

  let yAxis = matchedCols.find((col) => state.numericColumns.includes(col)) || state.numericColumns[0] || "";
  let xAxis = matchedCols.find((col) => col !== yAxis) || state.columns[0] || "";

  const byMatch = text.match(/(?:of|for)?\s*([a-z0-9_ ]+)\s+by\s+([a-z0-9_ ]+)/);
  if (byMatch) {
    const yCandidate = normalize(byMatch[1]);
    const xCandidate = normalize(byMatch[2]);
    if (columnMap.has(yCandidate)) yAxis = columnMap.get(yCandidate);
    if (columnMap.has(xCandidate)) xAxis = columnMap.get(xCandidate);
  }

  const colorMatch = text.match(/(?:color|group|split)\s+by\s+([a-z0-9_ ]+)/);
  const colorBy = colorMatch && columnMap.has(normalize(colorMatch[1])) ? columnMap.get(normalize(colorMatch[1])) : "";

  return { chartType, xAxis, yAxis, colorBy };
}

function cleanVoiceTranscript(rawText) {
  const compact = String(rawText || "").replace(/\s+/g, " ").trim();
  if (!compact) return "";

  // Collapse obvious repeated tokens/short phrases from noisy recognition.
  let cleaned = compact
    .replace(/\b([a-z0-9_]+)(\s+\1\b)+/gi, "$1")
    .replace(/\b([a-z0-9_]+\s+[a-z0-9_]+)(\s+\1\b)+/gi, "$1")
    .replace(/\b([a-z0-9_]+\s+[a-z0-9_]+\s+[a-z0-9_]+)(\s+\1\b)+/gi, "$1");

  const tokens = cleaned.split(" ").filter(Boolean);
  if (!tokens.length) return "";

  // Remove contiguous repeated n-grams like: "top five top five".
  for (let n = 4; n >= 1; n -= 1) {
    let i = n;
    while (i + n <= tokens.length) {
      const left = tokens.slice(i - n, i).join(" ").toLowerCase();
      const right = tokens.slice(i, i + n).join(" ").toLowerCase();
      if (left === right) {
        tokens.splice(i, n);
      } else {
        i += 1;
      }
    }
  }

  // Remove short partial fragments before fuller words, e.g. "c cg cgp cgpa".
  for (let i = 0; i < tokens.length - 1; i += 1) {
    const a = tokens[i];
    const b = tokens[i + 1];
    if (a.length <= 3 && b.toLowerCase().startsWith(a.toLowerCase()) && b.length > a.length) {
      tokens.splice(i, 1);
      i -= 1;
    }
  }

  cleaned = tokens.join(" ");

  cleaned = cleaned.replace(/\s+/g, " ").trim();
  return cleaned;
}

function applyNlpChartCommand() {
  if (!state.datasetRows.length) {
    setChartHint("Upload dataset first.", true);
    return;
  }

  const parsed = parseChartCommand(el.chartNlp.value);
  if (!parsed) {
    setChartHint("Could not parse command. Try: donut return_5 by ticker", true);
    return;
  }

  el.chartType.value = parsed.chartType;
  if (parsed.xAxis) el.xAxis.value = parsed.xAxis;
  if (parsed.yAxis) el.yAxis.value = parsed.yAxis;
  el.colorBy.value = parsed.colorBy || "";
  renderChart();
}

function startVoiceInput(target, triggerBtn) {
  if (!speechRecognitionCtor) {
    alert("Voice recognition is not supported in this browser. Use Chrome/Edge.");
    return;
  }

  if (state.activeRecognition) {
    state.activeRecognition.stop();
    state.activeRecognition = null;
  }

  const recognition = new speechRecognitionCtor();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;

  if (triggerBtn) {
    triggerBtn.disabled = true;
    triggerBtn.textContent = "Listening...";
  }

  state.activeRecognition = recognition;

  recognition.onresult = (event) => {
    const transcript = cleanVoiceTranscript(event.results[0][0].transcript);
    if (!transcript) return;
    // Replace-mode prevents accumulation of repeated chunks across attempts.
    target.value = transcript;
  };
  recognition.onerror = () => {
    alert("Voice input failed. Check microphone permissions.");
  };
  recognition.onend = () => {
    state.activeRecognition = null;
    if (triggerBtn) {
      triggerBtn.disabled = false;
      triggerBtn.textContent = "Voice Input";
    }
  };
  recognition.start();
}

function speakOutput(sourceEl) {
  if (!window.speechSynthesis) {
    alert("Speech synthesis not supported in this browser.");
    return;
  }
  const text = sourceEl.textContent?.trim();
  if (!text) return;
  const utterance = new SpeechSynthesisUtterance(text.slice(0, 3500));
  utterance.rate = 1;
  utterance.pitch = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

async function uploadCsv() {
  const file = el.file.files[0];
  if (!file) {
    setStatus("Please choose a CSV file", true);
    return;
  }

  const formData = new FormData();
  formData.append("file", file);
  setStatus("Uploading and profiling dataset...");

  try {
    const res = await fetch(`${API_BASE_URL}/upload-csv`, { method: "POST", body: formData });
    if (!res.ok) throw new Error((await res.json()).detail || "Upload failed");
    const profile = await res.json();

    state.datasetId = profile.dataset_id;
    renderMeta(profile);
    renderPreview(profile.preview_rows);
    renderProfiler(profile);

    await fetchDatasetRows();
    renderChart();
    setStatus(`Loaded ${profile.filename} successfully`);
  } catch (error) {
    setStatus(error.message || "Upload failed", true);
  }
}

async function runAnalysis() {
  if (!state.datasetId) {
    setOutput(el.analysisOutput, "Upload a dataset first.");
    return;
  }

  const prompt = el.analysisPrompt.value.trim();
  if (!prompt) {
    setOutput(el.analysisOutput, "Please enter an analysis request.");
    return;
  }

  setOutput(el.analysisOutput, "Running analysis...");
  try {
    const res = await fetch(`${API_BASE_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataset_id: state.datasetId, prompt }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || "Analysis failed");
    const data = await res.json();
    setOutput(el.analysisOutput, data.answer);
  } catch (error) {
    setOutput(el.analysisOutput, `Error: ${error.message}`);
  }
}

async function chat() {
  const message = el.chatPrompt.value.trim();
  if (!message) {
    setOutput(el.chatOutput, "Please enter a message.");
    return;
  }

  setOutput(el.chatOutput, "Thinking...");
  try {
    const res = await fetch(`${API_BASE_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, session_id: state.sessionId, dataset_id: state.datasetId }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || "Chat failed");

    const data = await res.json();
    state.sessionId = data.session_id;
    setOutput(el.chatOutput, data.answer);
  } catch (error) {
    setOutput(el.chatOutput, `Error: ${error.message}`);
  }
}

async function scrapeAndSummarize() {
  const url = el.scrapeUrl.value.trim();
  const instruction = el.scrapeInstruction.value.trim() || "Summarize for a data team.";
  if (!url) {
    setOutput(el.scrapeOutput, "Enter a URL first.");
    return;
  }

  setOutput(el.scrapeOutput, "Fetching and summarizing...");
  try {
    const res = await fetch(`${API_BASE_URL}/scrape`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, instruction }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || "Scrape failed");

    const data = await res.json();
    setOutput(
      el.scrapeOutput,
      `**Title:** ${data.title}\n\n**Summary:**\n${data.summary}\n\n**Extracted Text (Preview):**\n${data.extracted_text}`,
    );
  } catch (error) {
    setOutput(el.scrapeOutput, `Error: ${error.message}`);
  }
}

function applyPreset(type) {
  if (!CHART_TYPES.includes(type)) return;
  el.chartType.value = type;
  renderChart();
}

el.uploadBtn.addEventListener("click", uploadCsv);
el.renderChartBtn.addEventListener("click", renderChart);
el.nlpChartBtn.addEventListener("click", applyNlpChartCommand);

document.querySelectorAll(".module-btn").forEach((btn) => {
  btn.addEventListener("click", () => applyPreset(btn.dataset.chartPreset));
});

el.analyzeBtn.addEventListener("click", runAnalysis);
el.analysisVoiceBtn.addEventListener("click", () => startVoiceInput(el.analysisPrompt, el.analysisVoiceBtn));
el.analysisSpeakBtn.addEventListener("click", () => speakOutput(el.analysisOutput));

el.chatBtn.addEventListener("click", chat);
el.chatVoiceBtn.addEventListener("click", () => startVoiceInput(el.chatPrompt, el.chatVoiceBtn));
el.chatSpeakBtn.addEventListener("click", () => speakOutput(el.chatOutput));

el.scrapeBtn.addEventListener("click", scrapeAndSummarize);
