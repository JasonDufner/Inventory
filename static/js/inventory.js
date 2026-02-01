let inventoryGroups = [];

async function loadGroups() {
    const res = await fetch('/api/get_groups');
    inventoryGroups = await res.json();
    renderGroupList();
    updateAllDropdowns();
}

// helper function for the drop-down in the table
function renderGroupSelect(id, currentGroup) {
    return `<select class="group-select" onchange="updateItem(${id}, 'gruppe', this.value)">
        ${inventoryGroups.map(g => `<option value="${g.name}" ${g.name === currentGroup ? 'selected' : ''}>${g.name}</option>`).join('')}
    </select>`;
}

window.updateItem = async (id, field, value) => {
    const res = await fetch('/api/update_inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, field, value: value.toString().trim() })
    });
    if (!res.ok) {
        const data = await res.json();
        alert("FEHLER: " + data.error);
        location.reload(); // sets name to old 
    }
};

window.checkAndUpdateQty = async (id, input) => {
    let val = parseInt(input.value);
    if (isNaN(val) || val < 0) {
        val = 1;
        input.value = 1;
    }

    await updateItem(id, 'anzahl', val);
    await loadInventory();
};

window.addGroup = async function () {
    const input = document.getElementById("newGroupName");
    const name = input.value.trim();
    if (!name) return;
    const res = await fetch('/api/add_group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    });
    const data = await res.json();
    if (res.ok) { input.value = ""; await loadGroups(); }
    else { alert(data.error); }
};

window.removeGroup = async function (id) {
    if (inventoryGroups.length <= 1) {
        alert("Aktion verweigert: Es muss immer mindestens eine Gruppe existieren!");
        return;
    }

    if (!confirm("Gruppe wirklich löschen? Alle Artikel darin behalten ihren Gruppennamen, bis du sie änderst.")) return;

    const res = await fetch('/api/delete_group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
    });

    if (res.ok) {
        await loadGroups();
    } else {
        const data = await res.json();
        alert("Fehler: " + (data.error || "Serverfehler"));
    }
};

function renderGroupList() {
    const list = document.getElementById("groupList");
    if (!list) return;
    list.innerHTML = inventoryGroups.map(g => `
        <div style="display:flex; justify-content:space-between; padding:5px; border-bottom:1px solid #eee;">
            <span>${g.name}</span>
            <button class="del-icon" onclick="removeGroup(${g.id})">🗑</button>
        </div>
    `).join('');
}

function updateAllDropdowns() {
    loadInventory();
}

async function loadInventory() {
    const res = await fetch('/api/get_inventory');
    const items = await res.json();
    const tbody = document.getElementById("home-table-body");
    if (tbody) {
        tbody.innerHTML = "";
        items.forEach(addRowToUI);
    }

}


function addRowToUI(item) {
    window.canEdit = (typeof USER_ROLE !== 'undefined' && (USER_ROLE === 'Administrator' || USER_ROLE === 'Editor'));
    const tbody = document.getElementById("home-table-body");
    const tr = document.createElement("tr");


    const editAttr = window.canEdit ? 'contenteditable="true"' : 'contenteditable="false"';
    const aktuellVal = (item.aktuell !== undefined) ? item.aktuell : item.anzahl;

    let styleAktuell = "background-color: #f8f9fa; cursor: default;";
    if (aktuellVal < 0) {
        styleAktuell += "color: red; font-weight: bold;";
    } else if (aktuellVal !== item.anzahl) {
        styleAktuell += "color: #007bff; font-weight: bold;";
    }


    tr.innerHTML = `
        <td class="px-6 py-4">${window.canEdit ? renderGroupSelect(item.id, item.gruppe) : item.gruppe}</td>
        <td class="px-6 py-4 font-medium" ${editAttr} onblur="updateItem(${item.id}, 'name_id', this.innerText)">${item.name_id}</td>
        <td class="px-6 py-4 font-medium" ${editAttr} onblur="updateItem(${item.id}, 'lagerort', this.innerText)">${item.lagerort}</td>
        <td class="px-6 py-4">
            ${window.canEdit ? `
                <div class="flex items-center border border-slate-200 dark:border-slate-700 rounded-md w-max bg-slate-50 dark:bg-slate-800">
                    <button class="px-2 py-1 text-blue-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" onclick="this.nextElementSibling.stepDown(); this.nextElementSibling.dispatchEvent(new Event('change'))">-</button>
                    <input class="w-10 text-center bg-transparent border-none focus:ring-0 text-sm font-medium"
                        type="number" 
                        value="${item.anzahl || 0}" 
                        min="1" 
                        class="custom-number-input"
                        onchange="checkAndUpdateQty(${item.id}, this)">
                    <button class="px-2 py-1 text-red-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" onclick="this.previousElementSibling.stepUp(); this.previousElementSibling.dispatchEvent(new Event('change'))">+</button>
                </div>` :
            `<span>${item.anzahl}</span>`
        }
        </td>
        <td class="px-6 py-4 font-semibold text-primary">${item.aktuell}</td>
        <td class="px-6 py-4 text-slate-500 dark:text-slate-400" ${editAttr} onblur="updateItem(${item.id}, 'info', this.innerText)">${item.info}</td>
        <td class="px-6 py-4 text-right">
            <div class="flex justify-end gap-2">
                <button class="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-primary transition-colors"
                    onclick="openPdfModal(${item.id}, '${item.name_id}')" title="Anleitungen">
                    <span class="material-icons-outlined text-sm">edit_note</span>
                    </button>
                ${window.canEdit ? `
                <button class="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-slate-400 hover:text-red-500 transition-colors"
                    onclick="deleteItem(${item.id})">
                    <span class="material-icons-outlined text-sm">delete</span>
                </button>` : ''}
            </div>
        </td>
    `;
    tbody.appendChild(tr);
}

