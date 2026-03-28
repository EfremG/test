// ============================================================
// Einkaufsliste – Gemeinsame Einkaufsliste Web-App
// ============================================================
// WICHTIG: Vor dem Start die Firebase-Konfiguration unten eintragen!
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getDatabase, ref, onValue, set, update, remove }
    from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";
import { getAuth, signInAnonymously, onAuthStateChanged }
    from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

// ============================================================
// FIREBASE KONFIGURATION – HIER DEINE WERTE EINTRAGEN
// ============================================================
const firebaseConfig = {
    apiKey: "AIzaSyCUYFbtXVzFpYAjbjOfMocdPd7oVP2KEeU",
    authDomain: "einkaufsliste-73d67.firebaseapp.com",
    databaseURL: "https://einkaufsliste-73d67-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "einkaufsliste-73d67",
    storageBucket: "einkaufsliste-73d67.firebasestorage.app",
    messagingSenderId: "544769872839",
    appId: "1:544769872839:web:d782898b4a8cac560dbfe2"
};
// ============================================================

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// Kategorien
const CATEGORIES = [
    { key: "Obst & Gemüse",   color: "#34c759" },
    { key: "Milchprodukte",    color: "#007aff" },
    { key: "Fleisch & Fisch",  color: "#ff3b30" },
    { key: "Backwaren",        color: "#ff9500" },
    { key: "Getränke",         color: "#5ac8fa" },
    { key: "Haushalt",         color: "#af52de" },
    { key: "Sonstiges",        color: "#8e8e93" },
];

// State
let currentUserId = "";
let items = [];
let selectedCategory = "Sonstiges";
let addedCount = 0;
let currentSwipedRow = null;

// ============================================================
// Listen-ID Verwaltung
// ============================================================
function getListId() {
    let id = localStorage.getItem("listId");
    if (!id) {
        id = generateListId();
        localStorage.setItem("listId", id);
    }
    return id;
}

function setListId(id) {
    localStorage.setItem("listId", id);
}

function generateListId() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
}

// ============================================================
// Firebase Auth
// ============================================================
signInAnonymously(auth).catch(err => {
    console.error("Auth-Fehler:", err);
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserId = user.uid;
        startObserving();
    }
});

// ============================================================
// Firebase Realtime Database
// ============================================================
let currentListener = null;

function startObserving() {
    if (currentListener) {
        // Alten Listener gibt es nicht direkt zum Entfernen bei onValue,
        // aber wir können einfach nochmal aufrufen
    }
    const listId = getListId();
    const itemsRef = ref(db, `lists/${listId}/items`);

    currentListener = onValue(itemsRef, (snapshot) => {
        items = [];
        snapshot.forEach((child) => {
            const val = child.val();
            if (val && val.id && val.name) {
                items.push(val);
            }
        });
        render();
    });
}

function addItem(name, category) {
    const listId = getListId();
    const id = crypto.randomUUID();
    const item = {
        id,
        name: name.trim(),
        category,
        isChecked: false,
        addedBy: currentUserId,
        createdAt: Date.now() / 1000,
        checkedAt: null
    };
    set(ref(db, `lists/${listId}/items/${id}`), item);
}

function toggleItem(item) {
    const listId = getListId();
    const updates = {
        isChecked: !item.isChecked,
        checkedAt: item.isChecked ? null : Date.now() / 1000
    };
    update(ref(db, `lists/${listId}/items/${item.id}`), updates);
}

function deleteItem(item) {
    const listId = getListId();
    remove(ref(db, `lists/${listId}/items/${item.id}`));
}

function deleteCheckedItems() {
    const listId = getListId();
    items.filter(i => i.isChecked).forEach(item => {
        remove(ref(db, `lists/${listId}/items/${item.id}`));
    });
}

function deleteAllItems() {
    const listId = getListId();
    remove(ref(db, `lists/${listId}/items`));
}

