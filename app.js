(() => {
  const SLOTS = 10;
  const KEY = "voterPageBuilder.v1";
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const defaultState = () => ({
    lang: "both",
    header: { title: "", ward: "", page: "1", ageDate: "01-01-2026", pubDate: "" },
    voters: Array(SLOTS).fill(null),
  });
  let state = load();
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && Array.isArray(s.voters)) {
        const d = defaultState();
        return { ...d, ...s, header: { ...d.header, ...s.header }, voters: Array.from({ length: SLOTS }, (_, i) => s.voters[i] || null) };
      }
    } catch (e) {}
    return defaultState();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { alert("Storage full – try removing some photos."); }
  }

  // ---- i18n helpers ----
  const T = (key, lang = state.lang) => {
    const te = I18N.te[key] ?? key, en = I18N.en[key] ?? key;
    return lang === "te" ? te : lang === "en" ? en : (te === en ? te : `${te} / ${en}`);
  };
  const REL_NAME_KEY = { father: "fatherName", husband: "husbandName", mother: "motherName", other: "otherName" };
  const GENDER_KEY = { M: "male", F: "female", O: "otherG" };
  // Gender abbreviations on the printed card: short form
  const genderShort = (g) => {
    const te = { M: "పు", F: "స్త్రీ", O: "ఇతర" }[g], en = { M: "M", F: "F", O: "O" }[g];
    return state.lang === "te" ? te : state.lang === "en" ? en : `${te}/${en}`;
  };

  // ---- sheet rendering ----
  function renderSheet() {
    let html = `<div class="grid">`;
    state.voters.forEach((v, i) => {
      if (!v) { html += `<div class="card empty" data-i="${i}">${esc(T("addVoter"))}</div>`; return; }
      html += `<div class="card filled" data-i="${i}">
        <div class="c-top"><span>${esc(T("serial"))}: <span class="c-idx">${esc(v.serial || "")}</span></span>${v.page ? `<span class="pg">${esc(T("page"))}: <b class="v">${esc(v.page)}</b></span>` : ""}${v.gender ? `<span>${esc(T("gender"))}: <b class="v">${esc(genderShort(v.gender))}</b></span>` : ""}</div>
        <div class="row"><b>${esc(T("name"))}</b><div class="v big">${esc(v.name)}</div></div>
        ${v.relName ? `<div class="row"><b>${esc(T("relName"))}</b><div class="v">${esc(v.relName)}</div></div>` : ""}
        <div class="c-id"><b>${esc(T("voterId"))}</b><div class="v big">${esc(v.voterId)}</div></div>
      </div>`;
    });
    html += `</div><div class="sh-foot"></div>`;
    $("sheet").innerHTML = html;
  }

  function renderChrome() {
    $("appTitle").textContent = T("appTitle");
    $("langLabel").textContent = T("language") + ":";
    const opts = $("langSelect").options;
    opts[0].textContent = `${I18N.te.langBoth} / ${I18N.en.langBoth}`;
    opts[1].textContent = `${I18N.te.langTe} (Telugu)`;
    opts[2].textContent = "English";
    $("langSelect").value = state.lang;
    $("btnPdf").textContent = T("downloadPdf");
    $("btnNext").textContent = T("nextPage");
    const n = state.voters.filter(Boolean).length;
    $("progress").textContent = `${n} / ${SLOTS}`;
    $("pbarText").textContent = state.lang === "en" ? `${n} of ${SLOTS} filled` : state.lang === "te" ? `${SLOTS} లో ${n} నింపబడ్డాయి` : `${SLOTS} లో ${n} నింపబడ్డాయి / ${n} of ${SLOTS} filled`;
    $("pbarFill").style.width = (n / SLOTS * 100) + "%";
    $("btnPdf").disabled = false;
    $("btnPdf").classList.toggle("primary", n === SLOTS);
    $("btnNext").disabled = n === 0;
    const b = $("banner");
    b.hidden = n < SLOTS;
    b.textContent = T("fillAllPrompt");
    document.documentElement.lang = state.lang === "en" ? "en" : "te";
  }
  function render() { renderChrome(); renderSheet(); fit(); }

  function fit() {
    const scale = Math.min(1, (window.innerWidth - 24) / 794);
    $("sheetWrap").style.zoom = scale;
  }
  window.addEventListener("resize", fit);

  // ---- voter dialog ----
  let editing = -1;
  function field(id, labelKey, type, req, extra = "") {
    return `<div class="fld"><label for="${id}">${esc(T(labelKey))}<span class="tag ${req ? "req" : ""}">(${esc(T(req ? "required" : "optional"))})</span></label>
      <input id="${id}" type="${type}" ${extra}><div class="err" id="${id}Err"></div></div>`;
  }
  function openVoter(i) {
    editing = i;
    const v = state.voters[i] || {};
    $("dlgTitle").textContent = (v.name ? T("editVoter") : T("newVoter")) + ` #${i + 1}`;
    const gOpts = ["M", "F", "O"].map((k) => `<option value="${k}">${esc(T(GENDER_KEY[k]))}</option>`).join("");
    $("formFields").innerHTML =
      field("f_name", "name", "text", true, 'autocomplete="off"') +
      field("f_voterId", "voterId", "text", true, 'autocomplete="off" style="text-transform:uppercase"') +
      field("f_relName", "relName", "text", false, 'autocomplete="off"') +
      `<div class="two"><div class="fld"><label for="f_gender">${esc(T("gender"))}<span class="tag">(${esc(T("optional"))})</span></label>
        <select id="f_gender"><option value="">${esc(T("select"))}</option>${gOpts}</select></div>
        ${field("f_serial", "serial", "text", false)}</div>` +
      field("f_page", "page", "text", false, 'autocomplete="off"');
    $("f_name").value = v.name || ""; $("f_voterId").value = v.voterId || "";
    $("f_relName").value = v.relName || "";
    $("f_gender").value = v.gender || ""; $("f_serial").value = v.serial || ""; $("f_page").value = v.page || "";
    $("dlgSave").textContent = T("save"); $("dlgCancel").textContent = T("cancel");
    $("dlgRemove").textContent = T("remove"); $("dlgRemove").hidden = !state.voters[i];
    $("voterDlg").showModal();
    $("f_name").focus();
  }
  $("voterForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("f_name").value.trim(), voterId = $("f_voterId").value.trim().toUpperCase();
    $("f_nameErr").textContent = name ? "" : T("errName");
    $("f_voterIdErr").textContent = voterId ? "" : T("errId");
    $("f_name").classList.toggle("bad", !name); $("f_voterId").classList.toggle("bad", !voterId);
    if (!name || !voterId) return;
    state.voters[editing] = {
      name, voterId,
      relName: $("f_relName").value.trim(),
      gender: $("f_gender").value, serial: $("f_serial").value.trim(), page: $("f_page").value.trim(),
    };
    save(); $("voterDlg").close(); render();
  });
  $("dlgCancel").onclick = () => $("voterDlg").close();
  $("dlgRemove").onclick = () => {
    if (confirm(T("confirmRemove"))) { state.voters[editing] = null; save(); $("voterDlg").close(); render(); }
  };
  $("sheet").addEventListener("click", (e) => {
    const c = e.target.closest(".card"); if (c && !document.body.classList.contains("busy")) openVoter(+c.dataset.i);
  });

  // ---- header dialog ----
  $("btnHeader").onclick = () => {
    const h = state.header;
    $("hdrTitle").textContent = T("editHeader");
    $("headerFields").innerHTML =
      field("h_title", "headerTitle", "text", false, `placeholder="${esc(T("listTitle"))}"`) +
      `<div class="two">${field("h_ward", "ward", "text", false)}${field("h_page", "page", "text", false)}</div>` +
      `<div class="two">${field("h_ageDate", "ageDate", "text", false)}${field("h_pubDate", "pubDate", "text", false)}</div>`;
    $("h_title").value = h.title; $("h_ward").value = h.ward; $("h_page").value = h.page;
    $("h_ageDate").value = h.ageDate; $("h_pubDate").value = h.pubDate;
    $("hdrSave").textContent = T("save"); $("hdrCancel").textContent = T("cancel");
    $("headerDlg").showModal();
  };
  $("hdrCancel").onclick = () => $("headerDlg").close();
  $("headerForm").addEventListener("submit", (e) => {
    e.preventDefault();
    state.header = { title: $("h_title").value.trim(), ward: $("h_ward").value.trim(), page: $("h_page").value.trim(),
      ageDate: $("h_ageDate").value.trim(), pubDate: $("h_pubDate").value.trim() };
    save(); $("headerDlg").close(); render();
  });

  // ---- language / next page ----
  $("langSelect").onchange = (e) => { state.lang = e.target.value; save(); render(); };
  $("btnNext").onclick = () => {
    if (!confirm(T("confirmNext"))) return;
    state.voters = Array(SLOTS).fill(null);
    save(); render();
  };

  // ---- PDF ----
  async function makePdf() {
    document.body.classList.add("busy");
    const now = new Date(), p2 = (x) => String(x).padStart(2, "0");
    const stamp = `${now.getFullYear()}-${p2(now.getMonth() + 1)}-${p2(now.getDate())}_${p2(now.getHours())}-${p2(now.getMinutes())}-${p2(now.getSeconds())}`;
    const wrap = $("sheetWrap"), sheet = $("sheet"), oldZoom = wrap.style.zoom;
    wrap.style.zoom = 1; sheet.classList.add("exporting");
    try {
      await document.fonts.ready;
      const canvas = await html2canvas(sheet, { scale: 2.5, backgroundColor: "#fff", useCORS: true, width: 794, height: 1123, windowWidth: 1200 });
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, 210, 297);
      pdf.save(`voters_${stamp}.pdf`);
    } finally {
      sheet.classList.remove("exporting"); wrap.style.zoom = oldZoom;
      document.body.classList.remove("busy");
    }
  }
  $("btnPdf").onclick = makePdf;

  render();
})();
