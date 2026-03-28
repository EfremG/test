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
    { key: "Obst & Gemüse",             color: "#34c759" },
    { key: "Zutaten & Gewürze",          color: "#ff9500" },
    { key: "Getreideprodukte",           color: "#c69c6d" },
    { key: "Haushalt",                   color: "#af52de" },
    { key: "Brot & Gebäck",             color: "#d4a054" },
    { key: "Fertig- & Tiefkühlprodukte", color: "#5ac8fa" },
    { key: "Fleisch & Fisch",            color: "#ff3b30" },
    { key: "Milch & Käse",              color: "#007aff" },
    { key: "Snacks & Süsswaren",        color: "#ff6b9d" },
    { key: "Pflege & Gesundheit",        color: "#30d158" },
    { key: "Getränke",                   color: "#5ac8fa" },
    { key: "Sonstiges",                  color: "#8e8e93" },
];

// Sortierte Kategorien (wird durch Firebase/localStorage überschrieben)
let sortedCategories = [...CATEGORIES];

function getOrderedCategories() {
    return sortedCategories;
}

function saveCategoryOrder(orderedKeys) {
    const listId = getListId();
    set(ref(db, `lists/${listId}/categoryOrder`), orderedKeys);
}

// Bekannte Läden
const STORES = [
    { name: "Lidl",      icon: "🟡" },
    { name: "Rewe",      icon: "🔴" },
    { name: "Aldi",      icon: "🔵" },
    { name: "Edeka",     icon: "🟡" },
    { name: "Kaufland",  icon: "🔴" },
    { name: "Netto",     icon: "🟡" },
    { name: "Penny",     icon: "🔴" },
    { name: "dm",        icon: "⚪" },
    { name: "Rossmann",  icon: "🔴" },
    { name: "Müller",    icon: "🟣" },
];

// State
let currentUserId = "";
let items = [];
let codes = [];
let selectedCategory = "Sonstiges";
let addedCount = 0;
let currentSwipedRow = null;
let currentViewedCode = null;
let pendingUploadData = null;

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
let currentCodesListener = null;