// ============================================================
// Rendering
// ============================================================
function render() {
    const container = document.getElementById("list-container");
    const emptyState = document.getElementById("empty-state");

    if (items.length === 0) {
        container.innerHTML = "";
        emptyState.classList.remove("hidden");
        emptyState.querySelector(".empty-list-id").textContent = `Listen-ID: ${getListId()}`;
        return;
    }

    emptyState.classList.add("hidden");

    const unchecked = items.filter(i => !i.isChecked);
    const checked = items.filter(i => i.isChecked).sort((a, b) => (b.checkedAt || 0) - (a.checkedAt || 0));

    // Nach Kategorie gruppieren
    const groups = {};
    CATEGORIES.forEach(cat => { groups[cat.key] = []; });
    unchecked.forEach(item => {
        const key = item.category || "Sonstiges";
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
    });

    // Innerhalb jeder Gruppe nach Erstellungszeit sortieren
    Object.values(groups).forEach(arr => arr.sort((a, b) => a.createdAt - b.createdAt));

    let html = "";

    // Nicht erledigte nach Kategorie
    CATEGORIES.forEach(cat => {
        const catItems = groups[cat.key];
        if (!catItems || catItems.length === 0) return;

        html += `<div class="section">`;
        html += `<div class="section-header">
            <span class="category-label">
                <span class="category-dot" style="background:${cat.color}"></span>
                ${cat.key}
            </span>
        </div>`;
        html += `<div class="card">`;
        catItems.forEach(item => {
            html += renderItemRow(item);
        });
        html += `</div></div>`;
    });

    // Erledigte
    if (checked.length > 0) {
        html += `<div class="section">`;
        html += `<div class="section-header">
            <span class="category-label">
                <span class="category-dot" style="background:var(--green)"></span>
                Erledigt (${checked.length})
            </span>
            <button onclick="window._deleteChecked()">Alle entfernen</button>
        </div>`;
        html += `<div class="card">`;
        checked.forEach(item => {
            html += renderItemRow(item);
        });
        html += `</div></div>`;
    }

    container.innerHTML = html;
    attachSwipeListeners();
}

