document.getElementById("weekEnding").valueAsDate = (() => {
  const d = new Date();
  const day = d.getDay();
  const diff = day <= 5 ? 5 - day : 6;
  d.setDate(d.getDate() + diff);
  return d;
})();

function setStatus(msg, cls) {
  const el = document.getElementById("status");
  el.textContent = msg;
  el.className = "status " + (cls || "");
}

document.getElementById("reportForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("generateBtn");
  btn.disabled = true;
  setStatus("AI is writing your report…", "busy");

  const payload = {
    name:       document.getElementById("name").value.trim(),
    position:   document.getElementById("position").value.trim(),
    weekEnding: document.getElementById("weekEnding").value,
    rawNotes:   document.getElementById("rawNotes").value.trim(),
  };

  if (!payload.name || !payload.position || !payload.weekEnding) {
    setStatus("Please fill in your name, position, and week ending.", "err");
    btn.disabled = false;
    return;
  }
  if (!payload.rawNotes) {
    setStatus("Please paste your weekly notes.", "err");
    btn.disabled = false;
    return;
  }

  try {
    const res = await fetch("/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(err.error || "Server error");
    }

    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    const safeName = payload.name.replace(/[^a-zA-Z0-9 ]/g, "").replace(/ /g, "_");
    a.href     = url;
    a.download = `Weekly_Report_${safeName}_${payload.weekEnding}.docx`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus("✓ Report downloaded!", "ok");
  } catch (err) {
    setStatus("Error: " + err.message, "err");
  } finally {
    btn.disabled = false;
  }
});