function startObserving() {
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

    const orderRef = ref(db, `lists/${listId}/categoryOrder`);
    onValue(orderRef, (snapshot) => {
        const order = snapshot.val();
        if (order && Array.isArray(order)) {
            const ordered = [];
            order.forEach(key => {
                const cat = CATEGORIES.find(c => c.key === key);
                if (cat) ordered.push(cat);
            });
            // Neue Kategorien anhängen die nicht in der Sortierung sind
            CATEGORIES.forEach(cat => {
                if (!ordered.find(c => c.key === cat.key)) ordered.push(cat);
            });
            sortedCategories = ordered;
        }
        render();
        buildCategorySortList();
        buildCategoryPicker();
    });

    const codesRef = ref(db, `lists/${listId}/codes`);
    currentCodesListener = onValue(codesRef, (snapshot) => {
        codes = [];
        snapshot.forEach((child) => {
            const val = child.val();
            if (val && val.id && val.imageData) {
                codes.push(val);
            }
        });
        renderCodes();
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
// Codes (Bilder) – Firebase CRUD
// ============================================================
function addCode(name, imageData, store) {
    const listId = getListId();
    const id = crypto.randomUUID();
    const code = {
        id,
        name: name.trim(),
        imageData,
        store: store || "Sonstiges",
        addedBy: currentUserId,
        createdAt: Date.now() / 1000
    };
    set(ref(db, `lists/${listId}/codes/${id}`), code);
}

function deleteCode(codeItem) {
    const listId = getListId();
    remove(ref(db, `lists/${listId}/codes/${codeItem.id}`));
}

function resizeImage(file, maxWidth, maxHeight) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let w = img.width;
                let h = img.height;
                if (w > maxWidth || h > maxHeight) {
                    const ratio = Math.min(maxWidth / w, maxHeight / h);
                    w = Math.round(w * ratio);
                    h = Math.round(h * ratio);
                }
                const canvas = document.createElement("canvas");
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL("image/jpeg", 0.7));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
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
    const cats = getOrderedCategories();
    const groups = {};
    cats.forEach(cat => { groups[cat.key] = []; });
    unchecked.forEach(item => {
        const key = item.category || "Sonstiges";
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
    });

    // Innerhalb jeder Gruppe nach Erstellungszeit sortieren
    Object.values(groups).forEach(arr => arr.sort((a, b) => a.createdAt - b.createdAt));

    let html = "";

    // Nicht erledigte nach Kategorie
    cats.forEach(cat => {
        const catItems = groups[cat.key];
        if (!catItems || catItems.length === 0) return;

        html += `<div class="section" data-cat-key="${cat.key}">`;
        html += `<div class="section-header" data-cat-key="${cat.key}">
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
    attachSectionDrag(container);
}

function renderCodes() {
    const container = document.getElementById("codes-list");
    const emptyState = document.getElementById("codes-empty");
    if (!container) return;

    if (codes.length === 0) {
        container.innerHTML = "";
        emptyState.classList.remove("hidden");
        return;
    }

    emptyState.classList.add("hidden");

    // Nach Laden gruppieren
    const groups = {};
    codes.forEach(code => {
        const store = code.store || "Sonstiges";
        if (!groups[store]) groups[store] = [];
        groups[store].push(code);
    });

    // Innerhalb jeder Gruppe nach Datum sortieren
    Object.values(groups).forEach(arr => arr.sort((a, b) => b.createdAt - a.createdAt));

    // Laden-Namen sortieren
    const storeNames = Object.keys(groups).sort((a, b) => a.localeCompare(b, "de"));

    let html = "";
    storeNames.forEach(store => {
        const storeInfo = STORES.find(s => s.name === store);
        const icon = storeInfo ? storeInfo.icon : "🏪";
        html += `<div class="store-group">`;
        html += `<div class="store-group-header">
            <span>${icon}</span>
            ${escapeHtml(store)}
            <span class="store-badge">${groups[store].length}</span>
        </div>`;
        html += `<div class="codes-grid">`;
        groups[store].forEach(code => {
            const date = new Date(code.createdAt * 1000);
            const dateStr = `${date.getDate()}.${date.getMonth() + 1}.`;
            html += `<div class="code-card" onclick="window._viewCode('${code.id}')">
                <img src="${code.imageData}" alt="${escapeHtml(code.name)}" loading="lazy">
                <div class="code-card-info">
                    <span class="code-card-name">${escapeHtml(code.name)}</span>
                    <span class="code-card-date">${dateStr}</span>
                </div>
            </div>`;
        });
        html += `</div></div>`;
    });
    container.innerHTML = html;
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

        row.addEventListener("touchend", (e) => {
            // Wenn auf den Löschen-Button getippt wurde, nicht togglen
            if (e.target.closest(".item-delete")) return;
            if (!swiping) {
                // Wenn die Row geswiped ist, Swipe schliessen statt togglen
                if (row.classList.contains("swiped")) {
                    row.classList.remove("swiped");
                    currentSwipedRow = null;
                    return;
                }
                const id = row.dataset.id;
                const item = items.find(i => i.id === id);
                if (item) toggleItem(item);
            }
        });

        // Desktop: Click zum Abhaken
        row.addEventListener("click", (e) => {
            if (e.target.closest(".item-delete")) return;
            const id = row.dataset.id;
            const item = items.find(i => i.id === id);
            if (item) toggleItem(item);
        });

        // Löschen-Button Touch-Handler
        const deleteBtn = row.querySelector(".item-delete");
        if (deleteBtn) {
            deleteBtn.addEventListener("touchend", (e) => {
                e.stopPropagation();
                e.preventDefault();
                const id = row.dataset.id;
                const item = items.find(i => i.id === id);
                if (item) deleteItem(item);
            });
        }
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
// Kategorien sortieren (Drag & Drop)
// ============================================================
function buildCategorySortList() {
    const container = document.getElementById("category-sort-list");
    if (!container) return;
    container.innerHTML = "";

    const cats = getOrderedCategories();
    cats.forEach(cat => {
        const item = document.createElement("div");
        item.className = "category-sort-item";
        item.dataset.key = cat.key;
        item.innerHTML = `<span class="sort-dot" style="background:${cat.color}"></span>
            <span class="sort-name">${cat.key}</span>
            <span class="sort-handle">≡</span>`;
        container.appendChild(item);
    });

    initLongPressDrag(container);
}

function initLongPressDrag(container) {
    let dragItem = null;
    let placeholder = null;
    let offsetY = 0;
    let longPressTimer = null;
    let isDragging = false;
    let touchStartY = 0;

    container.querySelectorAll(".category-sort-item").forEach(item => {
        item.addEventListener("touchstart", (e) => {
            touchStartY = e.touches[0].clientY;
            // Long Press: 400ms halten zum Aktivieren
            longPressTimer = setTimeout(() => {
                isDragging = true;
                dragItem = item;
                const rect = dragItem.getBoundingClientRect();
                offsetY = touchStartY - rect.top;

                // Vibration als Feedback
                if (navigator.vibrate) navigator.vibrate(30);

                // Placeholder erstellen
                placeholder = document.createElement("div");
                placeholder.className = "drag-placeholder";
                placeholder.style.height = rect.height + "px";
                dragItem.parentNode.insertBefore(placeholder, dragItem);

                // Drag-Element positionieren
                dragItem.classList.add("dragging");
                dragItem.style.position = "fixed";
                dragItem.style.left = rect.left + "px";
                dragItem.style.width = rect.width + "px";
                dragItem.style.top = (touchStartY - offsetY) + "px";
            }, 400);
        }, { passive: true });

        item.addEventListener("touchmove", (e) => {
            const y = e.touches[0].clientY;
            // Wenn noch nicht im Drag-Modus und Finger sich bewegt hat, Long Press abbrechen
            if (!isDragging) {
                if (Math.abs(y - touchStartY) > 10) {
                    clearTimeout(longPressTimer);
                }
                return;
            }
            e.preventDefault();
            dragItem.style.top = (y - offsetY) + "px";

            // Placeholder verschieben
            const siblings = [...container.querySelectorAll(".category-sort-item:not(.dragging)")];
            let insertBefore = null;
            for (const sib of siblings) {
                const sibRect = sib.getBoundingClientRect();
                if (y < sibRect.top + sibRect.height / 2) {
                    insertBefore = sib;
                    break;
                }
            }
            if (insertBefore) {
                container.insertBefore(placeholder, insertBefore);
            } else {
                container.appendChild(placeholder);
            }
        }, { passive: false });

        item.addEventListener("touchend", () => {
            clearTimeout(longPressTimer);
            if (!isDragging || !dragItem) {
                isDragging = false;
                return;
            }

            // Element an Placeholder-Position einfügen
            container.insertBefore(dragItem, placeholder);
            placeholder.remove();

            dragItem.classList.remove("dragging");
            dragItem.style.position = "";
            dragItem.style.left = "";
            dragItem.style.width = "";
            dragItem.style.top = "";
            dragItem = null;
            placeholder = null;
            isDragging = false;

            // Neue Reihenfolge speichern
            const newOrder = [...container.querySelectorAll(".category-sort-item")]
                .map(el => el.dataset.key);
            sortedCategories = newOrder.map(key => CATEGORIES.find(c => c.key === key)).filter(Boolean);
            saveCategoryOrder(newOrder);
            render();
            buildCategoryPicker();
        });

        item.addEventListener("touchcancel", () => {
            clearTimeout(longPressTimer);
            if (dragItem) {
                container.insertBefore(dragItem, placeholder);
                placeholder.remove();
                dragItem.classList.remove("dragging");
                dragItem.style.position = "";
                dragItem.style.left = "";
                dragItem.style.width = "";
                dragItem.style.top = "";
            }
            dragItem = null;
            placeholder = null;
            isDragging = false;
        });
    });
}

function attachSectionDrag(listContainer) {
    const sections = listContainer.querySelectorAll(".section[data-cat-key]");
    if (sections.length < 2) return;

    let dragSection = null;
    let placeholder = null;
    let offsetY = 0;
    let longPressTimer = null;
    let isDragging = false;
    let touchStartY = 0;

    sections.forEach(section => {
        const header = section.querySelector(".section-header");
        if (!header) return;

        header.addEventListener("touchstart", (e) => {
            touchStartY = e.touches[0].clientY;
            longPressTimer = setTimeout(() => {
                isDragging = true;
                dragSection = section;
                const rect = section.getBoundingClientRect();
                offsetY = touchStartY - rect.top;

                if (navigator.vibrate) navigator.vibrate(30);

                placeholder = document.createElement("div");
                placeholder.className = "section-placeholder";
                placeholder.style.height = rect.height + "px";
                section.parentNode.insertBefore(placeholder, section);

                dragSection.classList.add("section-dragging");
                dragSection.style.position = "fixed";
                dragSection.style.left = rect.left + "px";
                dragSection.style.width = rect.width + "px";
                dragSection.style.top = (touchStartY - offsetY) + "px";
                dragSection.style.zIndex = "50";
            }, 400);
        }, { passive: true });

        header.addEventListener("touchmove", (e) => {
            const y = e.touches[0].clientY;
            if (!isDragging) {
                if (Math.abs(y - touchStartY) > 10) {
                    clearTimeout(longPressTimer);
                }
                return;
            }
            e.preventDefault();
            dragSection.style.top = (y - offsetY) + "px";

            const siblings = [...listContainer.querySelectorAll(".section[data-cat-key]:not(.section-dragging)")];
            let insertBefore = null;
            for (const sib of siblings) {
                const sibRect = sib.getBoundingClientRect();
                if (y < sibRect.top + sibRect.height / 2) {
                    insertBefore = sib;
                    break;
                }
            }
            if (insertBefore) {
                listContainer.insertBefore(placeholder, insertBefore);
            } else {
                // Vor dem "Erledigt"-Bereich einfügen, falls vorhanden
                const erledigt = listContainer.querySelector(".section:not([data-cat-key])");
                if (erledigt) {
                    listContainer.insertBefore(placeholder, erledigt);
                } else {
                    listContainer.appendChild(placeholder);
                }
            }
        }, { passive: false });

        header.addEventListener("touchend", () => {
            clearTimeout(longPressTimer);
            if (!isDragging || !dragSection) {
                isDragging = false;
                return;
            }

            listContainer.insertBefore(dragSection, placeholder);
            placeholder.remove();

            dragSection.classList.remove("section-dragging");
            dragSection.style.position = "";
            dragSection.style.left = "";
            dragSection.style.width = "";
            dragSection.style.top = "";
            dragSection.style.zIndex = "";
            dragSection = null;
            placeholder = null;
            isDragging = false;

            // Neue Reihenfolge aus der Liste lesen
            const visibleOrder = [...listContainer.querySelectorAll(".section[data-cat-key]")]
                .map(el => el.dataset.catKey);
            // Nicht sichtbare Kategorien ans Ende anhängen
            const fullOrder = [...visibleOrder];
            getOrderedCategories().forEach(cat => {
                if (!fullOrder.includes(cat.key)) fullOrder.push(cat.key);
            });
            sortedCategories = fullOrder.map(key => CATEGORIES.find(c => c.key === key)).filter(Boolean);
            saveCategoryOrder(fullOrder);
            buildCategorySortList();
            buildCategoryPicker();
        });

        header.addEventListener("touchcancel", () => {
            clearTimeout(longPressTimer);
            if (dragSection) {
                listContainer.insertBefore(dragSection, placeholder);
                placeholder.remove();
                dragSection.classList.remove("section-dragging");
                dragSection.style.position = "";
                dragSection.style.left = "";
                dragSection.style.width = "";
                dragSection.style.top = "";
                dragSection.style.zIndex = "";
            }
            dragSection = null;
            placeholder = null;
            isDragging = false;
        });
    });
}

function buildCategoryPicker() {
    const catList = document.getElementById("category-list");
    if (!catList) return;
    catList.innerHTML = "";
    const cats = getOrderedCategories();
    cats.forEach(cat => {
        const opt = document.createElement("div");
        opt.className = `category-option${cat.key === selectedCategory ? " selected" : ""}`;
        opt.innerHTML = `<span class="cat-dot" style="background:${cat.color}"></span>
            <span>${cat.key}</span>
            <span class="cat-check">✓</span>`;
        opt.addEventListener("click", () => {
            selectedCategory = cat.key;
            document.querySelectorAll(".category-option").forEach(o => o.classList.remove("selected"));
            opt.classList.add("selected");
        });
        catList.appendChild(opt);
    });
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

window._viewCode = function(id) {
    const code = codes.find(c => c.id === id);
    if (!code) return;
    currentViewedCode = code;
    const modal = document.getElementById("modal-image");
    document.getElementById("image-fullview").src = code.imageData;
    const store = code.store || "";
    document.getElementById("image-title").textContent = store ? `${store} – ${code.name}` : code.name;
    modal.classList.remove("hidden");
};

// ============================================================
// UI Event Listeners
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
    // Kategorie-Picker und Sortierliste initial befüllen
    buildCategoryPicker();
    buildCategorySortList();

    // Artikel hinzufügen Modal
    const modalAdd = document.getElementById("modal-add");
    const inputName = document.getElementById("input-item-name");
    const btnAddItem = document.getElementById("btn-add-item");
    const addedCountEl = document.getElementById("added-count");

    document.getElementById("btn-add").addEventListener("click", () => {
        modalAdd.classList.remove("hidden");
        addedCount = 0;
        addedCountEl.classList.add("hidden");
        setTimeout(() => inputName.focus(), 100);
    });

    document.getElementById("btn-add-close").addEventListener("click", () => {
        modalAdd.classList.add("hidden");
        inputName.value = "";
    });

    inputName.addEventListener("input", () => {
        btnAddItem.disabled = !inputName.value.trim();
    });

    function doAddItem() {
        const name = inputName.value.trim();
        if (!name) return;
        addItem(name, selectedCategory);
        inputName.value = "";
        btnAddItem.disabled = true;
        addedCount++;
        addedCountEl.textContent = `✓ ${addedCount} Artikel hinzugefügt`;
        addedCountEl.classList.remove("hidden");
        inputName.focus();
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

    // Listen-ID kopieren
    document.getElementById("btn-copy-id").addEventListener("click", () => {
        navigator.clipboard.writeText(getListId()).then(() => {
            const btn = document.getElementById("btn-copy-id");
            btn.textContent = "✓ Kopiert!";
            setTimeout(() => { btn.textContent = "Listen-ID kopieren"; }, 2000);
        });
    });

    // Listen-ID teilen
    document.getElementById("btn-share-id").addEventListener("click", () => {
        const listId = getListId();
        if (navigator.share) {
            navigator.share({
                title: "Einkaufsliste",
                text: `Tritt meiner Einkaufsliste bei! Listen-ID: ${listId}`,
            });
        } else {
            navigator.clipboard.writeText(listId);
            const btn = document.getElementById("btn-share-id");
            btn.textContent = "✓ ID kopiert!";
            setTimeout(() => { btn.textContent = "Listen-ID teilen"; }, 2000);
        }
    });

    // Liste beitreten
    inputJoinId.addEventListener("input", () => {
        document.getElementById("btn-join-list").disabled = !inputJoinId.value.trim();
    });

    document.getElementById("btn-join-list").addEventListener("click", () => {
        const id = inputJoinId.value.trim().toUpperCase();
        if (!id) return;
        setListId(id);
        inputJoinId.value = "";
        displayListId.textContent = id;
        startObserving();
        modalSettings.classList.add("hidden");
    });

    // Neue Liste
    document.getElementById("btn-new-list").addEventListener("click", () => {
        showConfirm(
            "Neue Liste erstellen?",
            "Du verlässt die aktuelle Liste und erstellst eine neue.",
            "Erstellen",
            false,
            () => {
                const newId = generateListId();
                setListId(newId);
                displayListId.textContent = newId;
                startObserving();
                modalSettings.classList.add("hidden");
            }
        );
    });

    // Alle löschen
    document.getElementById("btn-delete-all").addEventListener("click", () => {
        showConfirm(
            "Alle Artikel löschen?",
            "Alle Artikel werden unwiderruflich gelöscht. Dies betrifft auch die Liste deines Partners.",
            "Löschen",
            true,
            () => {
                deleteAllItems();
            }
        );
    });

    // Codes Modal
    const modalCodes = document.getElementById("modal-codes");

    document.getElementById("btn-codes").addEventListener("click", () => {
        modalCodes.classList.remove("hidden");
    });

    document.getElementById("btn-codes-close").addEventListener("click", () => {
        modalCodes.classList.add("hidden");
    });

    // Code-Upload: Bild wählen -> resizen -> Laden-Auswahl zeigen -> speichern
    const inputUpload = document.getElementById("input-code-upload");
    const modalStore = document.getElementById("modal-store");
    const storeList = document.getElementById("store-list");
    const inputStoreCustom = document.getElementById("input-store-custom");
    const btnStoreCustomOk = document.getElementById("btn-store-custom-ok");

    // Laden-Liste befüllen
    STORES.forEach(store => {
        const btn = document.createElement("button");
        btn.className = "store-option";
        btn.innerHTML = `<span class="store-icon">${store.icon}</span> ${store.name}`;
        btn.addEventListener("click", () => {
            finishUpload(store.name);
        });
        storeList.appendChild(btn);
    });

    inputStoreCustom.addEventListener("input", () => {
        btnStoreCustomOk.disabled = !inputStoreCustom.value.trim();
    });

    btnStoreCustomOk.addEventListener("click", () => {
        const name = inputStoreCustom.value.trim();
        if (name) finishUpload(name);
    });

    document.getElementById("btn-store-close").addEventListener("click", () => {
        modalStore.classList.add("hidden");
        pendingUploadData = null;
    });

    modalStore.addEventListener("click", (e) => {
        if (e.target === modalStore) {
            modalStore.classList.add("hidden");
            pendingUploadData = null;
        }
    });

    function finishUpload(storeName) {
        if (!pendingUploadData) return;
        addCode(pendingUploadData.name, pendingUploadData.imageData, storeName);
        pendingUploadData = null;
        modalStore.classList.add("hidden");
        inputStoreCustom.value = "";
        const btn = document.getElementById("btn-upload-code");
        btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Bild hochladen`;
        btn.disabled = false;
    }

    document.getElementById("btn-upload-code").addEventListener("click", () => {
        inputUpload.click();
    });

    inputUpload.addEventListener("change", async () => {
        const file = inputUpload.files[0];
        if (!file) return;
        const btn = document.getElementById("btn-upload-code");
        btn.textContent = "Bild wird vorbereitet...";
        btn.disabled = true;
        const imageData = await resizeImage(file, 1200, 1200);
        const name = file.name.replace(/\.[^.]+$/, "") || "Code";
        pendingUploadData = { name, imageData };
        inputUpload.value = "";
        // Laden-Auswahl zeigen
        modalStore.classList.remove("hidden");
    });

    // Bild-Vollansicht
    const modalImage = document.getElementById("modal-image");
    document.getElementById("btn-image-close").addEventListener("click", () => {
        modalImage.classList.add("hidden");
        currentViewedCode = null;
    });

    document.getElementById("btn-image-delete").addEventListener("click", () => {
        if (!currentViewedCode) return;
        showConfirm("Bild löschen?", "Das Bild wird unwiderruflich gelöscht.", "Löschen", true, () => {
            deleteCode(currentViewedCode);
            modalImage.classList.add("hidden");
            currentViewedCode = null;
        });
    });

    modalImage.addEventListener("click", (e) => {
        if (e.target === modalImage) {
            modalImage.classList.add("hidden");
            currentViewedCode = null;
        }
    });

    // Modale schliessen bei Klick auf Hintergrund
    [modalAdd, modalSettings, modalCodes].forEach(modal => {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                modal.classList.add("hidden");
            }
        });
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