// --- PDF MODAL ---
let currentPdfItemId = null;

function openPdfModal(id, name) {
    currentPdfItemId = id;
    document.getElementById('pdfModalTitle').innerText = `Anleitungen: ${name}`;
    toggleModal('pdfModal', true);
    initPdfHandlers();
    loadPdfList();
}

function initPdfHandlers() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('pdfInput');
    if (!dropZone || !fileInput) return;

    dropZone.onclick = () => fileInput.click();
    fileInput.onchange = (e) => handleFiles(e.target.files);

    dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); };
    dropZone.ondragleave = () => dropZone.classList.remove('drag-over');
    dropZone.ondrop = (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        handleFiles(e.dataTransfer.files);
    };
}

async function handleFiles(files) {
    for (let file of files) {
        if (file.type !== "application/pdf") {
            alert("Nur PDFs erlaubt!");
            continue;
        }
        const formData = new FormData();
        formData.append('file', file);
        formData.append('item_id', currentPdfItemId);

        await fetch('/api/upload_pdf', { method: 'POST', body: formData });
    }
    loadPdfList();
}

async function loadPdfList() {
    const res = await fetch(`/api/get_pdfs/${currentPdfItemId}`);
    const pdfs = await res.json();
    const list = document.getElementById('pdfList');
    list.innerHTML = pdfs.length === 0 ? "<p style='text-align:center; color:#888;'>Keine PDFs vorhanden.</p>" : "";

    pdfs.forEach(p => {
        const div = document.createElement("div");
        div.className = "pdf-entry";
        div.innerHTML = `
            <div
                class="flex items-center justify-between bg-blue-100/80 dark:bg-[#a5c2f9] p-2 pl-3 rounded-lg group/item transition-all border border-blue-200 dark:border-blue-300/30">
                <div class="flex items-center gap-3 overflow-hidden">
                    <span
                        class="material-symbols-outlined text-slate-600 dark:text-slate-700 text-xl flex-shrink-0">description</span>
                    <span class="text-sm font-medium text-slate-700 dark:text-slate-800 truncate" onclick="window.open('/${p.filepath}', '_blank')">${p.filename}</span>
                ${window.canEdit ? `
                </div>
                <button class="p-1 hover:bg-blue-200/50 dark:hover:bg-blue-400/30 rounded transition-colors text-slate-500 dark:text-slate-600"
                    onclick="deletePdf(${p.id})">
                    <span class="material-symbols-outlined text-lg">delete</span>
                </button>` : ''}
            </div>
        `;
        list.appendChild(div);
    });
}

async function deletePdf(id) {
    if (!confirm("PDF löschen?")) return;
    await fetch('/api/delete_pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
    });
    loadPdfList();
}

window.deleteItem = async (id, btn) => {
    if (confirm("Löschen?")) {
        await fetch('/api/delete_inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        loadInventory()
    }
};

document.addEventListener("DOMContentLoaded", async () => {
    await loadGroups();
    await loadInventory();

    const btn = document.getElementById("add-home-row");
    if (btn) {
        btn.onclick = async () => {
            if (inventoryGroups.length === 0) {
                alert("Zuerst eine Gruppe anlegen!");
                return;
            }
            const newItem = {
                gruppe: inventoryGroups[0].name,
                name_id: "NEU-" + Math.floor(1000 + Math.random() * 9000)
            };
            const res = await fetch('/api/add_inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newItem)
            });
            const data = await res.json();
            if (data.success) {
                loadInventory();
            }
        };
    }
});

window.toggleModal = (id, show) => {
    document.getElementById(id).style.display = show ? "flex" : "none";
};