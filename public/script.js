// Set today's date as default
document.getElementById("weekEnding").valueAsDate = (() => {
  const d = new Date();
  // Round to nearest Friday
  const day = d.getDay();
  const diff = day <= 5 ? 5 - day : 6;
  d.setDate(d.getDate() + diff);
  return d;
})();

function addAchieve() {
  const row = document.createElement("div");
  row.className = "achieve-row";
  row.innerHTML = `
    <input type="text" class="achieve-task"   placeholder="Task / Area" />
    <input type="text" class="achieve-result" placeholder="Result / Evidence" />
    <button type="button" class="btn-remove" onclick="removeAchieve(this)" title="Remove">✕</button>
  `;
  document.getElementById("achieveRows").appendChild(row);
  row.querySelector("input").focus();
}

function removeAchieve(btn) {
  const rows = document.querySelectorAll(".achieve-row");
  if (rows.length > 1) btn.closest(".achieve-row").remove();
}

function setStatus(msg, cls) {
  const el = document.getElementById("status");
  el.textContent = msg;
  el.className = "status " + (cls || "");
}

document.getElementById("reportForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const btn = document.getElementById("generateBtn");
  btn.disabled = true;
  setStatus("Generating report…", "busy");

  // Gather achievement rows
  const achievements = Array.from(document.querySelectorAll(".achieve-row")).map(row => ({
    task:   row.querySelector(".achieve-task").value.trim(),
    result: row.querySelector(".achieve-result").value.trim(),
  })).filter(r => r.task);

  const payload = {
    name:             document.getElementById("name").value.trim(),
    weekEnding:       document.getElementById("weekEnding").value,
    position:         document.getElementById("position").value.trim(),
    department:       document.getElementById("department").value.trim(),
    hours:            document.getElementById("hours").value.trim(),
    meetings:         document.getElementById("meetings").value.trim(),
    absence:          document.getElementById("absence").value.trim(),
    satisfaction:     document.getElementById("satisfaction").value,
    summary:          document.getElementById("summary").value.trim(),
    activities:       document.getElementById("activities").value.trim(),
    socialMedia:      document.getElementById("socialMedia").value.trim(),
    projects:         document.getElementById("projects").value.trim(),
    meetingNotes:     document.getElementById("meetingNotes").value.trim(),
    collaboration:    document.getElementById("collaboration").value.trim(),
    achievements,
    challenges:       document.getElementById("challenges").value.trim(),
    nextActions:      document.getElementById("nextActions").value.trim(),
    managementNotes:  document.getElementById("managementNotes").value.trim(),
  };

  // Basic validation
  if (!payload.name || !payload.weekEnding || !payload.position) {
    setStatus("Please fill in Name, Week Ending, and Position.", "err");
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

    // Trigger download
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    const dateSlug = payload.weekEnding.replace(/-/g, "-");
    const safeName = payload.name.replace(/[^a-zA-Z0-9 ]/g, "").replace(/ /g, "_");
    a.href     = url;
    a.download = `Weekly_Report_${safeName}_${dateSlug}.docx`;
    a.click();
    URL.revokeObjectURL(url);

    setStatus("✓ Report downloaded successfully!", "ok");
  } catch (err) {
    setStatus("Error: " + err.message, "err");
  } finally {
    btn.disabled = false;
  }
});