function renderItemRow(item) {
    const checkedClass = item.isChecked ? "checked" : "";
    const checkSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

    return `<div class="item-row ${checkedClass}" data-id="${item.id}">
        <div class="check-circle">${checkSvg}</div>
        <div class="item-info">
            <div class="item-name">${escapeHtml(item.name)}</div>
            <div class="item-category">${escapeHtml(item.category || "Sonstiges")}</div>
        </div>
        <button class="item-delete" onclick="event.stopPropagation(); window._deleteItem('${item.id}')">Löschen</button>
    </div>`;
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// ============================================================
// Swipe-to-Delete (Touch)
// ============================================================
function attachSwipeListeners() {
    document.querySelectorAll(".item-row").forEach(row => {
        let startX = 0;
        let currentX = 0;
        let swiping = false;

        row.addEventListener("touchstart", (e) => {
            // Schließe vorherige Swipes
            if (currentSwipedRow && currentSwipedRow !== row) {
                currentSwipedRow.classList.remove("swiped");
            }
            startX = e.touches[0].clientX;
            swiping = false;
        }, { passive: true });

        row.addEventListener("touchmove", (e) => {
            currentX = e.touches[0].clientX;
            const diff = startX - currentX;
            if (diff > 30) {
                swiping = true;
                row.classList.add("swiped");
                currentSwipedRow = row;
            } else if (diff < -20) {
                row.classList.remove("swiped");
                currentSwipedRow = null;
            }
        }, { passive: true });

        row.addEventListener("touchend", () => {
            if (!swiping) {
                // Es war ein Tap, kein Swipe
                const id = row.dataset.id;
                const item = items.find(i => i.id === id);
                if (item) toggleItem(item);
            }
        });

        // Desktop: Click zum Abhaken
        row.addEventListener("click", () => {
            const id = row.dataset.id;
            const item = items.find(i => i.id === id);
            if (item) toggleItem(item);
        });
    });

    // Tippen ausserhalb schliesst Swipe
    document.addEventListener("touchstart", (e) => {
        if (currentSwipedRow && !currentSwipedRow.contains(e.target)) {
            currentSwipedRow.classList.remove("swiped");
            currentSwipedRow = null;
        }
    }, { passive: true });
}

// ============================================================
// Globale Funktionen (für onclick im HTML)
// ============================================================
window._deleteItem = function(id) {
    const item = items.find(i => i.id === id);
    if (item) deleteItem(item);
};

window._deleteChecked = function() {
    deleteCheckedItems();
};

// ============================================================
// UI Event Listeners
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
    // Kategorie-Picker (inline Chips) befüllen
    const catList = document.getElementById("category-list");
    const categoryDot = document.getElementById("category-dot");
    const categoryPicker = document.getElementById("category-picker");

    function updateCategoryDot() {
        const cat = CATEGORIES.find(c => c.key === selectedCategory);
        if (cat) categoryDot.style.background = cat.color;
    }

    CATEGORIES.forEach(cat => {
        const chip = document.createElement("div");
        chip.className = `cat-chip${cat.key === selectedCategory ? " selected" : ""}`;
        chip.innerHTML = `<span class="chip-dot" style="background:${cat.color}"></span>${cat.key}`;
        chip.addEventListener("click", () => {
            selectedCategory = cat.key;
            document.querySelectorAll(".cat-chip").forEach(c => c.classList.remove("selected"));
            chip.classList.add("selected");
            updateCategoryDot();
            categoryPicker.classList.add("hidden");
        });
        catList.appendChild(chip);
    });
    updateCategoryDot();

    // Kategorie-Button togglet den Picker
    document.getElementById("btn-category").addEventListener("click", () => {
        categoryPicker.classList.toggle("hidden");
    });

    // Inline Artikel hinzufügen
    const inputName = document.getElementById("input-item-name");
    const btnAddItem = document.getElementById("btn-add-item");

    inputName.addEventListener("input", () => {
        btnAddItem.disabled = !inputName.value.trim();
    });

    function doAddItem() {
        const name = inputName.value.trim();
        if (!name) return;
        addItem(name, selectedCategory);
        inputName.value = "";
        btnAddItem.disabled = true;
    }

    btnAddItem.addEventListener("click", doAddItem);
    inputName.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            doAddItem();
        }
    });

    // Einstellungen Modal
    const modalSettings = document.getElementById("modal-settings");
    const displayListId = document.getElementById("display-list-id");
    const inputJoinId = document.getElementById("input-join-id");

    document.getElementById("btn-settings").addEventListener("click", () => {
        displayListId.textContent = getListId();
        modalSettings.classList.remove("hidden");
    });

    document.getElementById("btn-settings-close").addEventListener("click", () => {
        modalSettings.classList.add("hidden");
    });

    document.getElementById("btn-copy-id").addEventListener("click", () => {
        navigator.clipboard.writeText(getListId()).then(() => {
            const btn = document.getElementById("btn-copy-id");
            btn.textContent = "✓ Kopiert!";
            setTimeout(() => { btn.textContent = "Listen-ID kopieren"; }, 2000);
        });
    });

    document.getElementById("btn-share-id").addEventListener("click", () => {
        const listId = getListId();
        if (navigator.share) {
            navigator.share({ title: "Einkaufsliste", text: `Tritt meiner Einkaufsliste bei! Listen-ID: ${listId}` });
        } else {
            navigator.clipboard.writeText(listId);
            const btn = document.getElementById("btn-share-id");
            btn.textContent = "✓ ID kopiert!";
            setTimeout(() => { btn.textContent = "Listen-ID teilen"; }, 2000);
        }
    });

    inputJoinId.addEventListener("input", () => {
        document.getElementById("btn-join-list").disabled = !inputJoinId.value.trim();
    });

    document.getElementById("btn-join-list").addEventListener("click", () => {
        const id = inputJoinId.value.trim().toUpperCase();
        if (!id) return;
        setListId(id); inputJoinId.value = ""; displayListId.textContent = id;
        startObserving(); modalSettings.classList.add("hidden");
    });

    document.getElementById("btn-new-list").addEventListener("click", () => {
        showConfirm("Neue Liste erstellen?", "Du verlässt die aktuelle Liste und erstellst eine neue.", "Erstellen", false, () => {
            const newId = generateListId(); setListId(newId); displayListId.textContent = newId;
            startObserving(); modalSettings.classList.add("hidden");
        });
    });

    document.getElementById("btn-delete-all").addEventListener("click", () => {
        showConfirm("Alle Artikel löschen?", "Alle Artikel werden unwiderruflich gelöscht. Dies betrifft auch die Liste deines Partners.", "Löschen", true, () => { deleteAllItems(); });
    });

    [modalSettings].forEach(modal => {
        modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.add("hidden"); });
    });
});

// ============================================================
// Bestätigungs-Dialog
// ============================================================
function showConfirm(title, message, okText, isDanger, onOk) {
    const modal = document.getElementById("modal-confirm");
    document.getElementById("confirm-title").textContent = title;
    document.getElementById("confirm-message").textContent = message;

    const btnOk = document.getElementById("btn-confirm-ok");
    btnOk.textContent = okText;
    btnOk.className = isDanger ? "btn-danger" : "btn-primary";

    modal.classList.remove("hidden");

    const cleanup = () => {
        modal.classList.add("hidden");
        btnOk.replaceWith(btnOk.cloneNode(true));
        document.getElementById("btn-confirm-cancel").replaceWith(
            document.getElementById("btn-confirm-cancel").cloneNode(true)
        );
    };

    document.getElementById("btn-confirm-ok").addEventListener("click", () => {
        cleanup();
        onOk();
    });

    document.getElementById("btn-confirm-cancel").addEventListener("click", cleanup);

    modal.addEventListener("click", (e) => {
        if (e.target === modal) cleanup();
    });
}

// ============================================================
// Service Worker Registration (PWA)
// ============================================================
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
}
