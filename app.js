import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getDatabase, ref, onValue, set, update, remove } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCUYFbtXVzFpYAjbjOfMocdPd7oVP2KEeU",
    authDomain: "einkaufsliste-73d67.firebaseapp.com",
    databaseURL: "https://einkaufsliste-73d67-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "einkaufsliste-73d67",
    storageBucket: "einkaufsliste-73d67.firebasestorage.app",
    messagingSenderId: "544769872839",
    appId: "1:544769872839:web:d782898b4a8cac560dbfe2"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

const CATEGORIES = [
    { key: "Obst & Gem\u00fcse", color: "#34c759" },
    { key: "Milchprodukte", color: "#007aff" },
    { key: "Fleisch & Fisch", color: "#ff3b30" },
    { key: "Backwaren", color: "#ff9500" },
    { key: "Getr\u00e4nke", color: "#5ac8fa" },
    { key: "Haushalt", color: "#af52de" },
    { key: "Sonstiges", color: "#8e8e93" },
];

let currentUserId = "";
let items = [];
let selectedCategory = "Sonstiges";
let addedCount = 0;
let currentSwipedRow = null;

function getListId() {
    let id = localStorage.getItem("listId");
    if (!id) { id = generateListId(); localStorage.setItem("listId", id); }
    return id;
}
function setListId(id) { localStorage.setItem("listId", id); }
function generateListId() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let r = ""; for (let i = 0; i < 6; i++) r += chars[Math.floor(Math.random() * chars.length)];
    return r;
}

signInAnonymously(auth).catch(err => console.error("Auth-Fehler:", err));
onAuthStateChanged(auth, (user) => { if (user) { currentUserId = user.uid; startObserving(); } });

let currentListener = null;
function startObserving() {
    const listId = getListId();
    const itemsRef = ref(db, `lists/${listId}/items`);
    currentListener = onValue(itemsRef, (snapshot) => {
        items = [];
        snapshot.forEach((child) => { const val = child.val(); if (val && val.id && val.name) items.push(val); });
        render();
    });
}

function addItem(name, category) {
    const listId = getListId();
    const id = crypto.randomUUID();
    set(ref(db, `lists/${listId}/items/${id}`), {
        id, name: name.trim(), category, isChecked: false,
        addedBy: currentUserId, createdAt: Date.now() / 1000, checkedAt: null
    });
}
function toggleItem(item) {
    const listId = getListId();
    update(ref(db, `lists/${listId}/items/${item.id}`), {
        isChecked: !item.isChecked, checkedAt: item.isChecked ? null : Date.now() / 1000
    });
}
function deleteItem(item) { remove(ref(db, `lists/${getListId()}/items/${item.id}`)); }
function deleteCheckedItems() { items.filter(i => i.isChecked).forEach(item => remove(ref(db, `lists/${getListId()}/items/${item.id}`))); }
function deleteAllItems() { remove(ref(db, `lists/${getListId()}/items`)); }

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
    const groups = {};
    CATEGORIES.forEach(cat => { groups[cat.key] = []; });
    unchecked.forEach(item => {
        const key = item.category || "Sonstiges";
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
    });
    Object.values(groups).forEach(arr => arr.sort((a, b) => a.createdAt - b.createdAt));
    let html = "";
    CATEGORIES.forEach(cat => {
        const catItems = groups[cat.key];
        if (!catItems || catItems.length === 0) return;
        html += `<div class="section"><div class="section-header"><span class="category-label"><span class="category-dot" style="background:${cat.color}"></span>${cat.key}</span></div><div class="card">`;
        catItems.forEach(item => { html += renderItemRow(item); });
        html += `</div></div>`;
    });
    if (checked.length > 0) {
        html += `<div class="section"><div class="section-header"><span class="category-label"><span class="category-dot" style="background:var(--green)"></span>Erledigt (${checked.length})</span><button onclick="window._deleteChecked()">Alle entfernen</button></div><div class="card">`;
        checked.forEach(item => { html += renderItemRow(item); });
        html += `</div></div>`;
    }
    container.innerHTML = html;
    attachSwipeListeners();
}

function renderItemRow(item) {
    const checkedClass = item.isChecked ? "checked" : "";
    const checkSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
    return `<div class="item-row ${checkedClass}" data-id="${item.id}"><div class="check-circle">${checkSvg}</div><div class="item-info"><div class="item-name">${escapeHtml(item.name)}</div><div class="item-category">${escapeHtml(item.category || "Sonstiges")}</div></div><button class="item-delete" onclick="event.stopPropagation(); window._deleteItem('${item.id}')">L\u00f6schen</button></div>`;
}

function escapeHtml(text) { const div = document.createElement("div"); div.textContent = text; return div.innerHTML; }

function attachSwipeListeners() {
    document.querySelectorAll(".item-row").forEach(row => {
        let startX = 0, swiping = false;
        row.addEventListener("touchstart", (e) => {
            if (currentSwipedRow && currentSwipedRow !== row) currentSwipedRow.classList.remove("swiped");
            startX = e.touches[0].clientX; swiping = false;
        }, { passive: true });
        row.addEventListener("touchmove", (e) => {
            const diff = startX - e.touches[0].clientX;
            if (diff > 30) { swiping = true; row.classList.add("swiped"); currentSwipedRow = row; }
            else if (diff < -20) { row.classList.remove("swiped"); currentSwipedRow = null; }
        }, { passive: true });
        row.addEventListener("touchend", () => {
            if (!swiping) { const item = items.find(i => i.id === row.dataset.id); if (item) toggleItem(item); }
        });
        row.addEventListener("click", () => { const item = items.find(i => i.id === row.dataset.id); if (item) toggleItem(item); });
    });
    document.addEventListener("touchstart", (e) => {
        if (currentSwipedRow && !currentSwipedRow.contains(e.target)) { currentSwipedRow.classList.remove("swiped"); currentSwipedRow = null; }
    }, { passive: true });
}

