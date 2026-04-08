(function () {
    const NOTES_ITEMS_KEY = "workspaceNotesItemsV2";
    const DEMO_SESSION_ID_KEY = "demo_session_id";
    const MAX_NOTES = 60;
    const QUOTE_COMPARE_STATE_KEY = "quote_compare_state_v1";
    const SHARED_DATA_SCOPE_KEY = "shared_analysis_scope_v1";
    const NOTE_SECTIONS = [
        { id: "quick_notes", title: "Quick Notes" },
        { id: "supplier_notes", title: "Supplier Notes" },
        { id: "follow_up_items", title: "Follow-Up Items" },
        { id: "negotiation_reminders", title: "Negotiation Reminders" }
    ];

    function getAuthUserStorageSuffix() {
        const rawUserId = String(document.body?.dataset?.authUserId || "").trim();
        return rawUserId || "anonymous";
    }

    function createDemoSessionId() {
        if (window.crypto?.randomUUID) {
            return window.crypto.randomUUID();
        }
        return `demo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function getStoredDemoSessionId() {
        try {
            return String(window.localStorage.getItem(DEMO_SESSION_ID_KEY) || "").trim();
        } catch (error) {
            return "";
        }
    }

    function getOrCreateDemoSessionId() {
        const existingId = getStoredDemoSessionId();
        if (existingId) {
            return existingId;
        }
        const nextId = createDemoSessionId();
        try {
            window.localStorage.setItem(DEMO_SESSION_ID_KEY, nextId);
        } catch (error) {
            return nextId;
        }
        return nextId;
    }

    function readSharedDataScope() {
        const fallbackScope = document.body?.dataset?.demoMode === "true" ? "demo" : "current_upload";
        const fallbackDemoSessionId = fallbackScope === "demo" ? getOrCreateDemoSessionId() : "";
        try {
            const rawValue = String(window.sessionStorage.getItem(SHARED_DATA_SCOPE_KEY) || "").trim();
            if (!rawValue) {
                return {
                    scope: fallbackScope,
                    session_id: fallbackDemoSessionId
                };
            }
            const parsed = JSON.parse(rawValue);
            if (parsed && typeof parsed === "object") {
                const parsedScope = String(parsed.scope || "current_upload").trim() || "current_upload";
                const parsedSessionId = String(parsed.session_id || "").trim();
                if (fallbackScope === "demo" && parsedScope !== "demo") {
                    return {
                        scope: "demo",
                        session_id: getOrCreateDemoSessionId()
                    };
                }
                return {
                    scope: parsedScope,
                    session_id: parsedScope === "demo" ? (parsedSessionId || getOrCreateDemoSessionId()) : parsedSessionId
                };
            }
        } catch (error) {
            return {
                scope: fallbackScope,
                session_id: fallbackDemoSessionId
            };
        }
        return {
            scope: fallbackScope,
            session_id: fallbackDemoSessionId
        };
    }

    function getScopedStorageKey(baseKey) {
        const sharedScope = readSharedDataScope();
        if (sharedScope.scope === "demo") {
            return `${baseKey}:demo:${sharedScope.session_id || getOrCreateDemoSessionId()}`;
        }
        return `${baseKey}:${getAuthUserStorageSuffix()}`;
    }

    function getNotesItemsStorageKey() {
        return getScopedStorageKey(NOTES_ITEMS_KEY);
    }

    function getAnalysisScopeBootstrapCacheStore() {
        if (!window.__analysisScopeBootstrapCache || typeof window.__analysisScopeBootstrapCache !== "object") {
            window.__analysisScopeBootstrapCache = {};
        }
        return window.__analysisScopeBootstrapCache;
    }

    function setCachedAnalysisScopeBootstrap(scope, payload) {
        const normalizedScope = String(scope || "current_upload").trim() || "current_upload";
        const store = getAnalysisScopeBootstrapCacheStore();
        store[normalizedScope] = {
            data: payload,
            timestamp: performance.now(),
            promise: null
        };
    }

    async function getCachedAnalysisScopeBootstrap(scope = "current_upload", { force = false, maxAgeMs = 5000 } = {}) {
        const normalizedScope = String(scope || "current_upload").trim() || "current_upload";
        const store = getAnalysisScopeBootstrapCacheStore();
        const cachedEntry = store[normalizedScope];
        const now = performance.now();
        if (!force && cachedEntry?.data && (now - Number(cachedEntry.timestamp || 0)) <= maxAgeMs) {
            console.info("[notes scope bootstrap cache hit]", {
                scope: normalizedScope,
                ageMs: Number((now - Number(cachedEntry.timestamp || 0)).toFixed(1))
            });
            return cachedEntry.data;
        }
        if (!force && cachedEntry?.promise) {
            console.info("[notes scope bootstrap shared inflight]", {
                scope: normalizedScope
            });
            return cachedEntry.promise;
        }
        const query = normalizedScope ? `?scope=${encodeURIComponent(normalizedScope)}` : "";
        const fetchStartedAt = performance.now();
        console.info("[notes scope bootstrap fetch start]", {
            scope: normalizedScope
        });
        const requestPromise = fetch(`/analysis/scope-bootstrap${query}`, {
            headers: { Accept: "application/json" }
        })
            .then((response) => response.json())
            .then((payload) => {
                setCachedAnalysisScopeBootstrap(normalizedScope, payload);
                console.info("[notes scope bootstrap fetch end]", {
                    scope: normalizedScope,
                    durationMs: Number((performance.now() - fetchStartedAt).toFixed(1))
                });
                return payload;
            })
            .finally(() => {
                const latestEntry = store[normalizedScope];
                if (latestEntry?.promise === requestPromise) {
                    latestEntry.promise = null;
                }
            });
        store[normalizedScope] = {
            data: cachedEntry?.data || null,
            timestamp: cachedEntry?.timestamp || 0,
            promise: requestPromise
        };
        return requestPromise;
    }

    function getElements() {
        return {
            workspace: document.getElementById("notesWorkspace"),
            notesSectionsGrid: document.getElementById("notesSectionsGrid"),
            notesSavedIndicator: document.getElementById("notesSavedIndicator"),
            clearNotesButton: document.getElementById("clearNotesButton"),
            notesItemList: document.getElementById("notesItemList"),
            notesItemEmpty: document.getElementById("notesItemEmpty"),
            notesContextStatus: document.getElementById("notesContextStatus"),
            notesContextMetrics: document.getElementById("notesContextMetrics"),
            notesSuggestedTags: document.getElementById("notesSuggestedTags")
        };
    }

    function readNoteItems() {
        let raw = "";
        try {
            raw = String(window.localStorage.getItem(getNotesItemsStorageKey()) || "").trim();
        } catch (error) {
            raw = "";
        }
        if (!raw) return [];
        try {
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];
            return parsed
                .map((item) => ({
                    id: String(item.id || ""),
                    title: String(item.title || "").trim(),
                    text: String(item.text || "").trim(),
                    section: String(item.section || "").trim(),
                    date: String(item.date || "").trim(),
                    updatedAt: String(item.updatedAt || item.createdAt || ""),
                    createdAt: String(item.createdAt || item.updatedAt || "")
                }))
                .filter((item) => item.id && item.text && NOTE_SECTIONS.some((section) => section.id === item.section))
                .slice(0, MAX_NOTES);
        } catch (error) {
            return [];
        }
    }

    function writeNoteItems(items) {
        try {
            window.localStorage.setItem(getNotesItemsStorageKey(), JSON.stringify((items || []).slice(0, MAX_NOTES)));
        } catch (error) {
            return;
        }
    }

    function formatTimestamp(value, { includeTime = true } = {}) {
        if (!value) return "Just now";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "Just now";
        const options = {
            month: "short",
            day: "numeric"
        };
        if (includeTime) {
            options.hour = "numeric";
            options.minute = "2-digit";
        } else {
            options.year = "numeric";
        }
        return date.toLocaleString("en-US", options);
    }

    function flashSavedIndicator(elements, label = "Saved") {
        if (!elements.notesSavedIndicator) return;
        elements.notesSavedIndicator.textContent = label;
        elements.notesSavedIndicator.classList.add("is-active");
        window.clearTimeout(window.__workspaceNotesSavedIndicatorTimer);
        window.__workspaceNotesSavedIndicatorTimer = window.setTimeout(() => {
            if (elements.notesSavedIndicator) {
                elements.notesSavedIndicator.classList.remove("is-active");
                elements.notesSavedIndicator.textContent = "Ready";
            }
        }, 1200);
    }

    function getState() {
        if (!window.__workspaceNotesState) {
            window.__workspaceNotesState = {
                items: readNoteItems(),
                editingId: "",
                activeSection: ""
            };
        }
        return window.__workspaceNotesState;
    }

    function createEmptyNote(sectionId = "") {
        return {
            id: "",
            section: sectionId,
            title: "",
            text: "",
            date: "",
            updatedAt: "",
            createdAt: ""
        };
    }

    function getSectionTitle(sectionId) {
        return NOTE_SECTIONS.find((section) => section.id === sectionId)?.title || "Notes";
    }

    function renderSectionEditor(sectionId, state) {
        if (state.activeSection !== sectionId) {
            return "";
        }
        const editingItem = state.editingId
            ? (state.items || []).find((item) => item.id === state.editingId && item.section === sectionId)
            : null;
        const draft = editingItem || createEmptyNote(sectionId);
        return `
            <div class="notes-compose-card notes-compose-card-rich">
                <label class="notes-inline-field" for="notesTitle-${sectionId}">
                    <span class="notes-inline-label">Optional title</span>
                    <input id="notesTitle-${sectionId}" class="recipe-input notes-inline-input" type="text" maxlength="100" data-notes-draft-field="title" value="${escapeHtml(draft.title)}" placeholder="Example: Chicken supplier review">
                </label>
                <label class="notes-inline-field" for="notesDate-${sectionId}">
                    <span class="notes-inline-label">Date</span>
                    <input id="notesDate-${sectionId}" class="recipe-input notes-inline-input" type="date" data-notes-draft-field="date" value="${escapeHtml(draft.date)}">
                </label>
                <label class="notes-inline-field notes-inline-field-wide" for="notesText-${sectionId}">
                    <span class="notes-inline-label">Note</span>
                    <textarea id="notesText-${sectionId}" class="notes-textarea notes-textarea-inline" data-notes-draft-field="text" placeholder="Add a buyer note, explain the risk, or record the next action...">${escapeHtml(draft.text)}</textarea>
                </label>
                <div class="notes-compose-actions">
                    <button type="button" class="action-btn" data-notes-save="${sectionId}">${editingItem ? "Save Edit" : "Save Note"}</button>
                    <button type="button" class="secondary-btn" data-notes-cancel="${sectionId}">Cancel</button>
                </div>
            </div>
        `;
    }

    function renderSectionItems(elements) {
        if (!elements.notesSectionsGrid) return;
        const state = getState();

        NOTE_SECTIONS.forEach((section) => {
            const sectionRoot = elements.notesSectionsGrid.querySelector(`[data-notes-section="${section.id}"]`);
            if (!sectionRoot) return;
            const countElement = sectionRoot.querySelector(`[data-notes-section-count="${section.id}"]`);
            const editorElement = sectionRoot.querySelector(`[data-notes-editor="${section.id}"]`);
            const listElement = sectionRoot.querySelector(`[data-notes-list="${section.id}"]`);
            const emptyElement = sectionRoot.querySelector(`[data-notes-empty="${section.id}"]`);
            const createButton = sectionRoot.querySelector(`[data-notes-create="${section.id}"]`);
            const items = (state.items || []).filter((item) => item.section === section.id);

            if (countElement) countElement.textContent = String(items.length);
            if (createButton) createButton.textContent = state.activeSection === section.id ? "Close" : "Create Note";
            if (editorElement) {
                editorElement.hidden = state.activeSection !== section.id;
                editorElement.innerHTML = renderSectionEditor(section.id, state);
            }
            if (listElement) {
                listElement.innerHTML = items.map((item) => {
                    const dateLabel = item.date ? formatTimestamp(`${item.date}T00:00:00`, { includeTime: false }) : "";
                    return `
                        <article class="notes-item-card">
                            <div class="notes-item-head">
                                <div class="notes-item-meta">
                                    <span class="notes-item-tag">${escapeHtml(section.title)}</span>
                                    ${dateLabel ? `<span class="notes-item-time">${escapeHtml(dateLabel)}</span>` : ""}
                                </div>
                                <div class="notes-item-actions">
                                    <button type="button" class="secondary-btn notes-item-action-btn" data-note-edit="${item.id}">Edit</button>
                                    <button type="button" class="secondary-btn notes-item-action-btn is-danger" data-note-delete="${item.id}">Delete</button>
                                </div>
                            </div>
                            ${item.title ? `<h3 class="notes-item-title">${escapeHtml(item.title)}</h3>` : ""}
                            <div class="notes-item-text">${escapeHtml(item.text)}</div>
                        </article>
                    `;
                }).join("");
            }
            if (emptyElement) emptyElement.hidden = items.length > 0;
        });
    }

    function renderNoteItems(elements) {
        if (!elements.notesItemList || !elements.notesItemEmpty) return;
        const state = getState();
        const items = state.items || [];
        elements.notesItemList.innerHTML = "";
        elements.notesItemEmpty.hidden = items.length > 0;

        items.forEach((item) => {
            const article = document.createElement("article");
            article.className = "notes-item-card";
            article.dataset.noteId = item.id;

            const head = document.createElement("div");
            head.className = "notes-item-head";

            const meta = document.createElement("div");
            meta.className = "notes-item-meta";

            const tag = document.createElement("span");
            tag.className = "notes-item-tag";
            tag.textContent = getSectionTitle(item.section);
            meta.appendChild(tag);

            if (item.date) {
                const date = document.createElement("span");
                date.className = "notes-item-time";
                date.textContent = formatTimestamp(`${item.date}T00:00:00`, { includeTime: false });
                meta.appendChild(date);
            }

            const time = document.createElement("span");
            time.className = "notes-item-time";
            time.textContent = formatTimestamp(item.updatedAt || item.createdAt);
            meta.appendChild(time);

            const actions = document.createElement("div");
            actions.className = "notes-item-actions";

            const editButton = document.createElement("button");
            editButton.type = "button";
            editButton.className = "secondary-btn notes-item-action-btn";
            editButton.textContent = "Edit";
            editButton.dataset.noteEdit = item.id;

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "secondary-btn notes-item-action-btn is-danger";
            deleteButton.textContent = "Delete";
            deleteButton.dataset.noteDelete = item.id;

            actions.appendChild(editButton);
            actions.appendChild(deleteButton);
            head.appendChild(meta);
            head.appendChild(actions);

            if (item.title) {
                const title = document.createElement("h3");
                title.className = "notes-item-title";
                title.textContent = item.title;
                article.appendChild(title);
            }

            const body = document.createElement("div");
            body.className = "notes-item-text";
            body.textContent = item.text;

            article.appendChild(head);
            article.appendChild(body);
            elements.notesItemList.appendChild(article);
        });
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function closeEditor(state) {
        state.editingId = "";
        state.activeSection = "";
    }

    function upsertNoteItem(elements, sectionId) {
        const state = getState();
        const sectionRoot = elements.notesSectionsGrid?.querySelector(`[data-notes-section="${sectionId}"]`);
        if (!sectionRoot) return;
        const title = String(sectionRoot.querySelector('[data-notes-draft-field="title"]')?.value || "").trim();
        const text = String(sectionRoot.querySelector('[data-notes-draft-field="text"]')?.value || "").trim();
        const date = String(sectionRoot.querySelector('[data-notes-draft-field="date"]')?.value || "").trim();
        if (!text) return;
        const now = new Date().toISOString();
        if (state.editingId) {
            state.items = state.items.map((item) => item.id === state.editingId
                ? { ...item, title, text, date, updatedAt: now }
                : item);
            flashSavedIndicator(elements, "Updated");
        } else {
            state.items = [
                {
                    id: `${Date.now()}-${Math.round(Math.random() * 100000)}`,
                    section: sectionId,
                    title,
                    text,
                    date,
                    createdAt: now,
                    updatedAt: now
                },
                ...state.items
            ].slice(0, MAX_NOTES);
            flashSavedIndicator(elements, "Saved");
        }
        writeNoteItems(state.items);
        closeEditor(state);
        renderSectionItems(elements);
        renderNoteItems(elements);
    }

    function removeNoteItem(elements, noteId) {
        const state = getState();
        const nextItems = state.items.filter((item) => item.id !== noteId);
        const noteWasRemoved = nextItems.length !== state.items.length;
        state.items = nextItems;
        if (state.editingId === noteId) {
            closeEditor(state);
        }
        writeNoteItems(state.items);
        refreshNotesContext(elements);
        if (!noteWasRemoved) {
            return;
        }

        const card = elements.notesItemList?.querySelector(`[data-note-id="${CSS.escape(noteId)}"]`);
        if (!card) {
            renderSectionItems(elements);
            renderNoteItems(elements);
            flashSavedIndicator(elements, "Deleted");
            return;
        }
        card.classList.add("is-removing");
        window.setTimeout(() => {
            renderSectionItems(elements);
            renderNoteItems(elements);
            flashSavedIndicator(elements, "Deleted");
        }, 180);
    }

    function readQuoteCompareSnapshot() {
        try {
            const parsed = JSON.parse(window.sessionStorage.getItem(QUOTE_COMPARE_STATE_KEY) || "null");
            return parsed && typeof parsed === "object" ? parsed : null;
        } catch (error) {
            return null;
        }
    }

    function buildNotesContextModel(snapshot, scopePayload, noteCount) {
        const scopeSummary = scopePayload?.scope_summary || {};
        const summary = snapshot?.analysisResult?.summary || {};
        const decisionCards = Array.isArray(summary.decisionCards) ? summary.decisionCards : [];
        const productCount = Number(summary.productCount || scopeSummary.product_count || 0);
        const supplierCount = Number(summary.supplierCount || 0);
        const opportunitiesCount = Number(summary.productsWithSavings || 0);
        const totalSavings = Number(summary.totalVisibleSavings || 0);
        const hasAnalysis = Boolean(scopePayload?.has_analysis || snapshot?.analysisResult?.comparison);

        const suggestedTags = [];
        if (decisionCards.length) {
            decisionCards.slice(0, 4).forEach((card) => {
                const productName = String(card?.productName || "").trim();
                if (productName && !suggestedTags.includes(productName)) {
                    suggestedTags.push(productName);
                }
            });
        }
        if (!suggestedTags.length && hasAnalysis && scopeSummary.source_name) {
            suggestedTags.push(String(scopeSummary.source_name));
        }
        if (!suggestedTags.length) {
            suggestedTags.push("Negotiation", "Supplier follow-up", "Savings review");
        }

        return {
            status: hasAnalysis
                ? `Current analysis is available. You already have ${productCount || scopeSummary.row_count || 0} products in context and ${noteCount} saved ${noteCount === 1 ? "note" : "notes"}.`
                : `No analyzed file is active yet. Your ${noteCount} saved ${noteCount === 1 ? "note stays" : "notes stay"} available independently of analysis resets.`,
            metrics: [
                { label: "Products", value: productCount || "--", tone: "default" },
                { label: "Suppliers", value: supplierCount || "--", tone: "default" },
                { label: "Opportunities", value: opportunitiesCount || 0, tone: opportunitiesCount > 0 ? "accent" : "default" },
                { label: "Saved notes", value: noteCount || 0, tone: noteCount > 0 ? "accent" : "default" }
            ],
            suggestedTags
        };
    }

    function renderNotesContext(elements, model) {
        if (elements.notesContextStatus) {
            elements.notesContextStatus.textContent = model.status;
        }
        if (elements.notesContextMetrics) {
            elements.notesContextMetrics.innerHTML = model.metrics.map((metric) => `
                <article class="guide-context-metric ${metric.tone === "accent" ? "is-accent" : ""}">
                    <div class="guide-context-metric-value">${metric.value}</div>
                    <div class="guide-context-metric-label">${metric.label}</div>
                </article>
            `).join("");
        }
        if (elements.notesSuggestedTags) {
            elements.notesSuggestedTags.innerHTML = "";
            model.suggestedTags.forEach((tagValue) => {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "notes-tag-chip";
                button.dataset.notesTag = String(tagValue);
                button.textContent = String(tagValue);
                elements.notesSuggestedTags.appendChild(button);
            });
        }
    }

    async function refreshNotesContext(elements, scopePayload = null) {
        const refreshStartedAt = performance.now();
        if (!elements.workspace || (!elements.notesContextStatus && !elements.notesContextMetrics && !elements.notesSuggestedTags)) return;
        const snapshot = readQuoteCompareSnapshot();
        let resolvedScopePayload = scopePayload;
        try {
            resolvedScopePayload = resolvedScopePayload || await getCachedAnalysisScopeBootstrap("current_upload");
        } catch (error) {
            resolvedScopePayload = { has_analysis: false, scope_summary: {} };
        }
        if (resolvedScopePayload) {
            setCachedAnalysisScopeBootstrap("current_upload", resolvedScopePayload);
        }
        renderNotesContext(elements, buildNotesContextModel(snapshot, resolvedScopePayload, getState().items.length));
        console.info("[notes context refresh]", {
            durationMs: Number((performance.now() - refreshStartedAt).toFixed(1)),
            usedPrefetchedScope: Boolean(scopePayload)
        });
    }

    function bindEvents(elements) {
        if (elements.notesSectionsGrid && elements.notesSectionsGrid.dataset.bound !== "true") {
            elements.notesSectionsGrid.dataset.bound = "true";
            elements.notesSectionsGrid.addEventListener("click", (event) => {
                const createButton = event.target.closest("[data-notes-create]");
                if (createButton) {
                    const state = getState();
                    const sectionId = createButton.dataset.notesCreate || "";
                    if (!sectionId) return;
                    if (state.activeSection === sectionId) {
                        closeEditor(state);
                    } else {
                        state.activeSection = sectionId;
                        state.editingId = "";
                    }
                    renderSectionItems(elements);
                    return;
                }

                const cancelButton = event.target.closest("[data-notes-cancel]");
                if (cancelButton) {
                    closeEditor(getState());
                    renderSectionItems(elements);
                    return;
                }

                const saveButton = event.target.closest("[data-notes-save]");
                if (saveButton) {
                    upsertNoteItem(elements, saveButton.dataset.notesSave || "");
                    refreshNotesContext(elements);
                    return;
                }

                const editButton = event.target.closest("[data-note-edit]");
                if (editButton) {
                    const state = getState();
                    const item = state.items.find((entry) => entry.id === editButton.dataset.noteEdit);
                    if (!item) return;
                    state.editingId = item.id;
                    state.activeSection = item.section;
                    renderSectionItems(elements);
                    return;
                }

                const deleteButton = event.target.closest("[data-note-delete]");
                if (deleteButton) {
                    removeNoteItem(elements, deleteButton.dataset.noteDelete || "");
                }
            });
        }

        if (elements.notesItemList && elements.notesItemList.dataset.bound !== "true") {
            elements.notesItemList.dataset.bound = "true";
            elements.notesItemList.addEventListener("click", (event) => {
                const editButton = event.target.closest("[data-note-edit]");
                if (editButton) {
                    const state = getState();
                    const item = state.items.find((entry) => entry.id === editButton.dataset.noteEdit);
                    if (!item) return;
                    state.editingId = item.id;
                    state.activeSection = item.section;
                    renderSectionItems(elements);
                    return;
                }

                const deleteButton = event.target.closest("[data-note-delete]");
                if (deleteButton) {
                    removeNoteItem(elements, deleteButton.dataset.noteDelete || "");
                }
            });
        }

        if (elements.clearNotesButton && elements.clearNotesButton.dataset.bound !== "true") {
            elements.clearNotesButton.dataset.bound = "true";
            elements.clearNotesButton.addEventListener("click", () => {
                const state = getState();
                state.items = [];
                closeEditor(state);
                writeNoteItems([]);
                renderSectionItems(elements);
                renderNoteItems(elements);
                flashSavedIndicator(elements, "Cleared");
                refreshNotesContext(elements);
            });
        }

        if (elements.notesSuggestedTags && elements.notesSuggestedTags.dataset.bound !== "true") {
            elements.notesSuggestedTags.dataset.bound = "true";
            elements.notesSuggestedTags.addEventListener("click", (event) => {
                const tagButton = event.target.closest("[data-notes-tag]");
                if (!tagButton) return;
                const state = getState();
                const preferredSection = String(tagButton.dataset.notesTag || "").toLowerCase().includes("supplier")
                    ? "supplier_notes"
                    : String(tagButton.dataset.notesTag || "").toLowerCase().includes("follow")
                        ? "follow_up_items"
                        : "quick_notes";
                state.activeSection = preferredSection;
                state.editingId = "";
                renderSectionItems(elements);
            });
        }
    }

    function init() {
        const elements = getElements();
        if (!elements.workspace) return;
        const hasSavedItems = getState().items.length > 0;
        if (elements.notesSavedIndicator) {
            elements.notesSavedIndicator.textContent = hasSavedItems ? "Saved" : "Ready";
        }

        bindEvents(elements);
        renderSectionItems(elements);
        renderNoteItems(elements);
        refreshNotesContext(elements);

        window.addEventListener("focus", () => {
            refreshNotesContext(elements);
        });
        window.addEventListener("pageshow", () => {
            refreshNotesContext(elements);
        });
        window.addEventListener("shared-analysis-context-updated", (event) => {
            refreshNotesContext(elements, event.detail?.scopePayload || null);
        });
        window.addEventListener("storage", (event) => {
            const notesItemsStorageKey = getNotesItemsStorageKey();
            if (event.key === QUOTE_COMPARE_STATE_KEY || event.key === NOTES_ITEMS_KEY || event.key === notesItemsStorageKey) {
                if (event.key === NOTES_ITEMS_KEY || event.key === notesItemsStorageKey) {
                    const state = getState();
                    state.items = readNoteItems();
                    if (state.editingId && !state.items.some((item) => item.id === state.editingId)) {
                        closeEditor(state);
                    }
                    renderSectionItems(elements);
                    renderNoteItems(elements);
                }
                refreshNotesContext(elements);
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