window._deleteItem = function(id) { const item = items.find(i => i.id === id); if (item) deleteItem(item); };
window._deleteChecked = function() { deleteCheckedItems(); };

document.addEventListener("DOMContentLoaded", () => {
    const catList = document.getElementById("category-list");
    CATEGORIES.forEach(cat => {
        const opt = document.createElement("div");
        opt.className = `category-option${cat.key === selectedCategory ? " selected" : ""}`;
        opt.innerHTML = `<span class="cat-dot" style="background:${cat.color}"></span><span>${cat.key}</span><span class="cat-check">\u2713</span>`;
        opt.addEventListener("click", () => {
            selectedCategory = cat.key;
            document.querySelectorAll(".category-option").forEach(o => o.classList.remove("selected"));
            opt.classList.add("selected");
        });
        catList.appendChild(opt);
    });
    const modalAdd = document.getElementById("modal-add");
    const inputName = document.getElementById("input-item-name");
    const btnAddItem = document.getElementById("btn-add-item");
    const addedCountEl = document.getElementById("added-count");
    document.getElementById("btn-add").addEventListener("click", () => {
        modalAdd.classList.remove("hidden"); addedCount = 0; addedCountEl.classList.add("hidden");
        setTimeout(() => inputName.focus(), 100);
    });
    document.getElementById("btn-add-close").addEventListener("click", () => { modalAdd.classList.add("hidden"); inputName.value = ""; });
    inputName.addEventListener("input", () => { btnAddItem.disabled = !inputName.value.trim(); });
    function doAddItem() {
        const name = inputName.value.trim(); if (!name) return;
        addItem(name, selectedCategory); inputName.value = ""; btnAddItem.disabled = true;
        addedCount++; addedCountEl.textContent = `\u2713 ${addedCount} Artikel hinzugef\u00fcgt`;
        addedCountEl.classList.remove("hidden"); inputName.focus();
    }
    btnAddItem.addEventListener("click", doAddItem);
    inputName.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); doAddItem(); } });
    const modalSettings = document.getElementById("modal-settings");
    const displayListId = document.getElementById("display-list-id");
    const inputJoinId = document.getElementById("input-join-id");
    document.getElementById("btn-settings").addEventListener("click", () => { displayListId.textContent = getListId(); modalSettings.classList.remove("hidden"); });
    document.getElementById("btn-settings-close").addEventListener("click", () => { modalSettings.classList.add("hidden"); });
    document.getElementById("btn-copy-id").addEventListener("click", () => {
        navigator.clipboard.writeText(getListId()).then(() => {
            const btn = document.getElementById("btn-copy-id"); btn.textContent = "\u2713 Kopiert!";
            setTimeout(() => { btn.textContent = "Listen-ID kopieren"; }, 2000);
        });
    });
    document.getElementById("btn-share-id").addEventListener("click", () => {
        const listId = getListId();
        if (navigator.share) { navigator.share({ title: "Einkaufsliste", text: `Tritt meiner Einkaufsliste bei! Listen-ID: ${listId}` }); }
        else { navigator.clipboard.writeText(listId); const btn = document.getElementById("btn-share-id"); btn.textContent = "\u2713 ID kopiert!"; setTimeout(() => { btn.textContent = "Listen-ID teilen"; }, 2000); }
    });
    inputJoinId.addEventListener("input", () => { document.getElementById("btn-join-list").disabled = !inputJoinId.value.trim(); });
    document.getElementById("btn-join-list").addEventListener("click", () => {
        const id = inputJoinId.value.trim().toUpperCase(); if (!id) return;
        setListId(id); inputJoinId.value = ""; displayListId.textContent = id; startObserving(); modalSettings.classList.add("hidden");
    });
    document.getElementById("btn-new-list").addEventListener("click", () => {
        showConfirm("Neue Liste erstellen?", "Du verl\u00e4sst die aktuelle Liste und erstellst eine neue.", "Erstellen", false, () => {
            const newId = generateListId(); setListId(newId); displayListId.textContent = newId; startObserving(); modalSettings.classList.add("hidden");
        });
    });
    document.getElementById("btn-delete-all").addEventListener("click", () => {
        showConfirm("Alle Artikel l\u00f6schen?", "Alle Artikel werden unwiderruflich gel\u00f6scht. Dies betrifft auch die Liste deines Partners.", "L\u00f6schen", true, () => { deleteAllItems(); });
    });
    [modalAdd, modalSettings].forEach(modal => { modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.add("hidden"); }); });
});

function showConfirm(title, message, okText, isDanger, onOk) {
    const modal = document.getElementById("modal-confirm");
    document.getElementById("confirm-title").textContent = title;
    document.getElementById("confirm-message").textContent = message;
    const btnOk = document.getElementById("btn-confirm-ok");
    btnOk.textContent = okText; btnOk.className = isDanger ? "btn-danger" : "btn-primary";
    modal.classList.remove("hidden");
    const cleanup = () => { modal.classList.add("hidden"); btnOk.replaceWith(btnOk.cloneNode(true)); document.getElementById("btn-confirm-cancel").replaceWith(document.getElementById("btn-confirm-cancel").cloneNode(true)); };
    document.getElementById("btn-confirm-ok").addEventListener("click", () => { cleanup(); onOk(); });
    document.getElementById("btn-confirm-cancel").addEventListener("click", cleanup);
    modal.addEventListener("click", (e) => { if (e.target === modal) cleanup(); });
}

if ("serviceWorker" in navigator) { navigator.serviceWorker.register("sw.js").catch(() => {}); }