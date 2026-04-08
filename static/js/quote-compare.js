(function () {
    const REQUIRED_FIELDS = ["Product Name", "Supplier", "Unit", "Quantity", "Unit Price", "Date"];
    const OPTIONAL_FIELDS = ["Currency", "Delivery Time", "Payment Terms", "Valid Until", "Notes"];
    const FIELD_HELP = {
        "Product Name": "Choose the product, item, material, or description column.",
        "Supplier": "Choose the supplier, vendor, company, or seller column.",
        "Unit": "Choose the purchase unit, UOM, pack, or package column.",
        "Quantity": "Choose the quantity, qty, amount, or ordered quantity column.",
        "Unit Price": "Choose the unit price, price, cost, or rate column.",
        "Date": "Choose the price, purchase, invoice, or transaction date column.",
        "Currency": "Optional. Use this when the file includes a currency code like USD or EUR.",
        "Delivery Time": "Optional. Use this for lead time or delivery timing.",
        "Payment Terms": "Optional. Use this for Net 30, Net 45, or similar terms.",
        "Valid Until": "Optional. Use this for expiry or validity dates.",
        "Notes": "Optional. Use this for freight, MOQ, quality, or commercial notes."
    };
    const HIGH_CONFIDENCE_MATCHES = new Set(["exact", "alias", "strong"]);
    const QUOTE_COMPARE_SCROLL_KEY = "quote_compare_scroll_v1";
    const QUOTE_COMPARE_STATE_KEY = "quote_compare_state_v1";
    const QUOTE_COMPARE_ACTIVE_SESSION_KEY = "quote_compare_active_session_v1";
    const QUOTE_COMPARE_LAST_SCREEN_KEY = "quote_compare_last_screen_v1";
    const QUOTE_COMPARE_MAPPING_MEMORY_KEY = "quote_compare_mapping_memory_v1";
    const QUOTE_COMPARE_HISTORY_COLUMNS_KEY = "quote_compare_history_columns_v1";
    const QUOTE_COMPARE_HISTORY_COLUMNS_ORDER_KEY = "quote_compare_history_columns_order_v1";
    const SHARED_ANALYSIS_SCOPE_KEY = "shared_analysis_scope_v1";
    const OPPORTUNITY_CARD_BATCH_SIZE = 24;
    const RESTORE_INITIAL_OPPORTUNITY_CARD_BATCH_SIZE = 8;
    const RESTORE_INITIAL_ANALYSIS_VIEWPORT_END = 24;
    const RESTORE_OPPORTUNITY_CARD_BATCH_SIZE = 12;
    const RESTORE_ANALYSIS_TABLE_BATCH_SIZE = 32;
    const ANALYSIS_ROW_HEIGHT = 132;
    const ANALYSIS_ROW_EXPANDED_HEIGHT = 324;
    const ANALYSIS_VIRTUAL_OVERSCAN = 6;
    const HISTORY_ROW_HEIGHT = 46;
    const HISTORY_VIRTUAL_OVERSCAN = 14;
    const HISTORY_COLUMN_DEFINITIONS = [
        { key: "quoteDate", label: "Date", essential: true, headerClassName: "qc2-history-cell-date", cellClassName: "qc2-history-cell-date", render: (row) => escapeHtml(formatDate(row.quoteDate || row.createdAt)) },
        { key: "productName", label: "Product", essential: true, headerClassName: "qc2-history-cell-product", cellClassName: "qc2-history-cell-product", render: (row) => escapeHtml(row.productName) },
        { key: "supplier", label: "Supplier", essential: true, headerClassName: "qc2-history-cell-supplier", cellClassName: "qc2-history-cell-supplier", render: (row) => escapeHtml(row.supplier) },
        { key: "unit", label: "Unit", essential: false, headerClassName: "qc2-history-cell-unit", cellClassName: "qc2-history-cell-unit", render: (row) => escapeHtml(row.unit || "-") },
        { key: "quantity", label: "Qty", essential: false, headerClassName: "qc2-history-cell-quantity", cellClassName: "qc2-history-cell-quantity", render: (row) => escapeHtml(String(row.quantity || 0)) },
        { key: "unitPrice", label: "Unit Price", essential: false, headerClassName: "qc2-history-cell-unitPrice", cellClassName: "qc2-history-cell-unitPrice", render: (row) => escapeHtml(formatCurrency(row.unitPrice, row.currency)) },
        { key: "totalPrice", label: "Total", essential: false, headerClassName: "qc2-history-cell-totalPrice", cellClassName: "qc2-history-cell-totalPrice", render: (row) => escapeHtml(formatCurrency(row.totalPrice, row.currency)) },
        { key: "changeValue", label: "Change", essential: false, headerClassName: "qc2-history-cell-changeValue", cellClassName: "qc2-history-cell-changeValue", toneClassName: (row) => row.changeValue == null ? "" : row.changeValue > 0 ? "qc2-change-negative" : row.changeValue < 0 ? "qc2-change-positive" : "", render: (row) => row.changeValue == null ? "--" : escapeHtml(formatCurrency(row.changeValue, row.currency)) },
        { key: "changePercent", label: "Change %", essential: false, headerClassName: "qc2-history-cell-changePercent", cellClassName: "qc2-history-cell-changePercent", toneClassName: (row) => row.changePercent == null ? "" : row.changePercent > 0 ? "qc2-change-negative" : row.changePercent < 0 ? "qc2-change-positive" : "", render: (row) => row.changePercent == null ? "--" : escapeHtml(formatPercent(row.changePercent)) }
    ];
    const OPPORTUNITY_CARD_PALETTE = [
        {
            border: "rgba(96, 165, 250, 0.24)",
            glow: "rgba(59, 130, 246, 0.16)",
            badgeBg: "rgba(59, 130, 246, 0.16)",
            badgeText: "#dbeafe",
            laneBorder: "rgba(96, 165, 250, 0.18)",
            laneBestBorder: "rgba(125, 211, 252, 0.24)",
            decisionBg: "linear-gradient(135deg, rgba(30, 64, 175, 0.30), rgba(15, 23, 42, 0.78))",
            decisionBorder: "rgba(96, 165, 250, 0.22)",
            savingsText: "#93c5fd"
        },
        {
            border: "rgba(52, 211, 153, 0.24)",
            glow: "rgba(16, 185, 129, 0.14)",
            badgeBg: "rgba(16, 185, 129, 0.16)",
            badgeText: "#d1fae5",
            laneBorder: "rgba(52, 211, 153, 0.18)",
            laneBestBorder: "rgba(110, 231, 183, 0.24)",
            decisionBg: "linear-gradient(135deg, rgba(6, 95, 70, 0.30), rgba(15, 23, 42, 0.78))",
            decisionBorder: "rgba(52, 211, 153, 0.22)",
            savingsText: "#86efac"
        },
        {
            border: "rgba(251, 191, 36, 0.24)",
            glow: "rgba(245, 158, 11, 0.14)",
            badgeBg: "rgba(245, 158, 11, 0.16)",
            badgeText: "#fef3c7",
            laneBorder: "rgba(251, 191, 36, 0.18)",
            laneBestBorder: "rgba(252, 211, 77, 0.24)",
            decisionBg: "linear-gradient(135deg, rgba(146, 64, 14, 0.28), rgba(15, 23, 42, 0.78))",
            decisionBorder: "rgba(251, 191, 36, 0.22)",
            savingsText: "#fcd34d"
        },
        {
            border: "rgba(244, 114, 182, 0.24)",
            glow: "rgba(236, 72, 153, 0.14)",
            badgeBg: "rgba(236, 72, 153, 0.16)",
            badgeText: "#fce7f3",
            laneBorder: "rgba(244, 114, 182, 0.18)",
            laneBestBorder: "rgba(249, 168, 212, 0.24)",
            decisionBg: "linear-gradient(135deg, rgba(157, 23, 77, 0.28), rgba(15, 23, 42, 0.78))",
            decisionBorder: "rgba(244, 114, 182, 0.22)",
            savingsText: "#f9a8d4"
        },
        {
            border: "rgba(167, 139, 250, 0.24)",
            glow: "rgba(139, 92, 246, 0.14)",
            badgeBg: "rgba(139, 92, 246, 0.16)",
            badgeText: "#ede9fe",
            laneBorder: "rgba(167, 139, 250, 0.18)",
            laneBestBorder: "rgba(196, 181, 253, 0.24)",
            decisionBg: "linear-gradient(135deg, rgba(91, 33, 182, 0.28), rgba(15, 23, 42, 0.78))",
            decisionBorder: "rgba(167, 139, 250, 0.22)",
            savingsText: "#c4b5fd"
        },
        {
            border: "rgba(248, 113, 113, 0.24)",
            glow: "rgba(239, 68, 68, 0.14)",
            badgeBg: "rgba(239, 68, 68, 0.16)",
            badgeText: "#fee2e2",
            laneBorder: "rgba(248, 113, 113, 0.18)",
            laneBestBorder: "rgba(252, 165, 165, 0.24)",
            decisionBg: "linear-gradient(135deg, rgba(153, 27, 27, 0.28), rgba(15, 23, 42, 0.78))",
            decisionBorder: "rgba(248, 113, 113, 0.22)",
            savingsText: "#fca5a5"
        }
    ];

    function logQuoteCompareRestore(label, details = {}) {
        console.info(`[PERF] ${label}`, details);
    }

    function isCompactTouchViewport() {
        return window.matchMedia("(max-width: 767px)").matches;
    }

    function getElements() {
        return {
            workspace: document.getElementById("quoteCompareWorkspaceView"),
            shell: document.getElementById("quoteCompareShell"),
            app: document.getElementById("quoteCompareApp"),
            quoteDataScopeSummary: document.getElementById("quoteDataScopeSummary"),
            continueAnalysisButton: document.getElementById("quoteContinueAnalysisButton"),
            demoState: document.getElementById("quoteDemoState"),
            exitDemoButton: document.getElementById("quoteExitDemoButton")
        };
    }

    function createManualUploadId() {
        if (window.crypto?.randomUUID) {
            return window.crypto.randomUUID();
        }
        return `manual-${Date.now()}-${Math.round(Math.random() * 100000)}`;
    }

    function setQuoteCompareReady(elements, isReady) {
        if (!elements.workspace) return;
        elements.workspace.setAttribute("data-qc-ready", isReady ? "true" : "false");
    }

    function updateCurrentFileSummary(elements, state) {
        if (!elements.quoteDataScopeSummary) return;
        const fileName = String(state.file?.name || state.uploadReview?.filename || "").trim();
        if (!fileName) return;
        if (state.currentScreen === "review" || Number(state.currentStep || 0) === 2) {
            elements.quoteDataScopeSummary.textContent = `Current File • ${fileName}`;
            return;
        }
        const summary = state.dataScopeSummary || {};
        const rowCount = Number(summary.row_count || 0);
        const productCount = Number(summary.product_name_count || summary.product_count || 0);
        if (rowCount) {
            elements.quoteDataScopeSummary.textContent = `${fileName} • ${productCount} products • ${rowCount} rows`;
        }
    }

    function shouldResumeQuoteCompareSession() {
        try {
            return new URLSearchParams(window.location.search || "").get("resume") === "1";
        } catch (error) {
            return false;
        }
    }

    function shouldAutoStartDemo() {
        try {
            return new URLSearchParams(window.location.search || "").get("demo") === "1";
        } catch (error) {
            return false;
        }
    }

    function shouldOpenDemoEntry() {
        try {
            return new URLSearchParams(window.location.search || "").get("demo-entry") === "1";
        } catch (error) {
            return false;
        }
    }

    function clearAutoStartDemoFlag() {
        try {
            const url = new URL(window.location.href);
            if (url.searchParams.get("demo") !== "1") {
                return;
            }
            url.searchParams.delete("demo");
            window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
        } catch (error) {
            // Ignore URL cleanup failures.
        }
    }

    function clearDemoEntryFlag() {
        try {
            const url = new URL(window.location.href);
            if (url.searchParams.get("demo-entry") !== "1") {
                return;
            }
            url.searchParams.delete("demo-entry");
            window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
        } catch (error) {
            // Ignore URL cleanup failures.
        }
    }

    function hasPersistedQuoteCompareActiveSession() {
        try {
            return Boolean(String(sessionStorage.getItem(QUOTE_COMPARE_ACTIVE_SESSION_KEY) || "").trim());
        } catch (error) {
            return false;
        }
    }

    function clearQuoteCompareResumeFlag() {
        try {
            const url = new URL(window.location.href);
            if (url.searchParams.get("resume") !== "1") {
                return;
            }
            url.searchParams.delete("resume");
            window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
        } catch (error) {
            // Ignore URL cleanup failures.
        }
    }

    async function refreshSharedScopeSummary(elements, state) {
        if (!elements.quoteDataScopeSummary) {
            updateContinueAnalysisButton(elements, state);
            return;
        }
        try {
            const data = await fetchJson("/analysis/scope-bootstrap");
            state.dataScopeSummary = data.scope_summary || null;
            state.hasSharedScopeAnalysis = Boolean(data?.has_analysis);
            const summary = state.dataScopeSummary || {};
            const rowCount = Number(summary.row_count || 0);
            const productCount = Number(summary.product_name_count || summary.product_count || 0);
            const scopeLabel = summary.scope_label || "Current File";
            elements.quoteDataScopeSummary.textContent = rowCount
                ? `${scopeLabel} • ${productCount} products • ${rowCount} rows`
                : "No analyzed file yet";
        } catch (error) {
            state.hasSharedScopeAnalysis = false;
            elements.quoteDataScopeSummary.textContent = "No analyzed file yet";
        }
        updateCurrentFileSummary(elements, state);
        updateContinueAnalysisButton(elements, state);
    }

    function getAnalysisScopeBootstrapCacheStore() {
        if (!window.__analysisScopeBootstrapCache || typeof window.__analysisScopeBootstrapCache !== "object") {
            window.__analysisScopeBootstrapCache = {};
        }
        return window.__analysisScopeBootstrapCache;
    }

    function getAnalysisScopeBootstrapCacheKey(scope, sessionId = "") {
        const normalizedScope = String(scope || "current_upload").trim() || "current_upload";
        const normalizedSessionId = String(sessionId || "").trim();
        return normalizedSessionId ? `${normalizedScope}::${normalizedSessionId}` : normalizedScope;
    }

    function setCachedAnalysisScopeBootstrap(scope, payload, sessionId = "") {
        const cacheKey = getAnalysisScopeBootstrapCacheKey(scope, sessionId);
        const store = getAnalysisScopeBootstrapCacheStore();
        store[cacheKey] = {
            data: payload,
            timestamp: performance.now(),
            promise: null
        };
    }

    async function getCachedAnalysisScopeBootstrap(scope = "current_upload", { force = false, maxAgeMs = 5000, sessionId = "" } = {}) {
        const normalizedScope = String(scope || "current_upload").trim() || "current_upload";
        const cacheKey = getAnalysisScopeBootstrapCacheKey(normalizedScope, sessionId);
        const store = getAnalysisScopeBootstrapCacheStore();
        const cachedEntry = store[cacheKey];
        const now = performance.now();
        if (!force && cachedEntry?.data && (now - Number(cachedEntry.timestamp || 0)) <= maxAgeMs) {
            console.info("[compare prices scope bootstrap cache hit]", {
                scope: normalizedScope,
                sessionId: Boolean(String(sessionId || "").trim()),
                ageMs: Number((now - Number(cachedEntry.timestamp || 0)).toFixed(1))
            });
            return cachedEntry.data;
        }
        if (!force && cachedEntry?.promise) {
            console.info("[compare prices scope bootstrap shared inflight]", {
                scope: normalizedScope,
                sessionId: Boolean(String(sessionId || "").trim())
            });
            return cachedEntry.promise;
        }
        const params = new URLSearchParams();
        if (normalizedScope) {
            params.set("scope", normalizedScope);
        }
        if (String(sessionId || "").trim()) {
            params.set("session_id", String(sessionId).trim());
        }
        const query = params.toString() ? `?${params.toString()}` : "";
        const requestPromise = fetchJson(`/analysis/scope-bootstrap${query}`)
            .then((payload) => {
                setCachedAnalysisScopeBootstrap(normalizedScope, payload, sessionId);
                return payload;
            })
            .finally(() => {
                const latestEntry = store[cacheKey];
                if (latestEntry?.promise === requestPromise) {
                    latestEntry.promise = null;
                }
            });
        store[cacheKey] = {
            data: cachedEntry?.data || null,
            timestamp: cachedEntry?.timestamp || 0,
            promise: requestPromise
        };
        return requestPromise;
    }

    function buildClientAnalysisScopePayload(state) {
        const analysisResult = state?.analysisResult || null;
        const summary = getAnalysisSummary(analysisResult || { comparison: { bids: [] } });
        const comparison = analysisResult?.comparison || {};
        const rowCount = Number(summary?.rowCount || 0);
        const scope = state?.demoMode ? "demo" : "current_upload";
        return {
            success: true,
            has_analysis: rowCount > 0,
            scope_options: [],
            scope_summary: {
                scope,
                scope_label: state?.demoMode ? "Demo Data" : "Current File",
                row_count: rowCount,
                product_count: Number(summary?.productCount || 0),
                product_name_count: Number(summary?.productCount || 0),
                supplier_count: Number(summary?.supplierCount || 0),
                current_upload_id: String(comparison.upload_id || state?.demoSessionId || state?.activeSessionId || state?.manualUploadId || "").trim(),
                current_upload_name: String(comparison.name || (state?.demoMode ? "Demo Data" : state?.file?.name) || "").trim(),
                date_range: {
                    start: "",
                    end: ""
                }
            }
        };
    }

    function applySharedScopeSummaryPayload(elements, state, payload) {
        state.dataScopeSummary = payload?.scope_summary || null;
        state.hasSharedScopeAnalysis = Boolean(payload?.has_analysis);
        const summary = state.dataScopeSummary || {};
        const rowCount = Number(summary.row_count || 0);
        const productCount = Number(summary.product_name_count || summary.product_count || 0);
        const scopeLabel = summary.scope_label || "Current File";
        if (elements.quoteDataScopeSummary) {
            elements.quoteDataScopeSummary.textContent = rowCount
                ? `${scopeLabel} • ${productCount} products • ${rowCount} rows`
                : "No analyzed file yet";
        }
        updateCurrentFileSummary(elements, state);
        updateContinueAnalysisButton(elements, state);
    }

    async function refreshSharedScopeSummaryCached(elements, state, { scopePayload = null, force = false, sessionId = "" } = {}) {
        const refreshStartedAt = performance.now();
        const resolvedSessionId = String(sessionId || state?.demoSessionId || state?.activeSessionId || "").trim();
        const resolvedScope = String(state?.dataScope || "current_upload").trim() || "current_upload";
        if (!elements.quoteDataScopeSummary) {
            updateContinueAnalysisButton(elements, state);
            return;
        }
        try {
            const resolvedPayload = scopePayload || await getCachedAnalysisScopeBootstrap(resolvedScope, { force, sessionId: resolvedSessionId });
            if (resolvedPayload) {
                setCachedAnalysisScopeBootstrap(resolvedScope, resolvedPayload, resolvedSessionId);
            }
            applySharedScopeSummaryPayload(elements, state, resolvedPayload || { has_analysis: false, scope_summary: null });
        } catch (error) {
            state.hasSharedScopeAnalysis = false;
            elements.quoteDataScopeSummary.textContent = "No analyzed file yet";
            updateCurrentFileSummary(elements, state);
            updateContinueAnalysisButton(elements, state);
        }
        console.info("[compare prices restore scope summary]", {
            durationMs: Number((performance.now() - refreshStartedAt).toFixed(1)),
            hadPrefetchedPayload: Boolean(scopePayload),
            hadSessionId: Boolean(resolvedSessionId),
            hasAnalysis: Boolean(state.hasSharedScopeAnalysis)
        });
    }

    function hasResumableContinueAnalysisContext(state) {
        return Boolean(
            state
            && state.hasSharedScopeAnalysis
            && hasRestorableAnalyzeContext(state)
        );
    }

    function updateContinueAnalysisButton(elements, state) {
        if (!elements.continueAnalysisButton) return;
        const canContinueAnalysis = state.currentScreen === "start" && hasResumableContinueAnalysisContext(state);
        elements.continueAnalysisButton.hidden = !canContinueAnalysis;
    }

    async function resumeQuoteCompareAnalysis(elements, state) {
        if (!hasRestorableAnalyzeContext(state)) {
            const persistedSessionId = state.activeSessionId || sessionStorage.getItem(QUOTE_COMPARE_ACTIVE_SESSION_KEY) || "";
            if (persistedSessionId) {
                state.activeSessionId = persistedSessionId;
                await loadSavedComparisons(state, { includeComparisons: false });
            }
        }
        if (!hasRestorableAnalyzeContext(state)) {
            updateContinueAnalysisButton(elements, state);
            return false;
        }
        closeProductSummary(state);
        closeHistoryDetailModal(state);
        state.currentScreen = "analyze";
        state.currentStep = 3;
        state.lastQuoteCompareScreen = { currentScreen: "analyze", currentStep: 3 };
        renderApp(elements, state);
        return true;
    }

    async function handleQuoteCompareAction(action, actionTarget, elements, state) {
        if (action === "continue-analysis") {
            return await resumeQuoteCompareAnalysis(elements, state);
        }
        if (action === "start-analysis" || action === "manual-analyze") {
            if (state.demoMode) {
                return true;
            }
            await triggerStep2StartAnalysis(elements, state);
            return true;
        }
        if (action === "back-home") {
            if (state.demoMode) {
                closeProductSummary(state);
                closeHistoryDetailModal(state);
                state.currentScreen = "analyze";
                state.currentStep = 3;
                renderApp(elements, state);
                return true;
            }
            closeProductSummary(state);
            closeHistoryDetailModal(state);
            state.currentScreen = "start";
            state.currentStep = 1;
            setStatus(state, "", "");
            renderApp(elements, state);
            refreshSharedScopeSummaryCached(elements, state, { force: true }).catch(() => null);
            return true;
        }
        return null;
    }

    function setSharedAnalysisAvailability(hasAnalysis) {
        const value = hasAnalysis ? "true" : "false";
        const mainDashboardView = document.getElementById("mainDashboardView");
        const recipesWorkspaceState = document.getElementById("recipesWorkspaceState");
        if (mainDashboardView) {
            mainDashboardView.dataset.hasAnalysis = value;
        }
        if (recipesWorkspaceState) {
            recipesWorkspaceState.dataset.hasAnalysis = value;
        }
    }

    function writeSharedDataScope(scope, sessionId = "") {
        try {
            sessionStorage.setItem(SHARED_ANALYSIS_SCOPE_KEY, JSON.stringify({
                scope: String(scope || "current_upload").trim() || "current_upload",
                session_id: String(sessionId || "").trim()
            }));
        } catch (error) {
            // Ignore storage failures.
        }
    }

    function updateDemoStateBanner(elements, state) {
        if (!elements.demoState) return;
        elements.demoState.hidden = !Boolean(state.demoMode);
        if (elements.exitDemoButton) {
            elements.exitDemoButton.hidden = Boolean(state.demoMode);
        }
    }

    async function activateAnalysisScope(elements, state, scope, scopePayload = null, sessionId = "") {
        state.dataScope = String(scope || "current_upload").trim() || "current_upload";
        writeSharedDataScope(state.dataScope, sessionId);
        setSharedAnalysisAvailability(true);
        const resolvedScopePayload = scopePayload || buildClientAnalysisScopePayload(state);
        setCachedAnalysisScopeBootstrap(state.dataScope, resolvedScopePayload, sessionId);
        await refreshSharedScopeSummaryCached(elements, state, { scopePayload: resolvedScopePayload, sessionId });
        window.dispatchEvent(new CustomEvent("shared-analysis-context-updated", {
            detail: {
                scope: state.dataScope,
                uploadId: state.analysisResult?.comparison?.upload_id || sessionId || state.activeSessionId || state.manualUploadId || "",
                scopePayload: resolvedScopePayload
            }
        }));
    }

    async function activateCurrentUploadScope(elements, state, scopePayload = null) {
        await activateAnalysisScope(elements, state, "current_upload", scopePayload, state.activeSessionId);
    }

    function scheduleDeferredSharedScopeSummaryRefresh(elements, state, { force = false, reason = "deferred_init" } = {}) {
        const scheduledAt = performance.now();
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                refreshSharedScopeSummaryCached(elements, state, {
                    force,
                    sessionId: state.demoMode ? state.demoSessionId : state.activeSessionId
                }).then(() => {
                    console.info("[PERF] quote_compare.init.scope_bootstrap_deferred", {
                        reason,
                        durationMs: Number((performance.now() - scheduledAt).toFixed(1)),
                        hasActiveSessionId: Boolean(state.activeSessionId)
                    });
                }).catch(() => null);
            });
        });
    }

    function findScrollableParent(node) {
        let current = node?.parentElement || null;
        while (current) {
            const styles = window.getComputedStyle(current);
            const overflowY = styles.overflowY || styles.overflow || "";
            if (/(auto|scroll|overlay)/.test(overflowY) && current.scrollHeight > current.clientHeight) {
                return current;
            }
            current = current.parentElement;
        }
        return null;
    }

    function getScrollContext(elements) {
        const container = findScrollableParent(elements.shell);
        if (container) {
            return { type: "element", target: container };
        }
        return { type: "window", target: document.scrollingElement || document.documentElement };
    }

    function readScrollPosition(elements) {
        const context = getScrollContext(elements);
        return context.type === "element"
            ? context.target.scrollTop
            : window.scrollY || context.target.scrollTop || 0;
    }

    function writeScrollPosition(elements, top) {
        const context = getScrollContext(elements);
        const nextTop = Math.max(Number(top) || 0, 0);
        if (context.type === "element") {
            context.target.scrollTo({ top: nextTop, behavior: "auto" });
            return;
        }
        window.scrollTo({ top: nextTop, behavior: "auto" });
    }

    function getAnchorOffset(elements, selector) {
        if (!selector || !elements.app) return null;
        const anchor = elements.app.querySelector(selector);
        if (!anchor) return null;
        const context = getScrollContext(elements);
        if (context.type === "element") {
            const containerTop = context.target.getBoundingClientRect().top;
            return anchor.getBoundingClientRect().top - containerTop;
        }
        return anchor.getBoundingClientRect().top;
    }

    function restoreAnchorOffset(elements, selector, previousOffset) {
        if (!selector || previousOffset == null || !elements.app) return;
        const anchor = elements.app.querySelector(selector);
        if (!anchor) return;
        const context = getScrollContext(elements);
        const currentOffset = context.type === "element"
            ? anchor.getBoundingClientRect().top - context.target.getBoundingClientRect().top
            : anchor.getBoundingClientRect().top;
        const delta = currentOffset - previousOffset;
        if (Math.abs(delta) < 1) return;
        const currentTop = readScrollPosition(elements);
        writeScrollPosition(elements, currentTop + delta);
    }

    function getDefaultHistoryColumnKeys() {
        return HISTORY_COLUMN_DEFINITIONS.map((column) => column.key);
    }

    function getDefaultHistorySort() {
        return { key: "", direction: null };
    }

    function normalizeHistoryColumnKeys(value) {
        const validKeys = new Set(getDefaultHistoryColumnKeys());
        const essentialKeys = HISTORY_COLUMN_DEFINITIONS.filter((column) => column.essential).map((column) => column.key);
        const requestedKeys = Array.isArray(value) ? value.filter((key) => validKeys.has(key)) : [];
        const requestedSet = new Set(requestedKeys);
        essentialKeys.forEach((key) => requestedSet.add(key));
        return HISTORY_COLUMN_DEFINITIONS
            .map((column) => column.key)
            .filter((key) => requestedSet.has(key));
    }

    function normalizeHistoryColumnOrder(value) {
        const validKeys = new Set(getDefaultHistoryColumnKeys());
        const requestedKeys = Array.isArray(value) ? value.filter((key) => validKeys.has(key)) : [];
        const orderedKeys = [];
        requestedKeys.forEach((key) => {
            if (!orderedKeys.includes(key)) {
                orderedKeys.push(key);
            }
        });
        getDefaultHistoryColumnKeys().forEach((key) => {
            if (!orderedKeys.includes(key)) {
                orderedKeys.push(key);
            }
        });
        return orderedKeys;
    }

    function normalizeHistorySort(value) {
        const validKeys = new Set(getDefaultHistoryColumnKeys());
        if (!value || typeof value !== "object") return getDefaultHistorySort();
        const key = validKeys.has(value.key) ? value.key : "";
        const direction = value.direction === "asc" || value.direction === "desc" ? value.direction : null;
        if (!key || !direction) {
            return getDefaultHistorySort();
        }
        return { key, direction };
    }

    function persistHistoryColumnPreferences(state) {
        try {
            localStorage.setItem(QUOTE_COMPARE_HISTORY_COLUMNS_KEY, JSON.stringify({
                visibleKeys: normalizeHistoryColumnKeys(state.historyColumnVisibility)
            }));
        } catch (error) {
            // Ignore storage failures.
        }
    }

    function hydrateHistoryColumnPreferences(state, snapshot) {
        if (!snapshot || typeof snapshot !== "object") return;
        state.historyColumnVisibility = normalizeHistoryColumnKeys(snapshot.visibleKeys);
    }

    function restoreHistoryColumnPreferences(state) {
        try {
            const snapshot = JSON.parse(localStorage.getItem(QUOTE_COMPARE_HISTORY_COLUMNS_KEY) || "null");
            hydrateHistoryColumnPreferences(state, snapshot);
        } catch (error) {
            // Ignore invalid preference payloads.
        }
    }

    function persistHistoryColumnOrder(state) {
        try {
            localStorage.setItem(QUOTE_COMPARE_HISTORY_COLUMNS_ORDER_KEY, JSON.stringify({
                order: normalizeHistoryColumnOrder(state.historyColumnOrder)
            }));
        } catch (error) {
            // Ignore storage failures.
        }
    }

    function restoreHistoryColumnOrder(state) {
        try {
            const snapshot = JSON.parse(localStorage.getItem(QUOTE_COMPARE_HISTORY_COLUMNS_ORDER_KEY) || "null");
            state.historyColumnOrder = normalizeHistoryColumnOrder(snapshot?.order || state.historyColumnOrder);
        } catch (error) {
            // Ignore invalid preference payloads.
        }
    }

    function getVisibleHistoryColumns(state) {
        const visibleKeys = new Set(normalizeHistoryColumnKeys(state.historyColumnVisibility));
        const orderedKeys = normalizeHistoryColumnOrder(state.historyColumnOrder);
        return orderedKeys
            .map((key) => HISTORY_COLUMN_DEFINITIONS.find((column) => column.key === key))
            .filter((column) => column && visibleKeys.has(column.key));
    }

    function setHistoryColumnVisibility(state, columnKey, isVisible) {
        const column = HISTORY_COLUMN_DEFINITIONS.find((item) => item.key === columnKey);
        if (!column || column.essential) return;
        const current = new Set(normalizeHistoryColumnKeys(state.historyColumnVisibility));
        if (isVisible) {
            current.add(columnKey);
        } else {
            current.delete(columnKey);
        }
        state.historyColumnVisibility = HISTORY_COLUMN_DEFINITIONS
            .map((item) => item.key)
            .filter((key) => current.has(key));
        persistHistoryColumnPreferences(state);
    }

    function cycleHistorySort(state, columnKey) {
        const currentSort = normalizeHistorySort(state.historySort);
        if (currentSort.key !== columnKey) {
            state.historySort = { key: columnKey, direction: "asc" };
            return;
        }
        if (currentSort.direction === "asc") {
            state.historySort = { key: columnKey, direction: "desc" };
            return;
        }
        state.historySort = getDefaultHistorySort();
    }

    function getHistorySortIndicator(state, columnKey) {
        const currentSort = normalizeHistorySort(state.historySort);
        if (currentSort.key !== columnKey || !currentSort.direction) return "";
        return currentSort.direction === "asc" ? " ^" : " v";
    }

    function getHistorySortValue(row, key) {
        switch (key) {
            case "quoteDate":
                return Number(row.effectiveTimestamp) || 0;
            case "productName":
                return String(row.productName || "");
            case "supplier":
                return String(row.supplier || "");
            case "unit":
                return String(row.unit || "");
            case "quantity":
                return Number(row.quantity);
            case "unitPrice":
                return Number(row.unitPrice);
            case "totalPrice":
                return Number(row.totalPrice);
            case "changeValue":
                return Number(row.changeValue);
            case "changePercent":
                return Number(row.changePercent);
            default:
                return null;
        }
    }

    function compareHistorySortRows(left, right, key, direction) {
        const leftValue = getHistorySortValue(left, key);
        const rightValue = getHistorySortValue(right, key);
        const leftMissing = leftValue == null || leftValue === "" || Number.isNaN(leftValue);
        const rightMissing = rightValue == null || rightValue === "" || Number.isNaN(rightValue);

        if (leftMissing && rightMissing) return 0;
        if (leftMissing) return 1;
        if (rightMissing) return -1;

        let comparison = 0;
        if (typeof leftValue === "string" || typeof rightValue === "string") {
            comparison = String(leftValue).localeCompare(String(rightValue), undefined, { sensitivity: "base" });
        } else {
            comparison = Number(leftValue) - Number(rightValue);
        }

        if (comparison === 0) return 0;
        return direction === "desc" ? comparison * -1 : comparison;
    }

    function getHistorySortIndicator(state, columnKey) {
        const currentSort = normalizeHistorySort(state.historySort);
        if (currentSort.key !== columnKey || !currentSort.direction) return "";
        return currentSort.direction === "asc" ? " ^" : " v";
    }

    function getHistorySortValue(row, key) {
        switch (key) {
            case "quoteDate":
                return Number.isFinite(row.effectiveTimestamp) ? row.effectiveTimestamp : null;
            case "productName":
                return String(row.productName || "");
            case "supplier":
                return String(row.supplier || "");
            case "unit":
                return String(row.unit || "");
            case "quantity":
                return Number(row.quantity);
            case "unitPrice":
                return Number(row.unitPrice);
            case "totalPrice":
                return Number(row.totalPrice);
            case "changeValue":
                return Number(row.changeValue);
            case "changePercent":
                return Number(row.changePercent);
            default:
                return null;
        }
    }

    function getHistoryDisplayRows(state, rows) {
        const memo = getHistoryMemo(state);
        const currentSort = normalizeHistorySort(state.historySort);
        if (!currentSort.key || !currentSort.direction) {
            return rows;
        }
        const displayKey = `${currentSort.key}|${currentSort.direction}`;
        if (memo.displayRowsRef === rows && memo.displayKey === displayKey && Array.isArray(memo.displayRows)) {
            return memo.displayRows;
        }
        const displayRows = rows
            .map((row, index) => ({ row, index }))
            .sort((left, right) => {
                const comparison = compareHistorySortRows(left.row, right.row, currentSort.key, currentSort.direction);
                if (comparison !== 0) return comparison;
                return left.index - right.index;
            })
            .map((item) => item.row);
        memo.displayRowsRef = rows;
        memo.displayKey = displayKey;
        memo.displayRows = displayRows;
        return displayRows;
    }

    function getHistorySeriesKey(productName, unit) {
        return `${normalizeHistoryComparisonProductName(productName)}__${normalizeHistoryComparisonUnit(unit)}`;
    }

    function getHistorySeriesRows(rows, seriesKey) {
        if (!seriesKey) return [];
        return (Array.isArray(rows) ? rows : []).filter((row) => getHistorySeriesKey(row.productName, row.unit) === seriesKey);
    }

    function getHistoryFullSeriesRows(state, seriesKey) {
        return getHistorySeriesRows(getHistoryDataset(state), seriesKey)
            .slice()
            .sort((left, right) => {
                if (left.effectiveTimestamp !== right.effectiveTimestamp) return left.effectiveTimestamp - right.effectiveTimestamp;
                return left.supplier.localeCompare(right.supplier);
            });
    }

    function setHistorySelectedSeries(state, rows, seriesKey, rowId = "") {
        const selectedRows = getHistoryFullSeriesRows(state, seriesKey);
        state.historySelectedSeriesKey = seriesKey || "";
        state.historySelectedRows = selectedRows;
        state.historySelectedProductName = selectedRows[0]?.productName || "";
        state.historySelectedUnit = selectedRows[0]?.unit || "";
        state.historySelectedRowId = rowId || "";
    }

    function openHistoryDetailModal(state, seriesRows, useFullSeries = false) {
        const rows = Array.isArray(seriesRows) ? seriesRows.slice().sort((left, right) => {
            if (left.effectiveTimestamp !== right.effectiveTimestamp) return left.effectiveTimestamp - right.effectiveTimestamp;
            return left.supplier.localeCompare(right.supplier);
        }) : [];
        state.historyDetailSuppliersExpanded = false;
        state.historyDetailModalOpen = rows.length > 0;
        state.historyDetailModalSeries = rows.length ? {
            key: getHistorySeriesKey(rows[0].productName, rows[0].unit),
            productName: rows[0].productName,
            unit: rows[0].unit,
            rows,
            usesFullSeries: Boolean(useFullSeries)
        } : null;
    }

    function closeHistoryDetailModal(state) {
        state.historyDetailModalOpen = false;
        state.historyDetailModalSeries = null;
        state.historyDetailSuppliersExpanded = false;
    }

    function getHistoryTableScroller(elements) {
        return elements.app?.querySelector("[data-qc-history-table-scroll]") || null;
    }

    function scheduleHistoryDetailChartRender(elements, state) {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                renderHistoryDetailChart(elements, state);
            });
        });
    }

    function restoreHistoryTablePosition(elements, pageScrollTop, tableScrollTop) {
        requestAnimationFrame(() => {
            writeScrollPosition(elements, pageScrollTop);
            const nextTableScroller = getHistoryTableScroller(elements);
            if (nextTableScroller) {
                nextTableScroller.scrollTop = tableScrollTop;
            }
        });
    }

    function shouldScrollToHistoryTrend(elements) {
        const trendSection = elements.app?.querySelector("[data-qc-history-trend-content]");
        if (!trendSection) return false;
        const rect = trendSection.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
        return rect.top < 120 || rect.bottom > viewportHeight - 80;
    }

    function clearHistorySelectedSeries(state) {
        state.historySelectedSeriesKey = "";
        state.historySelectedProductName = "";
        state.historySelectedUnit = "";
        state.historySelectedRowId = "";
        state.historySelectedRows = [];
    }

    function getHistoryVolatilityLabel(rows) {
        const prices = rows.map((row) => Number(row.unitPrice)).filter(Number.isFinite);
        if (!prices.length) return "Low";
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        if (!minPrice) return "Low";
        const volatilityRatio = (maxPrice - minPrice) / minPrice;
        if (volatilityRatio >= 0.2) return "High";
        if (volatilityRatio >= 0.08) return "Medium";
        return "Low";
    }

    function buildHistorySeriesSummary(rows) {
        if (!rows.length) {
            return {
                latestUnitPrice: null,
                latestUnitPriceSupplier: "",
                latestUnitPriceDate: "",
                lowestUnitPrice: null,
                lowestUnitPriceSupplier: "",
                lowestUnitPriceDate: "",
                highestUnitPrice: null,
                highestUnitPriceSupplier: "",
                highestUnitPriceDate: "",
                currentVsBestUnitPrice: null,
                currentVsBestLabel: "",
                netChange: null,
                netChangePercent: null,
                averageUnitPrice: null,
                movementCount: 0,
                supplierCount: 0,
                supplierNames: [],
                firstDate: "",
                latestDate: ""
            };
        }
        const sortedRows = rows.slice().sort((left, right) => {
            if (left.effectiveTimestamp !== right.effectiveTimestamp) return left.effectiveTimestamp - right.effectiveTimestamp;
            return left.supplier.localeCompare(right.supplier);
        });
        const prices = sortedRows.map((row) => Number(row.unitPrice)).filter(Number.isFinite);
        const first = sortedRows[0];
        const latest = sortedRows[sortedRows.length - 1];
        const lowestUnitPrice = prices.length ? Math.min(...prices) : null;
        const lowestPriceRow = lowestUnitPrice == null
            ? null
            : [...sortedRows].reverse().find((row) => Number(row.unitPrice) === lowestUnitPrice) || null;
        const highestUnitPrice = prices.length ? Math.max(...prices) : null;
        const highestPriceRow = highestUnitPrice == null
            ? null
            : [...sortedRows].reverse().find((row) => Number(row.unitPrice) === highestUnitPrice) || null;
        const averageUnitPrice = prices.length ? prices.reduce((sum, value) => sum + value, 0) / prices.length : null;
        const netChange = Number.isFinite(first.unitPrice) && Number.isFinite(latest.unitPrice) ? latest.unitPrice - first.unitPrice : null;
        const netChangePercent = netChange != null && first.unitPrice ? (netChange / first.unitPrice) * 100 : null;
        const currentVsBestUnitPrice = latest && lowestPriceRow && Number.isFinite(latest.unitPrice) && Number.isFinite(lowestPriceRow.unitPrice)
            ? Math.max(Number(latest.unitPrice) - Number(lowestPriceRow.unitPrice), 0)
            : null;
        const supplierNames = Array.from(new Set(sortedRows.map((row) => row.supplier).filter(Boolean)));
        return {
            latestUnitPrice: latest.unitPrice,
            latestUnitPriceSupplier: latest.supplier || "",
            latestUnitPriceDate: formatDate(latest.quoteDate || latest.createdAt),
            lowestUnitPrice,
            lowestUnitPriceSupplier: lowestPriceRow?.supplier || "",
            lowestUnitPriceDate: lowestPriceRow ? formatDate(lowestPriceRow.quoteDate || lowestPriceRow.createdAt) : "",
            highestUnitPrice,
            highestUnitPriceSupplier: highestPriceRow?.supplier || "",
            highestUnitPriceDate: highestPriceRow ? formatDate(highestPriceRow.quoteDate || highestPriceRow.createdAt) : "",
            currentVsBestUnitPrice,
            currentVsBestLabel: currentVsBestUnitPrice === 0
                ? "Matches best recorded price"
                : `${latest.supplier || "Current supplier"} above best recorded price`,
            netChange,
            netChangePercent,
            averageUnitPrice,
            movementCount: sortedRows.length,
            supplierCount: supplierNames.length,
            supplierNames,
            firstDate: formatDate(first.quoteDate || first.createdAt),
            latestDate: formatDate(latest.quoteDate || latest.createdAt)
        };
    }

    function buildHistorySeriesInsights(rows) {
        if (!rows.length) return [];
        const summary = buildHistorySeriesSummary(rows);
        const sortedRows = rows.slice().sort((left, right) => left.effectiveTimestamp - right.effectiveTimestamp);
        const first = sortedRows[0];
        const latest = sortedRows[sortedRows.length - 1];
        const lowestRow = summary.lowestUnitPrice == null
            ? null
            : [...sortedRows].reverse().find((row) => Number(row.unitPrice) === Number(summary.lowestUnitPrice)) || null;
        const highestRow = summary.highestUnitPrice == null
            ? null
            : [...sortedRows].reverse().find((row) => Number(row.unitPrice) === Number(summary.highestUnitPrice)) || null;
        const visibleCurrency = latest?.currency || first?.currency || "USD";
        return [
            lowestRow
                ? `Best recorded price: ${formatCurrency(lowestRow.unitPrice || 0, lowestRow.currency || visibleCurrency)} from ${lowestRow.supplier || "Supplier missing"} on ${formatDate(lowestRow.quoteDate || lowestRow.createdAt)}.`
                : "Best recorded price is not available.",
            highestRow
                ? `Highest observed price: ${formatCurrency(highestRow.unitPrice || 0, highestRow.currency || visibleCurrency)} from ${highestRow.supplier || "Supplier missing"} on ${formatDate(highestRow.quoteDate || highestRow.createdAt)}.`
                : "Highest observed price is not available.",
            latest && lowestRow && Number(latest.unitPrice) === Number(lowestRow.unitPrice)
                ? "Current supplier is already at the best price."
                : `Current supplier is ${summary.currentVsBestUnitPrice == null ? "--" : formatCurrency(summary.currentVsBestUnitPrice, visibleCurrency)} above the best recorded price.`,
            `Price volatility is ${getHistoryVolatilityLabel(sortedRows).toLowerCase()} across ${summary.movementCount} movements.`
        ];
    }

    function renderHistoryDetailChartFallback(elements, message) {
        const shell = elements.app?.querySelector(".qc2-history-chart-shell");
        if (!shell) return;
        shell.innerHTML = `<div class="decision-list-empty">${escapeHtml(message)}</div>`;
    }

    function renderHistoryDetailSvgChart(elements, rows) {
        const shell = elements.app?.querySelector(".qc2-history-chart-shell");
        if (!shell || !rows.length) return;

        const prices = rows.map((row) => Number(row.unitPrice)).filter(Number.isFinite);
        if (!prices.length) {
            renderHistoryDetailChartFallback(elements, "Chart unavailable for this series.");
            return;
        }

        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceRange = maxPrice - minPrice || 1;
        const width = 900;
        const height = 320;
        const paddingX = 36;
        const paddingY = 28;
        const innerWidth = width - paddingX * 2;
        const innerHeight = height - paddingY * 2;
        const stepX = rows.length > 1 ? innerWidth / (rows.length - 1) : 0;
        const points = rows.map((row, index) => {
            const value = Number(row.unitPrice);
            const x = paddingX + (stepX * index);
            const y = paddingY + innerHeight - (((value - minPrice) / priceRange) * innerHeight);
            return { x, y, value, row };
        });
        const linePath = points
            .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
            .join(" ");
        const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(2)} ${(height - paddingY).toFixed(2)} L ${points[0].x.toFixed(2)} ${(height - paddingY).toFixed(2)} Z`;

        shell.innerHTML = `
            <svg class="qc2-history-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Selected product unit price trend chart" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="qc2HistoryDetailLine" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="rgba(147, 197, 253, 1)" />
                        <stop offset="100%" stop-color="rgba(56, 189, 248, 0.32)" />
                    </linearGradient>
                    <linearGradient id="qc2HistoryDetailFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="rgba(96, 165, 250, 0.18)" />
                        <stop offset="100%" stop-color="rgba(56, 189, 248, 0.02)" />
                    </linearGradient>
                </defs>
                <path d="${areaPath}" fill="url(#qc2HistoryDetailFill)"></path>
                <path d="${linePath}" fill="none" stroke="url(#qc2HistoryDetailLine)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>
                ${points.map((point) => `
                    <g>
                        <circle cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="4" fill="#dbeafe" stroke="#ffffff" stroke-width="2"></circle>
                        <title>${escapeHtml(`${formatDate(point.row.effectiveDate)} | ${point.row.supplier || "Supplier missing"} | ${formatCurrency(point.value, point.row.currency)}`)}</title>
                    </g>
                `).join("")}
            </svg>
        `;
    }

    function renderHistoryDetailChart(elements, state, attempt = 0) {
        const chartStartedAt = performance.now();
        const chartDataStartedAt = performance.now();
        const modalSeriesRows = Array.isArray(state.historyDetailModalSeries?.rows) ? state.historyDetailModalSeries.rows : [];
        if (!state.historyDetailModalOpen || !modalSeriesRows.length) return;
        const validRows = modalSeriesRows
            .filter((row) => row.effectiveDate && Number.isFinite(Number(row.unitPrice)))
            .sort((left, right) => {
                const leftTime = new Date(left.effectiveDate).getTime();
                const rightTime = new Date(right.effectiveDate).getTime();
                if (leftTime !== rightTime) return leftTime - rightTime;
                return left.supplier.localeCompare(right.supplier);
            });
        const chartDataBuiltAt = performance.now();
        if (!validRows.length) {
            renderHistoryDetailChartFallback(elements, "Chart unavailable for this series.");
            return;
        }
        if (typeof Chart === "undefined") {
            if (attempt < 6) {
                requestAnimationFrame(() => renderHistoryDetailChart(elements, state, attempt + 1));
            } else {
                renderHistoryDetailSvgChart(elements, validRows);
            }
            return;
        }
        const canvas = elements.app?.querySelector("[data-qc-history-detail-chart]");
        if (!canvas) {
            if (attempt < 6) {
                requestAnimationFrame(() => renderHistoryDetailChart(elements, state, attempt + 1));
            } else {
                renderHistoryDetailSvgChart(elements, validRows);
            }
            return;
        }
        const context = canvas.getContext("2d");
        if (!context) {
            if (attempt < 6) {
                requestAnimationFrame(() => renderHistoryDetailChart(elements, state, attempt + 1));
            } else {
                renderHistoryDetailSvgChart(elements, validRows);
            }
            return;
        }
        if ((!canvas.clientWidth || !canvas.clientHeight) && attempt < 6) {
            requestAnimationFrame(() => renderHistoryDetailChart(elements, state, attempt + 1));
            return;
        }
        if (window.qcHistoryDetailChartInstance) {
            window.qcHistoryDetailChartInstance.destroy();
            window.qcHistoryDetailChartInstance = null;
        }
        if (state.historyDetailChart) {
            state.historyDetailChart.destroy();
            state.historyDetailChart = null;
        }
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        const themeText = "rgba(226, 232, 240, 0.84)";
        const themeGrid = "rgba(148, 163, 184, 0.10)";
        state.historyDetailChart = new Chart(context, {
            type: "line",
            data: {
                labels: validRows.map((row) => formatDate(row.effectiveDate)),
                datasets: [{
                    label: "Unit Price",
                    data: validRows.map((row) => Number(row.unitPrice)),
                    tension: 0.35,
                    borderWidth: 3,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    pointBorderWidth: 2,
                    pointBackgroundColor: "#dbeafe",
                    pointBorderColor: "#ffffff",
                    pointHoverBackgroundColor: "#ffffff",
                    pointHoverBorderColor: "#7dd3fc",
                    fill: true,
                    borderColor(chartContext) {
                        const { chart } = chartContext;
                        const area = chart.chartArea;
                        if (!area) return "#7dd3fc";
                        const gradient = chart.ctx.createLinearGradient(area.left, area.top, area.left, area.bottom);
                        gradient.addColorStop(0, "rgba(147, 197, 253, 1)");
                        gradient.addColorStop(1, "rgba(56, 189, 248, 0.28)");
                        return gradient;
                    },
                    backgroundColor(chartContext) {
                        const { chart } = chartContext;
                        const area = chart.chartArea;
                        if (!area) return "rgba(56, 189, 248, 0.12)";
                        const gradient = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
                        gradient.addColorStop(0, "rgba(96, 165, 250, 0.20)");
                        gradient.addColorStop(1, "rgba(56, 189, 248, 0.02)");
                        return gradient;
                    }
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 720,
                    easing: "easeOutQuart"
                },
                interaction: {
                    mode: "nearest",
                    intersect: false
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        displayColors: false,
                        backgroundColor: "rgba(15, 23, 42, 0.96)",
                        borderColor: "rgba(125, 167, 255, 0.20)",
                        borderWidth: 1,
                        padding: 12,
                        titleColor: "#f8fafc",
                        bodyColor: "#dbeafe",
                        callbacks: {
                            title(items) {
                                return items[0]?.label || "";
                            },
                            label(context) {
                                const row = validRows[context.dataIndex];
                                return [
                                    `Supplier: ${row.supplier || "Supplier missing"}`,
                                    `Unit Price: ${formatCurrency(row.unitPrice, row.currency)}`,
                                    `Quantity: ${row.quantity || 0}`,
                                    `Total: ${formatCurrency(row.totalPrice, row.currency)}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: themeGrid,
                            drawBorder: false
                        },
                        ticks: {
                            color: themeText,
                            maxRotation: 0,
                            autoSkip: true
                        }
                    },
                    y: {
                        grid: {
                            color: themeGrid,
                            display: false
                        },
                        ticks: {
                            color: themeText,
                            callback(value) {
                                return formatCurrency(Number(value), validRows[validRows.length - 1]?.currency || "USD");
                            }
                        }
                    }
                }
            }
        });
        window.qcHistoryDetailChartInstance = state.historyDetailChart;
        console.info("[compare prices chart render]", {
            rows: validRows.length,
            chartDataBuildMs: Number((chartDataBuiltAt - chartDataStartedAt).toFixed(1)),
            durationMs: Number((performance.now() - chartStartedAt).toFixed(1))
        });
    }

    function renderHistorySeriesChart(rows) {
        if (!rows.length) {
            return '<div class="decision-list-empty">No movement points are available for this series.</div>';
        }
        return `
            <div class="qc2-history-chart-shell">
                <canvas class="qc2-history-chart" data-qc-history-detail-chart aria-label="Selected product unit price trend chart"></canvas>
            </div>
        `;
    }

    function getHistoryHeaderSortDirection(state, columnKey) {
        const currentSort = normalizeHistorySort(state.historySort);
        if (currentSort.key !== columnKey || !currentSort.direction) return null;
        return currentSort.direction;
    }

    function getHistoryHeaderSortIndicator(state, columnKey) {
        const direction = getHistoryHeaderSortDirection(state, columnKey);
        if (direction === "asc") return "↑";
        if (direction === "desc") return "↓";
        return "↕";
    }

    function getHistoryHeaderSortHint(state, columnKey) {
        const direction = getHistoryHeaderSortDirection(state, columnKey);
        if (direction === "asc") return "Sorted ascending";
        if (direction === "desc") return "Sorted descending";
        return "Click to sort";
    }

    function getHistoryHeaderAriaSort(state, columnKey) {
        const direction = getHistoryHeaderSortDirection(state, columnKey);
        if (direction === "asc") return "ascending";
        if (direction === "desc") return "descending";
        return "none";
    }

    function moveHistoryColumn(state, draggedKey, targetKey) {
        if (!draggedKey || !targetKey || draggedKey === targetKey) return false;
        const orderedKeys = normalizeHistoryColumnOrder(state.historyColumnOrder);
        const draggedIndex = orderedKeys.indexOf(draggedKey);
        const targetIndex = orderedKeys.indexOf(targetKey);
        if (draggedIndex < 0 || targetIndex < 0) return false;
        orderedKeys.splice(draggedIndex, 1);
        orderedKeys.splice(targetIndex, 0, draggedKey);
        state.historyColumnOrder = orderedKeys;
        persistHistoryColumnOrder(state);
        return true;
    }

    function scrollHistorySectionIntoView(elements) {
        if (!elements.app) return;
        const anchor = elements.app.querySelector('[data-qc-anchor="history-top"]');
        if (!anchor) return;
        const context = getScrollContext(elements);
        if (context.type === "element") {
            const containerRect = context.target.getBoundingClientRect();
            const anchorRect = anchor.getBoundingClientRect();
            const nextTop = context.target.scrollTop + (anchorRect.top - containerRect.top);
            context.target.scrollTo({ top: Math.max(nextTop, 0), behavior: "auto" });
            return;
        }
        const nextTop = (window.scrollY || context.target.scrollTop || 0) + anchor.getBoundingClientRect().top;
        window.scrollTo({ top: Math.max(nextTop, 0), behavior: "auto" });
    }

    function buildPersistedState(state) {
        syncQuoteCompareStepState(state);
        updateLastQuoteCompareScreen(state);
        const hasServerBackedSession = Boolean(String(state.activeSessionId || "").trim());
        const lightweightAnalysisResult = state.analysisResult
            ? {
                comparison: state.analysisResult.comparison || null,
                evaluation: state.analysisResult.evaluation || null
            }
            : null;
        return {
            currentStep: state.currentStep,
            currentScreen: state.currentScreen,
            lastQuoteCompareScreen: state.lastQuoteCompareScreen,
            lastFlowScreen: state.lastFlowScreen,
            mode: state.mode,
            analyzeMode: state.analyzeMode,
            analysisResult: lightweightAnalysisResult,
            uploadReview: hasServerBackedSession ? null : state.uploadReview,
            headers: hasServerBackedSession ? [] : state.headers,
            rows: state.analysisResult ? [] : state.rows,
            detectedMappings: state.detectedMappings,
            selectedMappings: state.selectedMappings,
            activeSessionId: state.activeSessionId,
            demoMode: state.demoMode,
            demoSessionId: state.demoSessionId,
            dataScope: state.dataScope,
            manualUploadId: state.manualUploadId,
            historyFilters: state.historyFilters,
            historyFocusedSeriesKey: state.historyFocusedSeriesKey,
            historyColumnVisibility: state.historyColumnVisibility,
            historyColumnOrder: state.historyColumnOrder,
            historySort: state.historySort,
            historySelectedSeriesKey: state.historySelectedSeriesKey,
            historySelectedProductName: state.historySelectedProductName,
            historySelectedUnit: state.historySelectedUnit,
            historySelectedRowId: state.historySelectedRowId,
            historyDetailModalOpen: state.historyDetailModalOpen,
            historyDetailModalSeries: state.historyDetailModalSeries,
            savedComparisons: [],
            collapsedDecisionCards: state.collapsedDecisionCards,
            spotlightTableFilterKey: state.spotlightTableFilterKey,
            activeProductFilter: state.activeProductFilter,
            selectedAnalysisRowKey: state.selectedAnalysisRowKey,
            analysisTableFilter: state.analysisTableFilter,
            analysisTableSearch: state.analysisTableSearch,
            analysisTableSort: state.analysisTableSort,
            activeAnalyzeTab: state.activeAnalyzeTab,
            showOpportunitySection: state.showOpportunitySection,
            showFullComparison: state.showFullComparison,
            showOptimizedSummary: state.showOptimizedSummary,
            fullComparisonTableScroll: state.fullComparisonTableScroll,
            previousAnalyzeTab: state.previousAnalyzeTab,
            manualRows: state.manualRows,
            status: state.status
        };
    }

    function persistQuoteCompareSession(state, elements) {
        const persistStartedAt = performance.now();
        try {
            const serializedState = JSON.stringify(buildPersistedState(state));
            if (serializedState !== state.lastPersistedSnapshot) {
                sessionStorage.setItem(QUOTE_COMPARE_STATE_KEY, serializedState);
                state.lastPersistedSnapshot = serializedState;
            }
            sessionStorage.setItem(QUOTE_COMPARE_SCROLL_KEY, JSON.stringify({ top: readScrollPosition(elements) }));
        } catch (error) {
            // Ignore storage failures.
        } finally {
            console.info("[compare prices session persist]", {
                screen: state.currentScreen,
                durationMs: Number((performance.now() - persistStartedAt).toFixed(1)),
                snapshotKb: Number((((state.lastPersistedSnapshot || "").length) / 1024).toFixed(1))
            });
        }
    }

    function clearQuoteComparePersistIdleHandle(state) {
        if (state.persistSessionIdleHandle && typeof window.cancelIdleCallback === "function") {
            window.cancelIdleCallback(state.persistSessionIdleHandle);
        } else if (state.persistSessionIdleHandle) {
            window.clearTimeout(state.persistSessionIdleHandle);
        }
        state.persistSessionIdleHandle = 0;
    }

    function scheduleQuoteCompareSessionPersistWhenIdle(state, elements) {
        clearQuoteComparePersistIdleHandle(state);
        const persistTask = () => {
            state.persistSessionIdleHandle = 0;
            persistQuoteCompareSession(state, elements);
        };
        if (typeof window.requestIdleCallback === "function") {
            state.persistSessionIdleHandle = window.requestIdleCallback(persistTask, { timeout: 250 });
            return;
        }
        state.persistSessionIdleHandle = window.setTimeout(persistTask, 0);
    }

    function scheduleQuoteCompareSessionPersist(state, elements) {
        window.clearTimeout(state.persistSessionTimer);
        state.persistSessionTimer = window.setTimeout(() => {
            scheduleQuoteCompareSessionPersistWhenIdle(state, elements);
        }, 180);
    }

    function clearPersistedQuoteCompareState() {
        try {
            sessionStorage.removeItem(QUOTE_COMPARE_ACTIVE_SESSION_KEY);
            sessionStorage.removeItem(QUOTE_COMPARE_STATE_KEY);
            sessionStorage.removeItem(QUOTE_COMPARE_SCROLL_KEY);
            sessionStorage.removeItem(QUOTE_COMPARE_LAST_SCREEN_KEY);
            if (window.__analysisScopeBootstrapCache && typeof window.__analysisScopeBootstrapCache === "object") {
                window.__analysisScopeBootstrapCache = {};
            }
        } catch (error) {
            // Ignore storage failures.
        }
    }

    function updateLastQuoteCompareScreen(state) {
        if (!state || !state.currentScreen) return;
        const snapshot = {
            currentScreen: state.currentScreen,
            currentStep: Number(state.currentStep || getQuoteCompareStepForScreen(state) || 1)
        };
        state.lastQuoteCompareScreen = snapshot;
        try {
            sessionStorage.setItem(QUOTE_COMPARE_LAST_SCREEN_KEY, JSON.stringify(snapshot));
        } catch (error) {
            // Ignore storage failures.
        }
    }

    function readLastQuoteCompareScreen() {
        try {
            const parsed = JSON.parse(sessionStorage.getItem(QUOTE_COMPARE_LAST_SCREEN_KEY) || "null");
            if (!parsed || typeof parsed !== "object") return null;
            return {
                currentScreen: String(parsed.currentScreen || "").trim(),
                currentStep: Number(parsed.currentStep || 0)
            };
        } catch (error) {
            return null;
        }
    }

    function applyLastQuoteCompareScreen(state, snapshot) {
        if (!snapshot?.currentScreen) return false;
        const targetScreen = snapshot.currentScreen;
        const targetStep = Number(snapshot.currentStep || 0);
        if (targetScreen === "history" && hasRestorableAnalyzeContext(state)) {
            state.currentScreen = "history";
            state.currentStep = 4;
            return true;
        }
        if (targetScreen === "analyze" && hasRestorableAnalyzeContext(state)) {
            state.currentScreen = "analyze";
            state.currentStep = 3;
            return true;
        }
        if (targetScreen === "review" && hasRestorableReviewContext(state)) {
            state.currentScreen = "review";
            state.currentStep = 2;
            return true;
        }
        if (targetScreen === "start" || targetStep === 1) {
            state.currentScreen = "start";
            state.currentStep = 1;
            return true;
        }
        return false;
    }

    function shouldForceQuoteCompareStart() {
        try {
            return new URLSearchParams(window.location.search || "").get("start") === "home";
        } catch (error) {
            return false;
        }
    }

    function clearForcedQuoteCompareStartFlag() {
        try {
            const url = new URL(window.location.href);
            if (url.searchParams.get("start") !== "home") {
                return;
            }
            url.searchParams.delete("start");
            window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
        } catch (error) {
            // Ignore URL cleanup failures.
        }
    }

    function resetQuoteCompareUploadState(state, message = "") {
        state.file = null;
        state.headers = [];
        state.rows = [];
        state.detectedMappings = {};
        state.selectedMappings = {};
        state.validation = { mappedCount: 0, missingFields: [...REQUIRED_FIELDS], duplicateColumns: [], ready: false };
        state.analysisResult = null;
        state.uploadReview = null;
        state.activeSessionId = "";
        state.demoMode = false;
        state.demoSessionId = "";
        state.dataScope = "current_upload";
        state.manualUploadId = createManualUploadId();
        state.productSummaryModalOpen = false;
        state.productSummaryModalData = null;
        state.parseError = "";
        state.isParsing = false;
        state.isSubmitting = false;
        state.spotlightTableFilterKey = "";
        state.activeProductFilter = null;
        state.selectedAnalysisRowKey = "";
        state.currentScreen = "start";
        state.currentStep = 1;
        state.lastQuoteCompareScreen = { currentScreen: "start", currentStep: 1 };
        state.lastFlowScreen = "review";
        clearPersistedQuoteCompareState();
        writeSharedDataScope("current_upload", "");
        if (message) {
            setStatus(state, message, "info");
        }
    }

    function enterDemoSafeStartState(state, message = "") {
        resetQuoteCompareUploadState(state, message);
        state.demoMode = true;
        state.demoSessionId = "";
        state.dataScope = "demo";
        state.currentScreen = "start";
        state.currentStep = 1;
        state.lastQuoteCompareScreen = { currentScreen: "start", currentStep: 1 };
        state.hasSharedScopeAnalysis = false;
        state.dataScopeSummary = null;
        writeSharedDataScope("demo", "");
    }

    function clearDemoMode(state) {
        state.demoMode = false;
        state.demoSessionId = "";
        state.dataScope = "current_upload";
        writeSharedDataScope("current_upload", "");
    }

    function clearQuoteCompareFrontendCaches() {
        if (window.__analysisScopeBootstrapCache && typeof window.__analysisScopeBootstrapCache === "object") {
            window.__analysisScopeBootstrapCache = {};
        }
        console.info("[PERF] quote_compare.reset.cache_cleared", {
            clearedAnalysisScopeCache: true,
            preservedMappingMemory: true
        });
    }

    function resetQuoteCompareFrontendState(elements, state) {
        cancelRestoreAnalyzeDeferredRender(state);
        window.clearTimeout(state.persistSessionTimer);
        window.clearTimeout(state.analysisFilterTimer);
        window.clearTimeout(state.historyRowClickTimer);
        clearQuoteComparePersistIdleHandle(state);
        clearPersistedQuoteCompareState();
        clearQuoteCompareFrontendCaches();

        const freshState = createState();
        Object.keys(state).forEach((key) => {
            if (!(key in freshState)) {
                delete state[key];
            }
        });
        Object.assign(state, freshState);
        state.lastPersistedSnapshot = "";
        state.hasSharedScopeAnalysis = false;
        state.dataScopeSummary = null;

        setSharedAnalysisAvailability(false);
        if (elements.quoteDataScopeSummary) {
            elements.quoteDataScopeSummary.textContent = "No analyzed file yet";
        }
        if (elements.continueAnalysisButton) {
            elements.continueAnalysisButton.hidden = true;
        }
        renderApp(elements, state);
        writeScrollPosition(elements, 0);
        console.info("[PERF] quote_compare.reset.frontend_state_cleared", {
            currentScreen: state.currentScreen,
            currentStep: state.currentStep
        });
        console.info("[PERF] quote_compare.reset.empty_state_rendered", {
            currentScreen: state.currentScreen,
            hasAnalysis: Boolean(state.hasSharedScopeAnalysis)
        });
    }

    function hydratePersistedState(state, snapshot) {
        if (!snapshot || typeof snapshot !== "object") return;
        state.currentStep = Number(snapshot.currentStep || state.currentStep || 1);
        state.currentScreen = snapshot.currentScreen || state.currentScreen;
        state.lastQuoteCompareScreen = snapshot.lastQuoteCompareScreen || state.lastQuoteCompareScreen;
        state.lastFlowScreen = snapshot.lastFlowScreen || state.lastFlowScreen;
        state.mode = snapshot.mode || state.mode;
        state.analyzeMode = snapshot.analyzeMode || state.analyzeMode;
        state.analysisResult = snapshot.analysisResult || state.analysisResult;
        state.uploadReview = snapshot.uploadReview || state.uploadReview;
        state.headers = snapshot.headers || state.headers;
        state.rows = snapshot.rows || state.rows;
        state.detectedMappings = snapshot.detectedMappings || state.detectedMappings;
        state.selectedMappings = snapshot.selectedMappings || state.selectedMappings;
        state.activeSessionId = snapshot.activeSessionId || state.activeSessionId;
        state.demoMode = Boolean(snapshot.demoMode);
        state.demoSessionId = snapshot.demoSessionId || state.demoSessionId;
        state.dataScope = snapshot.dataScope || (state.demoMode ? "demo" : state.dataScope);
        state.manualUploadId = snapshot.manualUploadId || state.manualUploadId;
        state.historyFilters = { ...state.historyFilters, ...(snapshot.historyFilters || {}) };
        state.historyFocusedSeriesKey = snapshot.historyFocusedSeriesKey || state.historyFocusedSeriesKey;
        state.historyColumnVisibility = normalizeHistoryColumnKeys(snapshot.historyColumnVisibility || state.historyColumnVisibility);
        state.historyColumnOrder = normalizeHistoryColumnOrder(snapshot.historyColumnOrder || state.historyColumnOrder);
        state.historySort = normalizeHistorySort(snapshot.historySort || state.historySort);
        state.historySelectedSeriesKey = snapshot.historySelectedSeriesKey || state.historySelectedSeriesKey;
        state.historySelectedProductName = snapshot.historySelectedProductName || state.historySelectedProductName;
        state.historySelectedUnit = snapshot.historySelectedUnit || state.historySelectedUnit;
        state.historySelectedRowId = snapshot.historySelectedRowId || state.historySelectedRowId;
        state.historyDetailModalOpen = Boolean(snapshot.historyDetailModalOpen);
        state.historyDetailModalSeries = snapshot.historyDetailModalSeries || state.historyDetailModalSeries;
        state.savedComparisons = Array.isArray(snapshot.savedComparisons) ? snapshot.savedComparisons : state.savedComparisons;
        state.collapsedDecisionCards = snapshot.collapsedDecisionCards || state.collapsedDecisionCards;
        state.spotlightTableFilterKey = snapshot.spotlightTableFilterKey || state.spotlightTableFilterKey;
        state.activeProductFilter = snapshot.activeProductFilter || state.activeProductFilter;
        state.selectedAnalysisRowKey = snapshot.currentScreen === "analyze"
            ? ""
            : (snapshot.selectedAnalysisRowKey || state.selectedAnalysisRowKey);
        state.analysisTableFilter = snapshot.analysisTableFilter || state.analysisTableFilter;
        state.analysisTableSearch = snapshot.analysisTableSearch || state.analysisTableSearch;
        state.analysisTableSort = snapshot.analysisTableSort || state.analysisTableSort;
        state.activeAnalyzeTab = snapshot.activeAnalyzeTab || state.activeAnalyzeTab;
        state.showOpportunitySection = snapshot.showOpportunitySection !== false;
        state.showFullComparison = Boolean(snapshot.showFullComparison);
        state.showOptimizedSummary = Boolean(snapshot.showOptimizedSummary);
        state.fullComparisonTableScroll = snapshot.fullComparisonTableScroll || state.fullComparisonTableScroll;
        state.previousAnalyzeTab = snapshot.previousAnalyzeTab || state.previousAnalyzeTab;
        state.manualRows = Array.isArray(snapshot.manualRows) && snapshot.manualRows.length ? snapshot.manualRows : state.manualRows;
        state.status = snapshot.status || state.status;
        state.qcHistoryData = [];
        sanitizeQuoteCompareStepState(state);
    }

    function restoreQuoteCompareSession(state) {
        try {
            const rawSnapshot = sessionStorage.getItem(QUOTE_COMPARE_STATE_KEY) || "null";
            const snapshot = JSON.parse(rawSnapshot);
            hydratePersistedState(state, snapshot);
            state.lastPersistedSnapshot = rawSnapshot;
        } catch (error) {
            // Ignore invalid session payloads.
        }
        sanitizeQuoteCompareStepState(state);
    }

    function getQuoteCompareStepForScreen(state) {
        if (state.currentScreen === "history") return 4;
        if (state.currentScreen === "analyze") return 3;
        if (state.currentScreen === "review") return 2;
        return 1;
    }

    function syncQuoteCompareStepState(state) {
        state.currentStep = getQuoteCompareStepForScreen(state);
    }

    function sanitizeQuoteCompareStepState(state) {
        const hasReviewContext = hasRestorableReviewContext(state);
        const hasAnalyzeContext = hasRestorableAnalyzeContext(state);
        const step = Number(state.currentStep || getQuoteCompareStepForScreen(state) || 1);

        if (step === 2) {
            if (state.mode === "upload" && !hasReviewContext) {
                state.currentScreen = "start";
                state.currentStep = 1;
                return;
            }
            state.currentScreen = "review";
            state.currentStep = 2;
            return;
        }

        if (step >= 3 || state.currentScreen === "analyze" || state.currentScreen === "history") {
            if (!hasAnalyzeContext) {
                if (state.mode === "upload" && hasReviewContext) {
                    state.currentScreen = "review";
                    state.currentStep = 2;
                } else {
                    state.currentScreen = "start";
                    state.currentStep = 1;
                }
                return;
            }
            state.currentScreen = step === 4 ? "history" : "analyze";
            state.currentStep = step === 4 ? 4 : 3;
            return;
        }

        syncQuoteCompareStepState(state);
    }

    function restoreHistoryUiPreferences(state) {
        restoreHistoryColumnPreferences(state);
        restoreHistoryColumnOrder(state);
    }

    function restoreQuoteCompareScroll(elements) {
        let savedTop = null;
        try {
            const saved = JSON.parse(sessionStorage.getItem(QUOTE_COMPARE_SCROLL_KEY) || "null");
            savedTop = Number(saved?.top);
        } catch (error) {
            savedTop = null;
        }
        if (!Number.isFinite(savedTop)) return;

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                writeScrollPosition(elements, savedTop);
            });
        });
    }

    function isValidSelectedMappingSet(selectedMappings, headers) {
        if (!selectedMappings || typeof selectedMappings !== "object") return false;
        const headerSet = new Set(Array.isArray(headers) ? headers : []);
        return Object.values(selectedMappings).every((columnName) => !columnName || headerSet.has(columnName));
    }

    function isValidRestorableReviewSession(activeSession) {
        const dataframe = activeSession?.dataframe;
        const hasHydratedDataframe = Boolean(
            dataframe
            && Array.isArray(dataframe.columns)
            && dataframe.columns.length
            && Array.isArray(dataframe.records)
        );
        const hasCachedUpload = Boolean(String(activeSession?.cached_upload_path || activeSession?.file_path || "").trim());
        return Boolean(
            activeSession
            && Array.isArray(activeSession.headers)
            && activeSession.headers.length
            && (hasHydratedDataframe || hasCachedUpload)
        );
    }

    function isValidRestorableAnalyzeSession(activeSession) {
        return Boolean(
            isValidRestorableReviewSession(activeSession)
            && activeSession.step === "analyze"
            && activeSession.comparison
            && activeSession.evaluation
        );
    }

    function hasRestorableReviewContext(state) {
        return Boolean(
            state
            && Array.isArray(state.headers)
            && state.headers.length
            && state.uploadReview
        );
    }

    function hasRestorableAnalyzeContext(state) {
        return Boolean(
            hasRestorableReviewContext(state)
            && state.analysisResult
            && state.analysisResult.comparison
            && state.analysisResult.evaluation
        );
    }

    function hasRestorableQuoteCompareContext(state) {
        return hasRestorableAnalyzeContext(state) || hasRestorableReviewContext(state);
    }

    async function fetchActiveQuoteCompareSession(sessionId) {
        if (!sessionId) return null;
        const data = await fetchJson(`/quote-compare/bootstrap?session_id=${encodeURIComponent(sessionId)}`);
        return data.active_session || null;
    }

    function openDateInputPicker(input) {
        if (!input || input.disabled) return;
        input.focus({ preventScroll: true });
        if (typeof input.showPicker === "function") {
            try {
                input.showPicker();
                return;
            } catch (error) {
                // Fall back to native click behavior below.
            }
        }
        input.click();
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function formatCurrency(value, currency = "USD") {
        const numericValue = Number(value || 0);
        return Number.isFinite(numericValue)
            ? numericValue.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            })
            : "0.00";
    }

    function formatPercent(value) {
        return `${Number(value || 0).toFixed(1)}%`;
    }

    function formatQuantity(value) {
        const numericValue = Number(value || 0);
        if (!Number.isFinite(numericValue)) return "0";
        if (Math.abs(numericValue % 1) < 0.0000001) {
            return String(Math.trunc(numericValue));
        }
        return numericValue.toFixed(2);
    }

    function parseDateValue(value, options = {}) {
        if (!value) return null;
        const normalizedValue = value instanceof Date ? value : String(value).trim();
        if (!normalizedValue) return null;
        if (normalizedValue instanceof Date) {
            const parsedDate = new Date(normalizedValue.getTime());
            if (options.endOfDay) parsedDate.setHours(23, 59, 59, 999);
            if (options.startOfDay) parsedDate.setHours(0, 0, 0, 0);
            return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
        }

        const dateOnlyMatch = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (dateOnlyMatch) {
            const [, yearText, monthText, dayText] = dateOnlyMatch;
            const year = Number(yearText);
            const monthIndex = Number(monthText) - 1;
            const day = Number(dayText);
            const parsedDate = options.endOfDay
                ? new Date(year, monthIndex, day, 23, 59, 59, 999)
                : new Date(year, monthIndex, day, 0, 0, 0, 0);
            return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
        }

        const parsed = new Date(normalizedValue);
        if (Number.isNaN(parsed.getTime())) return null;
        if (options.endOfDay) parsed.setHours(23, 59, 59, 999);
        if (options.startOfDay) parsed.setHours(0, 0, 0, 0);
        return parsed;
    }

    function formatDate(value) {
        const parsed = parseDateValue(value);
        if (!parsed) return "Not provided";
        return parsed.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    }

    function createEmptyManualRow() {
        return {
            product_name: "",
            supplier_name: "",
            unit: "",
            quantity: "",
            unit_price: "",
            quote_date: "",
            total_price: "",
            currency: "USD",
            delivery_time: "",
            payment_term: "",
            valid_until: "",
            notes: ""
        };
    }

    function createState() {
        return {
            currentStep: 1,
            currentScreen: "start",
            lastQuoteCompareScreen: { currentScreen: "start", currentStep: 1 },
            lastFlowScreen: "review",
            mode: "upload",
            analyzeMode: "compare",
            file: null,
            headers: [],
            rows: [],
            detectedMappings: {},
            selectedMappings: {},
            validation: { mappedCount: 0, missingFields: [...REQUIRED_FIELDS], duplicateColumns: [], ready: false },
            mappingReuseNotice: null,
            mappingReuseCandidate: null,
            normalizedRowsCache: null,
            analysisResult: null,
            uploadReview: null,
            activeSessionId: "",
            demoMode: false,
            demoSessionId: "",
            dataScope: "current_upload",
            manualUploadId: createManualUploadId(),
            hasSharedScopeAnalysis: false,
            dataScopeSummary: null,
            parseError: "",
            status: { message: "", tone: "" },
            isParsing: false,
            isSubmitting: false,
            isSaving: false,
            isHistoryLoading: false,
            manualRows: [createEmptyManualRow()],
            savedComparisons: [],
            qcHistoryData: [],
            hasLoadedSavedComparisons: false,
            collapsedDecisionCards: {},
            selectedAnalysisRowKey: "",
            analysisTableFilter: "all",
            analysisTableSearch: "",
            activeProductFilter: null,
            analysisTableSort: { key: "", direction: "" },
            analysisViewport: { start: 0, end: 80, scrollTop: 0 },
            activeAnalyzeTab: "savings",
            showOpportunitySection: true,
            showFullComparison: false,
            showOptimizedSummary: false,
            opportunityRenderCount: OPPORTUNITY_CARD_BATCH_SIZE,
            fullComparisonTableScroll: { top: 0, left: 0 },
            previousAnalyzeTab: "savings",
            historyColumnVisibility: getDefaultHistoryColumnKeys(),
            historyColumnOrder: getDefaultHistoryColumnKeys(),
            historySort: getDefaultHistorySort(),
            historyDrag: { key: "", suppressClick: false },
            historySelectedSeriesKey: "",
            historySelectedProductName: "",
            historySelectedUnit: "",
            historySelectedRowId: "",
            historyFocusedSeriesKey: "",
            historySelectedRows: [],
            historyDetailModalOpen: false,
            historyDetailModalSeries: null,
            historyDetailSuppliersExpanded: false,
            productSummaryModalOpen: false,
            productSummaryModalData: null,
            historyDetailChart: null,
            historyRowClickTimer: null,
            historyFilters: {
                product: "",
                supplier: "",
                dateFrom: "",
                dateTo: ""
            },
            historyFilterUi: {
                queries: {
                    product: "",
                    supplier: ""
                },
                selectedDisplayValues: {
                    product: "",
                    supplier: ""
                }
            },
            persistSessionTimer: null,
            persistSessionIdleHandle: 0,
            analysisFilterTimer: null,
            historyRefreshFrame: 0,
            historyMemo: null,
            analysisMemo: null,
            historyViewport: { start: 0, end: 120, scrollTop: 0 },
            spotlightTableFilterKey: "",
            progressPhase: "",
            restorePerf: null,
            deferPersistUntilStablePaint: false,
            deferPersistUntilPostConfirmPaint: false,
            restoreAnalyzeSettled: true,
            restoreTargetOpportunityRenderCount: OPPORTUNITY_CARD_BATCH_SIZE,
            restoreTargetAnalysisViewport: null,
            restoreDeferredRenderFrame: 0,
            pendingPostConfirmScopePayload: null,
            confirmResponseReceivedAt: 0
        };
    }

    async function fetchJson(url, options = {}) {
        const fetchStartedAt = performance.now();
        const method = options.method || "GET";
        const requestKey = `${method} ${url}`;
        if (!window.__quoteCompareFetchTracker || typeof window.__quoteCompareFetchTracker !== "object") {
            window.__quoteCompareFetchTracker = { counts: {}, inflight: {} };
        }
        const tracker = window.__quoteCompareFetchTracker;
        tracker.counts[requestKey] = Number(tracker.counts[requestKey] || 0) + 1;
        const requestNumber = tracker.counts[requestKey];
        const inflightBeforeStart = Number(tracker.inflight[requestKey] || 0);
        tracker.inflight[requestKey] = inflightBeforeStart + 1;
        console.info("[compare prices fetch start]", {
            url,
            method,
            requestNumber,
            duplicateRequest: requestNumber > 1,
            inflightDuplicate: inflightBeforeStart > 0
        });
        try {
            const response = await fetch(url, {
                method,
                headers: {
                    Accept: "application/json",
                    ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
                    ...(options.headers || {})
                },
                body: options.body
            });
            let data = {};
            try {
                data = await response.json();
            } catch (error) {
                data = {};
            }
            if (!response.ok || data.success === false) {
                throw new Error(data.message || "Request failed.");
            }
            console.info("[compare prices fetch end]", {
                url,
                method,
                requestNumber,
                durationMs: Number((performance.now() - fetchStartedAt).toFixed(1))
            });
            return data;
        } finally {
            tracker.inflight[requestKey] = Math.max(Number(tracker.inflight[requestKey] || 1) - 1, 0);
        }
    }

    function setStatus(state, message = "", tone = "") {
        state.status = { message, tone };
    }

    function renderStatus(state) {
        if (!state.status.message) return "";
        return `<div class="recipe-status${state.status.tone ? ` is-${escapeHtml(state.status.tone)}` : ""}">${escapeHtml(state.status.message)}</div>`;
    }

    function waitForNextPaint() {
        return new Promise((resolve) => {
            requestAnimationFrame(() => resolve());
        });
    }

    async function setProgressPhase(state, phaseLabel) {
        state.progressPhase = phaseLabel;
        setStatus(state, phaseLabel, "info");
        await waitForNextPaint();
    }

    function computeValidation(state) {
        const mapping = state.selectedMappings || {};
        const missingFields = REQUIRED_FIELDS.filter((fieldName) => !mapping[fieldName]);
        const duplicates = Object.entries(mapping).reduce((accumulator, [fieldName, columnName]) => {
            if (!columnName) return accumulator;
            accumulator[columnName] = accumulator[columnName] || [];
            accumulator[columnName].push(fieldName);
            return accumulator;
        }, {});
        const duplicateColumns = Object.entries(duplicates)
            .filter(([, fieldNames]) => fieldNames.length > 1)
            .map(([columnName, fieldNames]) => ({ columnName, fieldNames }));

        state.validation = {
            mappedCount: REQUIRED_FIELDS.length - missingFields.length,
            missingFields,
            duplicateColumns,
            ready: missingFields.length === 0 && duplicateColumns.length === 0
        };
    }

    function isHighConfidenceReview(review) {
        return HIGH_CONFIDENCE_MATCHES.has(String(review?.match_quality || "").toLowerCase());
    }

    function buildReviewMap(state) {
        return new Map(
            (state.uploadReview?.field_reviews || [])
                .map((item) => [item.field_name || item.field || "", item])
                .filter(([fieldName]) => Boolean(fieldName))
        );
    }

    function buildAutoMappings(state, { includePossible = false } = {}) {
        const reviewMap = buildReviewMap(state);
        const autoMappings = {};
        const usedColumns = new Set();
        [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].forEach((fieldName) => {
            const review = reviewMap.get(fieldName) || {};
            const detectedColumn = review.detected_column || state.detectedMappings?.[fieldName] || "";
            const canUseDetected = detectedColumn && (includePossible || isHighConfidenceReview(review));
            if (!canUseDetected || usedColumns.has(detectedColumn)) {
                autoMappings[fieldName] = "";
                return;
            }
            autoMappings[fieldName] = detectedColumn;
            usedColumns.add(detectedColumn);
        });
        return autoMappings;
    }

    function applyAutoMappings(state, options = {}) {
        state.selectedMappings = buildAutoMappings(state, options);
        computeValidation(state);
    }

    function clearMappings(state) {
        state.selectedMappings = Object.fromEntries(
            [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].map((fieldName) => [fieldName, ""])
        );
        state.mappingReuseNotice = null;
        computeValidation(state);
    }

    function buildHeadersSignature(headers) {
        return (Array.isArray(headers) ? headers : [])
            .map((header) => String(header || "").trim().toLowerCase())
            .join("|");
    }

    function buildMappingMemoryRecord(fileName, headers, mapping) {
        return {
            fileName: String(fileName || "").trim().toLowerCase(),
            headerSignature: buildHeadersSignature(headers),
            headers: Array.isArray(headers) ? headers.slice() : [],
            mapping: { ...(mapping || {}) },
            updatedAt: new Date().toISOString()
        };
    }

    function readMappingMemoryStore() {
        try {
            const parsed = JSON.parse(window.localStorage.getItem(QUOTE_COMPARE_MAPPING_MEMORY_KEY) || "[]");
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    }

    function writeMappingMemoryStore(records) {
        try {
            window.localStorage.setItem(QUOTE_COMPARE_MAPPING_MEMORY_KEY, JSON.stringify((records || []).slice(0, 24)));
        } catch (error) {
            return;
        }
    }

    function getSavedMappingCandidate(fileName, headers) {
        const normalizedName = String(fileName || "").trim().toLowerCase();
        if (!normalizedName) return null;
        const records = readMappingMemoryStore()
            .filter((record) => String(record?.fileName || "") === normalizedName)
            .sort((left, right) => String(right.updatedAt || "").localeCompare(String(left.updatedAt || "")));
        if (!records.length) return null;
        const headerSignature = buildHeadersSignature(headers);
        const exactMatch = records.find((record) => record.headerSignature === headerSignature);
        if (exactMatch) {
            return { type: "exact", record: exactMatch };
        }
        const headerSet = new Set((headers || []).map((header) => String(header || "").trim()));
        const partialRecord = records.find((record) => Array.isArray(record.headers) && record.headers.some((header) => headerSet.has(String(header || "").trim())));
        return partialRecord ? { type: "partial", record: partialRecord } : null;
    }

    function applySavedMappingsToState(state, record, { partial = false } = {}) {
        if (!record?.mapping || typeof record.mapping !== "object") return false;
        const availableHeaders = new Set(Array.isArray(state.headers) ? state.headers : []);
        const nextMappings = { ...(state.selectedMappings || {}) };
        let appliedCount = 0;
        [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].forEach((fieldName) => {
            const mappedColumn = String(record.mapping[fieldName] || "").trim();
            if (!mappedColumn || !availableHeaders.has(mappedColumn)) return;
            if (partial && nextMappings[fieldName]) return;
            nextMappings[fieldName] = mappedColumn;
            appliedCount += 1;
        });
        if (!appliedCount) return false;
        state.selectedMappings = nextMappings;
        computeValidation(state);
        return true;
    }

    function persistMappingMemory(state) {
        if (!state.file?.name || !state.headers.length) return;
        const nextRecord = buildMappingMemoryRecord(state.file.name, state.headers, state.selectedMappings);
        const existing = readMappingMemoryStore().filter((record) => !(record.fileName === nextRecord.fileName && record.headerSignature === nextRecord.headerSignature));
        writeMappingMemoryStore([nextRecord, ...existing]);
    }

    function initializeReviewState(state, payload) {
        state.uploadReview = payload;
        state.headers = payload.available_columns || payload.headers || [];
        state.detectedMappings = { ...(payload.mapping || {}) };
        applyAutoMappings(state);
        state.mappingReuseNotice = null;
        state.mappingReuseCandidate = null;
        if (!state.file?.name) {
            console.info("[PERF] quote_compare.mapping_reuse_skipped_reason", {
                reason: "missing_file_name"
            });
            return;
        }
        const candidate = getSavedMappingCandidate(state.file.name, state.headers);
        if (!candidate) {
            console.info("[PERF] quote_compare.mapping_reuse_skipped_reason", {
                fileName: state.file.name,
                reason: "no_saved_candidate"
            });
            return;
        }
        console.info("[PERF] quote_compare.mapping_reuse_found", {
            fileName: state.file.name,
            type: candidate.type,
            headerCount: state.headers.length
        });
        if (candidate?.type === "exact") {
            if (applySavedMappingsToState(state, candidate.record)) {
                state.mappingReuseNotice = {
                    tone: "warning",
                    message: "Previous column mappings applied. Please verify before continuing."
                };
                console.info("[PERF] quote_compare.mapping_reuse_applied", {
                    fileName: state.file.name,
                    type: candidate.type,
                    partial: false
                });
                return;
            }
            console.info("[PERF] quote_compare.mapping_reuse_skipped_reason", {
                fileName: state.file.name,
                reason: "exact_candidate_no_applicable_columns"
            });
            return;
        }
        if (candidate?.type === "partial") {
            state.mappingReuseCandidate = candidate.record;
            state.mappingReuseNotice = {
                tone: "warning",
                message: "A previous mapping exists for this file name, but the headers changed. Review the mapping or apply matching fields only."
            };
            console.info("[PERF] quote_compare.mapping_reuse_skipped_reason", {
                fileName: state.file.name,
                reason: "partial_candidate_requires_confirmation"
            });
        }
    }

    async function inspectUpload(state) {
        if (!state.file) {
            setStatus(state, "Choose a supplier file before reviewing mappings.", "error");
            return false;
        }
        const inspectCacheKey = `${state.file.name}__${state.file.size || 0}__${state.file.lastModified || 0}`;
        window.__quoteCompareInspectCache = window.__quoteCompareInspectCache || new Map();
        const cachedPayload = window.__quoteCompareInspectCache.get(inspectCacheKey);
        if (cachedPayload) {
            initializeReviewState(state, cachedPayload);
            state.activeSessionId = cachedPayload.session_id || state.activeSessionId || "";
            if (state.activeSessionId) {
                sessionStorage.setItem(QUOTE_COMPARE_ACTIVE_SESSION_KEY, state.activeSessionId);
            }
            setStatus(state, `Headers detected for ${state.file.name}.`, "success");
            return true;
        }
        const inspectStartedAt = performance.now();
        state.isParsing = true;
        state.parseError = "";
        setStatus(state, "Parsing uploaded headers and detecting likely matches.", "info");
        const formData = new FormData();
        formData.append("file", state.file);
        try {
            const fetchStartedAt = performance.now();
            const response = await fetch("/quote-compare/upload/inspect", {
                method: "POST",
                headers: {
                    Accept: "application/json"
                },
                body: formData
            });
            const fetchFinishedAt = performance.now();
            let data = {};
            try {
                data = await response.json();
            } catch (error) {
                data = {};
            }
            const jsonFinishedAt = performance.now();
            if (!response.ok || data.success === false) {
                throw new Error(data.message || "Request failed.");
            }
            window.__quoteCompareInspectCache.set(inspectCacheKey, data);
            initializeReviewState(state, data);
            const reviewInitializedAt = performance.now();
            state.activeSessionId = data.session_id || "";
            if (state.activeSessionId) {
                sessionStorage.setItem(QUOTE_COMPARE_ACTIVE_SESSION_KEY, state.activeSessionId);
            }
            state.isParsing = false;
            setStatus(state, `Headers detected for ${state.file.name}.`, "success");
            console.info("[compare prices inspect timing]", {
                fileName: state.file.name,
                fetchMs: Number((fetchFinishedAt - fetchStartedAt).toFixed(1)),
                jsonParseMs: Number((jsonFinishedAt - fetchFinishedAt).toFixed(1)),
                initializeReviewMs: Number((reviewInitializedAt - jsonFinishedAt).toFixed(1)),
                totalInspectMs: Number((reviewInitializedAt - inspectStartedAt).toFixed(1)),
                headerCount: Array.isArray(data.headers) ? data.headers.length : 0,
                fieldReviewCount: Array.isArray(data.field_reviews) ? data.field_reviews.length : 0
            });
            return true;
        } catch (error) {
            state.isParsing = false;
            state.headers = [];
            state.rows = [];
            state.uploadReview = null;
            state.detectedMappings = {};
            state.selectedMappings = {};
            state.validation = { mappedCount: 0, missingFields: [...REQUIRED_FIELDS], duplicateColumns: [], ready: false };
            state.parseError = error.message;
            setStatus(state, error.message, "error");
            return false;
        }
    }

    function getReviewRows(state) {
        const reviewMap = buildReviewMap(state);
        return [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].map((fieldName) => {
            const review = reviewMap.get(fieldName) || {};
            const detectedColumn = review.detected_column || state.detectedMappings[fieldName] || "";
            const selectedColumn = state.selectedMappings[fieldName] || "";
            return {
                fieldName,
                helpText: FIELD_HELP[fieldName] || (state.mode === "manual"
                    ? "Choose the matching column from the entered pricing data."
                    : "Choose the matching column from the uploaded file."),
                detectedColumn,
                selectedColumn,
                detectedQuality: review.match_quality || (detectedColumn ? "possible" : "missing"),
                autoDetected: Boolean(selectedColumn && detectedColumn && selectedColumn === detectedColumn && isHighConfidenceReview(review)),
                required: REQUIRED_FIELDS.includes(fieldName)
            };
        });
    }

    function buildManualPayload(state) {
        const incompleteTouchedRows = state.manualRows.filter((row) => isManualRowTouched(row) && getManualRowMissingFields(row).length > 0);
        if (incompleteTouchedRows.length) {
            throw new Error("Complete all required manual fields before starting analysis.");
        }

        const bids = getManualNormalizedRows(state);

        if (!bids.length) {
            throw new Error("Add at least one complete supplier price row before starting analysis.");
        }

        return {
            upload_id: state.manualUploadId,
            name: `Manual Pricing Analysis ${new Date().toLocaleDateString("en-US")}`,
            sourcing_need: "",
            source_type: "manual",
            bids,
            weighting: null
        };
    }

    function getSupplierKey(value) {
        return String(value || "").trim().toLowerCase();
    }

    function getOfferSupplierLabel(offer) {
        return String(offer?.supplier_name || offer?.supplier || "").trim();
    }

    function compareOffersByRecency(left, right) {
        const leftDate = parseDateValue(left.quote_date);
        const rightDate = parseDateValue(right.quote_date);
        if (leftDate && rightDate && leftDate.getTime() !== rightDate.getTime()) return rightDate - leftDate;
        if (leftDate) return -1;
        if (rightDate) return 1;
        return (right._sourceIndex || 0) - (left._sourceIndex || 0);
    }

    function compareOffersByPrice(left, right) {
        if (left.total_price !== right.total_price) return left.total_price - right.total_price;
        if (left.unit_price !== right.unit_price) return left.unit_price - right.unit_price;
        return compareOffersByRecency(left, right);
    }

    function compareOffersByUnitPrice(left, right) {
        if (left.unit_price !== right.unit_price) return left.unit_price - right.unit_price;
        if (left.total_price !== right.total_price) return left.total_price - right.total_price;
        return compareOffersByRecency(left, right);
    }

    function normalizeQuantityContext(quantity) {
        const numericQuantity = Number(quantity || 0);
        return Number.isFinite(numericQuantity) ? numericQuantity.toFixed(4) : "";
    }

    function getProductUnitKey(productName, unit) {
        return `${String(productName || "").trim()}__${String(unit || "").trim()}`;
    }

    function getNormalizedProductUnitKey(productName, unit) {
        return `${normalizeHistoryComparisonProductName(productName)}__${normalizeHistoryComparisonUnit(unit)}`;
    }

    function isSameOffer(left, right) {
        if (!left || !right) return false;
        return Number(left._sourceIndex || -1) === Number(right._sourceIndex || -2);
    }

    function buildProductSummaryStats(offers, productName, unit, offersByRecency = null) {
        const resolvedOffersByRecency = Array.isArray(offersByRecency)
            ? offersByRecency
            : [...offers].sort(compareOffersByRecency);
        let lowestObservedOffer = null;
        let highestObservedOffer = null;
        let averageObservedUnitPriceTotal = 0;
        const supplierKeys = new Set();
        offers.forEach((offer) => {
            const unitPrice = Number(offer.unit_price || 0);
            averageObservedUnitPriceTotal += unitPrice;
            const supplierKey = getSupplierKey(offer.supplier_name);
            if (supplierKey) supplierKeys.add(supplierKey);
            if (!lowestObservedOffer || compareOffersByUnitPrice(offer, lowestObservedOffer) < 0) {
                lowestObservedOffer = offer;
            }
            if (!highestObservedOffer || compareOffersByUnitPrice(highestObservedOffer, offer) < 0) {
                highestObservedOffer = offer;
            }
        });
        const latestObservedOffer = resolvedOffersByRecency[0] || null;
        const averageObservedUnitPrice = offers.length
            ? averageObservedUnitPriceTotal / offers.length
            : 0;

        return {
            key: getProductUnitKey(productName, unit),
            productName,
            unit,
            offers: resolvedOffersByRecency,
            lowestObservedOffer,
            highestObservedOffer,
            latestObservedOffer,
            averageObservedUnitPrice,
            supplierCount: supplierKeys.size
        };
    }

    function getOfferMonthKey(offer) {
        const date = parseDateValue(offer?.quote_date);
        if (!date) return "";
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    }

    function buildMonthlyAnalysisRows(offers, currentOffer) {
        const monthMap = new Map();
        offers.forEach((offer) => {
            const monthKey = getOfferMonthKey(offer);
            if (!monthKey) return;
            if (!monthMap.has(monthKey)) monthMap.set(monthKey, []);
            monthMap.get(monthKey).push(offer);
        });
        return Array.from(monthMap.entries())
            .sort((left, right) => left[0].localeCompare(right[0]))
            .map(([monthKey, monthOffers]) => {
                const sortedByDate = monthOffers.slice().sort(compareOffersByRecency).reverse();
                const prices = monthOffers.map((offer) => Number(offer.unit_price || 0)).filter(Number.isFinite);
                const avgPrice = prices.length ? prices.reduce((sum, value) => sum + value, 0) / prices.length : 0;
                const minPrice = prices.length ? Math.min(...prices) : 0;
                const maxPrice = prices.length ? Math.max(...prices) : 0;
                const firstOffer = sortedByDate[0] || null;
                const lastOffer = sortedByDate[sortedByDate.length - 1] || null;
                const quantityBasis = Number(currentOffer?.quantity || lastOffer?.quantity || firstOffer?.quantity || 0);
                const savingsAmount = lastOffer && minPrice < Number(lastOffer.unit_price || 0)
                    ? Math.max((Number(lastOffer.unit_price || 0) - minPrice) * quantityBasis, 0)
                    : 0;
                return {
                    monthKey,
                    label: new Date(`${monthKey}-01T00:00:00`).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
                    avgPrice,
                    minPrice,
                    maxPrice,
                    savingsAmount,
                    movementCount: monthOffers.length,
                    latestSupplier: lastOffer?.supplier_name || "",
                    latestPrice: Number(lastOffer?.unit_price || 0)
                };
            });
    }

    function buildDecisionCards(comparison) {
        const bids = comparison?.bids || [];
        const grouped = new Map();

        bids.forEach((bid, index) => {
            const product = String(bid.product_name || "").trim();
            const unit = String(bid.unit || "").trim();
            if (!product) return;
            const normalizedBid = {
                ...bid,
                _sourceIndex: index,
                quantity: Number(bid.quantity || 0),
                unit_price: Number(bid.unit_price || 0),
                total_price: Number(bid.total_price || 0) || Number(bid.quantity || 0) * Number(bid.unit_price || 0)
            };
            const key = getNormalizedProductUnitKey(product, unit);
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key).push(normalizedBid);
        });

        return Array.from(grouped.values())
            .map((offers) => {
                const offersByRecency = [...offers].sort(compareOffersByRecency);
                const currentOffer = offersByRecency[0] || null;
                const productSummary = buildProductSummaryStats(
                    offers,
                    currentOffer?.product_name || "",
                    currentOffer?.unit || "",
                    offersByRecency
                );
                const productOffers = productSummary.offers || offersByRecency;
                const lowestObservedOffer = productSummary.lowestObservedOffer || null;
                const currentSupplierKey = getSupplierKey(getOfferSupplierLabel(currentOffer));
                const currentQuantityKey = normalizeQuantityContext(currentOffer?.quantity);
                const currentUnitPrice = Number(currentOffer?.unit_price || 0);
                const quantityBasis = Number(currentOffer?.quantity || 0);
                const currentTotalBasis = Number(currentOffer?.total_price || 0) > 0
                    ? Number(currentOffer?.total_price || 0)
                    : currentUnitPrice * quantityBasis;
                let lowerPriceWithAnotherSupplier = null;
                let lowerHistoricalPriceWithCurrentSupplier = null;
                let lowerObservedOffer = null;
                let recommendedSwitchOffer = null;
                let sameSupplierMatchedOffer = null;
                const comparableAlternativeSupplierKeys = new Set();
                productOffers.forEach((offer) => {
                    if (isSameOffer(offer, currentOffer)) return;
                    if (currentOffer?.currency && offer?.currency && offer.currency !== currentOffer.currency) return;
                    const supplierKey = getSupplierKey(getOfferSupplierLabel(offer));
                    const offerUnitPrice = Number(offer?.unit_price || 0);
                    const isSameSupplier = supplierKey === currentSupplierKey;
                    const isQuantityMatch = normalizeQuantityContext(offer?.quantity) === currentQuantityKey;
                    if (supplierKey && !isSameSupplier) {
                        comparableAlternativeSupplierKeys.add(supplierKey);
                    }
                    if (offerUnitPrice < currentUnitPrice) {
                        if (!lowerObservedOffer || compareOffersByUnitPrice(offer, lowerObservedOffer) < 0) {
                            lowerObservedOffer = offer;
                        }
                        if (isSameSupplier) {
                            if (!lowerHistoricalPriceWithCurrentSupplier || compareOffersByUnitPrice(offer, lowerHistoricalPriceWithCurrentSupplier) < 0) {
                                lowerHistoricalPriceWithCurrentSupplier = offer;
                            }
                        } else if (!lowerPriceWithAnotherSupplier || compareOffersByUnitPrice(offer, lowerPriceWithAnotherSupplier) < 0) {
                            lowerPriceWithAnotherSupplier = offer;
                        }
                    }
                    if (!isQuantityMatch) return;
                    if (!isSameSupplier) {
                        if (!recommendedSwitchOffer || compareOffersByUnitPrice(offer, recommendedSwitchOffer) < 0) {
                            recommendedSwitchOffer = offer;
                        }
                        return;
                    }
                    if (offerUnitPrice < currentUnitPrice && (!sameSupplierMatchedOffer || compareOffersByUnitPrice(offer, sameSupplierMatchedOffer) < 0)) {
                        sameSupplierMatchedOffer = offer;
                    }
                });
                const referenceOffer = recommendedSwitchOffer
                    || sameSupplierMatchedOffer
                    || lowerPriceWithAnotherSupplier
                    || lowerHistoricalPriceWithCurrentSupplier
                    || lowerObservedOffer
                    || null;
                const savingsType = referenceOffer
                    ? (getSupplierKey(getOfferSupplierLabel(referenceOffer)) === currentSupplierKey
                        ? "same-supplier-history"
                        : "supplier-switch")
                    : "";
                const recommendedUnitPrice = Number(referenceOffer?.unit_price || 0);
                const unitPriceAdvantage = Math.max(currentUnitPrice - recommendedUnitPrice, 0);
                const hasValidAlternative = Boolean(referenceOffer && unitPriceAdvantage > 0 && quantityBasis > 0);
                const bestOffer = hasValidAlternative ? referenceOffer : currentOffer;
                const savingsAmount = hasValidAlternative
                    ? Math.max(currentTotalBasis - (quantityBasis * recommendedUnitPrice), 0)
                    : 0;
                const savingsPercent = hasValidAlternative && currentTotalBasis
                    ? (savingsAmount / currentTotalBasis) * 100
                    : 0;
                const comparableAlternativeCount = comparableAlternativeSupplierKeys.size;
                const isCurrentLowestObserved = Boolean(currentOffer && lowestObservedOffer && Number(currentOffer.unit_price || 0) === Number(lowestObservedOffer.unit_price || 0));
                const observedAtDifferentQuantity = Boolean(lowerObservedOffer && normalizeQuantityContext(lowerObservedOffer.quantity) !== currentQuantityKey);
                const otherSupplierObservedAtDifferentQuantity = Boolean(
                    lowerPriceWithAnotherSupplier &&
                    normalizeQuantityContext(lowerPriceWithAnotherSupplier.quantity) !== currentQuantityKey
                );
                const sameSupplierObservedAtDifferentQuantity = Boolean(
                    lowerHistoricalPriceWithCurrentSupplier &&
                    normalizeQuantityContext(lowerHistoricalPriceWithCurrentSupplier.quantity) !== currentQuantityKey
                );
                let decisionType = "price-variation-detected";
                if (referenceOffer && savingsType === "supplier-switch") {
                    decisionType = "lower-price-with-another-supplier";
                } else if (referenceOffer && savingsType === "same-supplier-history") {
                    decisionType = "lower-historical-price-with-current-supplier";
                } else if (isCurrentLowestObserved) {
                    decisionType = "lowest-observed-price-already-used";
                }
                const decisionTypeLabel = decisionType === "lower-price-with-another-supplier"
                    ? "Lower price with another supplier"
                    : decisionType === "lower-historical-price-with-current-supplier"
                        ? "Lower historical price with current supplier"
                        : decisionType === "lowest-observed-price-already-used"
                            ? "No immediate action"
                            : "Price variation detected";
                const lowestObservedUnitPrice = Number(lowestObservedOffer?.unit_price || 0);
                const currentQuantity = Number(currentOffer?.quantity || 0);
                const potentialSavingsAmount = lowestObservedOffer && lowestObservedUnitPrice < currentUnitPrice
                    ? Math.max((currentUnitPrice - lowestObservedUnitPrice) * currentQuantity, 0)
                    : 0;
                const hasPotentialSavings = potentialSavingsAmount > 0;
                const potentialSavingsObservedAtDifferentQuantity = Boolean(
                    hasPotentialSavings &&
                    lowestObservedOffer &&
                    normalizeQuantityContext(lowestObservedOffer.quantity) !== currentQuantityKey
                );
                const lowestPriceInsight = lowestObservedOffer
                    ? isCurrentLowestObserved
                        ? "Lowest price observed"
                        : `Lower price observed: ${formatCurrency(lowestObservedOffer.unit_price || 0, lowestObservedOffer.currency || currentOffer?.currency)} (${lowestObservedOffer.supplier_name || "Supplier missing"}, Qty ${formatQuantity(lowestObservedOffer.quantity || 0)}, ${formatDate(lowestObservedOffer.quote_date)})`
                    : "";
                const resolvedReferenceOffer = hasValidAlternative
                    ? referenceOffer
                    : decisionType === "lower-price-with-another-supplier"
                        ? (lowerPriceWithAnotherSupplier || referenceOffer)
                        : decisionType === "lower-historical-price-with-current-supplier"
                            ? (lowerHistoricalPriceWithCurrentSupplier || referenceOffer)
                            : decisionType === "price-variation-detected"
                                ? (lowerObservedOffer || lowestObservedOffer || referenceOffer || currentOffer)
                                : (lowestObservedOffer || referenceOffer || currentOffer);
                const quantityContextNote = resolvedReferenceOffer
                    ? normalizeQuantityContext(resolvedReferenceOffer.quantity) !== currentQuantityKey
                        ? "Observed at different quantity"
                        : "Observed at matching quantity"
                    : "";
                const referenceOfferLabel = hasValidAlternative
                    ? "Direct savings reference"
                    : decisionType === "lower-price-with-another-supplier"
                        ? "Another supplier reference"
                        : decisionType === "lower-historical-price-with-current-supplier"
                            ? "Current supplier history"
                            : decisionType === "lowest-observed-price-already-used"
                                ? "Best price benchmark"
                                : "Observed price reference";
                const compactResultInsight = hasValidAlternative && resolvedReferenceOffer
                    ? `Best: ${formatCurrency(resolvedReferenceOffer.unit_price || 0, resolvedReferenceOffer.currency || currentOffer?.currency)} (${getOfferSupplierLabel(resolvedReferenceOffer) || "Supplier missing"})`
                    : decisionType === "lowest-observed-price-already-used"
                        ? "Lowest price observed"
                        : resolvedReferenceOffer && Number(resolvedReferenceOffer.unit_price || 0) > 0
                            ? `Best: ${formatCurrency(resolvedReferenceOffer.unit_price || 0, resolvedReferenceOffer.currency || currentOffer?.currency)} (${getOfferSupplierLabel(resolvedReferenceOffer) || "Supplier missing"})`
                            : "";
                const resultBadgeTooltip = resolvedReferenceOffer && Number(resolvedReferenceOffer.unit_price || 0) > 0
                    ? `Best price: ${formatCurrency(resolvedReferenceOffer.unit_price || 0, resolvedReferenceOffer.currency || currentOffer?.currency)} from ${getOfferSupplierLabel(resolvedReferenceOffer) || "Supplier missing"}${resolvedReferenceOffer.quote_date ? ` (${formatDate(resolvedReferenceOffer.quote_date)})` : ""}`
                    : decisionTypeLabel;
                const supplierSwitchQuantityNote = resolvedReferenceOffer && normalizeQuantityContext(resolvedReferenceOffer.quantity) !== currentQuantityKey
                    ? ` The lower supplier price was observed at Qty ${formatQuantity(resolvedReferenceOffer.quantity || 0)} and is estimated against the current Qty ${formatQuantity(quantityBasis || 0)}.`
                    : " The lower supplier price was observed at the same quantity.";
                const decisionSentence = savingsType === "supplier-switch"
                    ? `Supplier switch savings are visible. Move from ${getOfferSupplierLabel(currentOffer) || "the current supplier"} at ${formatCurrency(currentUnitPrice, currentOffer?.currency)} per unit to ${getOfferSupplierLabel(resolvedReferenceOffer) || "the recommended supplier"} at ${formatCurrency(recommendedUnitPrice, resolvedReferenceOffer?.currency)} per unit.${supplierSwitchQuantityNote} Estimated savings on the current quantity: ${formatCurrency(savingsAmount, currentOffer?.currency)} (${formatPercent(savingsPercent)} lower total spend).`
                    : savingsType === "same-supplier-history"
                        ? `${getOfferSupplierLabel(currentOffer) || "The current supplier"} showed a lower historical price of ${formatCurrency(resolvedReferenceOffer?.unit_price || 0, resolvedReferenceOffer?.currency || currentOffer?.currency)} for the same product. Estimated savings against the latest price on the current quantity: ${formatCurrency(savingsAmount, currentOffer?.currency)}.${sameSupplierObservedAtDifferentQuantity ? " The lower point was observed at a different quantity." : " The lower point was observed at a matching quantity."}`
                    : decisionType === "lower-price-with-another-supplier"
                        ? `${lowerPriceWithAnotherSupplier?.supplier_name || "Another supplier"} has a lower observed unit price for this product at ${formatCurrency(lowerPriceWithAnotherSupplier?.unit_price || 0, lowerPriceWithAnotherSupplier?.currency || currentOffer?.currency)}. ${otherSupplierObservedAtDifferentQuantity ? "Observed at different quantity." : "Observed in comparable quantity history."}`
                        : decisionType === "lower-historical-price-with-current-supplier"
                            ? `${currentOffer?.supplier_name || "The current supplier"} previously offered this product at a lower observed unit price of ${formatCurrency(lowerHistoricalPriceWithCurrentSupplier?.unit_price || 0, lowerHistoricalPriceWithCurrentSupplier?.currency || currentOffer?.currency)}. ${sameSupplierObservedAtDifferentQuantity ? "Observed at different quantity." : "Observed in matching quantity history."}`
                            : decisionType === "lowest-observed-price-already-used"
                                ? `This row already matches the best recorded unit price for this product. Keep it as the price benchmark while reviewing supplier and quantity context.`
                                : comparableAlternativeCount
                                    ? `Lower prices were observed for this product, but only under a different commercial context. Review supplier, quantity, and date before acting on the price movement.`
                                    : `Only one visible pricing context exists for this product, so the screen is showing price intelligence rather than a supplier-switch recommendation.`;
                const sameSupplierPriceVariation = Boolean(lowerHistoricalPriceWithCurrentSupplier);
                const resultTone = decisionType === "price-variation-detected" || decisionType === "lowest-observed-price-already-used"
                    ? "neutral"
                    : "opportunity";

                return {
                    productName: currentOffer?.product_name || bestOffer?.product_name || "",
                    unit: currentOffer?.unit || bestOffer?.unit || "",
                    quantity: currentOffer?.quantity || bestOffer?.quantity || 0,
                    totalQuantity: productOffers.reduce((sum, offer) => sum + Number(offer?.quantity || 0), 0),
                    quoteDate: currentOffer?.quote_date || bestOffer?.quote_date || "",
                    currency: currentOffer?.currency || bestOffer?.currency || "USD",
                    currentOffer,
                    bestOffer,
                    offers: [...offers].sort(compareOffersByPrice),
                    savingsAmount,
                    savingsPercent,
                    savingsType,
                    isCurrentBest: decisionType === "lowest-observed-price-already-used" && !hasValidAlternative,
                    hasValidAlternative,
                    comparableAlternativeCount,
                    sameSupplierPriceVariation,
                    decisionType,
                    quantityContextNote,
                    lowerPriceWithAnotherSupplier,
                    lowerHistoricalPriceWithCurrentSupplier,
                    observedAtDifferentQuantity,
                    referenceOffer: resolvedReferenceOffer,
                    referenceOfferLabel,
                    productSummary,
                    lowestObservedOffer,
                    highestObservedOffer: productSummary.highestObservedOffer || null,
                    lowestPriceInsight,
                    compactResultInsight,
                    resultBadgeTooltip,
                    potentialSavingsAmount,
                    hasPotentialSavings,
                    potentialSavingsObservedAtDifferentQuantity,
                    isCurrentLowestObserved,
                    decisionSentence,
                    statusLabel: decisionTypeLabel,
                    statusTone: resultTone,
                    monthlyInsights: null,
                    overallAnalysis: null
                };
            })
            .sort((left, right) => left.productName.localeCompare(right.productName) || String(left.unit || "").localeCompare(String(right.unit || "")));
    }

    function buildAnalyzeSummary(result) {
        const summaryStartedAt = performance.now();
        const comparison = result?.comparison || { bids: [] };
        const bids = comparison.bids || [];
        const suppliers = new Set();
        const products = new Set();
        const decisionCardsStartedAt = performance.now();
        const decisionCards = buildDecisionCards(comparison);
        const decisionCardsBuiltAt = performance.now();
        const productsWithSavings = decisionCards.filter((card) => card.hasValidAlternative && card.savingsAmount > 0).length;
        const totalVisibleSavings = decisionCards.reduce((sum, card) => sum + (card.hasValidAlternative ? card.savingsAmount : 0), 0);
        const currentSpend = decisionCards.reduce((sum, card) => sum + Number(card.currentOffer?.total_price || 0), 0);
        const optimizedSpend = decisionCards.reduce((sum, card) => sum + Number(card.bestOffer?.total_price || 0), 0);
        const optimizedSavings = Math.max(currentSpend - optimizedSpend, 0);
        const optimizedSavingsPercent = currentSpend ? (optimizedSavings / currentSpend) * 100 : 0;

        bids.forEach((bid) => {
            if (bid.supplier_name) suppliers.add(String(bid.supplier_name).trim());
            if (bid.product_name) {
                products.add(getNormalizedProductUnitKey(bid.product_name, bid.unit));
            }
        });
        console.info("[DEBUG] quote_compare.products_analyzed_count_check", {
            uniqueProductNameCount: new Set(
                bids
                    .map((bid) => String(bid?.product_name || "").trim())
                    .filter(Boolean)
            ).size,
            uniqueProductNameUnitCount: products.size,
            currentCountUsed: products.size
        });
        const summary = {
            rowCount: bids.length,
            supplierCount: suppliers.size,
            productCount: products.size,
            productsWithSavings,
            totalVisibleSavings,
            currentSpend,
            optimizedSpend,
            optimizedSavings,
            optimizedSavingsPercent,
            optimizedRows: [],
            decisionCards
        };
        if (result?.__restorePerfTarget) {
            const decisionCardsMs = Number((decisionCardsBuiltAt - decisionCardsStartedAt).toFixed(1));
            const stateBuildMs = Number((performance.now() - summaryStartedAt).toFixed(1));
            result.__restorePerfTarget.decisionCardsMs = decisionCardsMs;
            result.__restorePerfTarget.stateBuildMs = stateBuildMs;
            logQuoteCompareRestore("quote_compare.restore.decision_cards_ms", {
                bidCount: bids.length,
                decisionCards: decisionCards.length,
                durationMs: decisionCardsMs
            });
            logQuoteCompareRestore("quote_compare.restore.state_build_ms", {
                bidCount: bids.length,
                durationMs: stateBuildMs
            });
        }
        console.info("[compare prices comparison.bids transform]", {
            bidCount: bids.length,
            decisionCards: decisionCards.length,
            transformMs: Number((decisionCardsBuiltAt - decisionCardsStartedAt).toFixed(1)),
            totalSummaryMs: Number((performance.now() - summaryStartedAt).toFixed(1))
        });
        return summary;
    }

    function getAnalysisSummary(result) {
        const existingSummary = result?.summary;
        if (
            existingSummary &&
            Array.isArray(existingSummary.decisionCards) &&
            (!existingSummary.decisionCards.length || existingSummary.decisionCards[0]?.productSummary)
        ) {
            return existingSummary;
        }
        return buildAnalyzeSummary(result);
    }

    function hydrateAnalyzeState(state, comparison, evaluation, { screen = "analyze", step = 3, markRestore = false } = {}) {
        const hydrateStartedAt = performance.now();
        if (markRestore) {
            state.restorePerf = {
                ...(state.restorePerf || {}),
                hydrateStartedAt
            };
            state.deferPersistUntilStablePaint = true;
            logQuoteCompareRestore("quote_compare.restore.hydrate_start", {
                screen,
                bidCount: Array.isArray(comparison?.bids) ? comparison.bids.length : 0
            });
        }
        console.info("[compare prices step3 hydrate start]", {
            screen,
            bidCount: Array.isArray(comparison?.bids) ? comparison.bids.length : 0
        });
        const restorePerfTarget = markRestore ? (state.restorePerf || {}) : null;
        const summary = buildAnalyzeSummary({
            comparison,
            __restorePerfTarget: restorePerfTarget
        });
        state.analysisResult = {
            comparison,
            evaluation,
            summary
        };
        state.rows = comparison?.bids || [];
        state.currentScreen = screen;
        state.currentStep = step;
        if (markRestore) {
            state.restoreAnalyzeSettled = false;
            state.restoreTargetOpportunityRenderCount = Math.max(
                Number(state.opportunityRenderCount || OPPORTUNITY_CARD_BATCH_SIZE),
                OPPORTUNITY_CARD_BATCH_SIZE
            );
            state.opportunityRenderCount = Math.min(
                state.restoreTargetOpportunityRenderCount,
                RESTORE_INITIAL_OPPORTUNITY_CARD_BATCH_SIZE
            );
            const currentViewport = state.analysisViewport || { start: 0, end: 80, scrollTop: 0 };
            const restoreViewportStart = Math.max(0, Number(currentViewport.start || 0));
            const restoreViewportEnd = Math.max(restoreViewportStart + 1, Number(currentViewport.end || 80));
            state.restoreTargetAnalysisViewport = {
                ...currentViewport
            };
            state.analysisViewport = {
                ...currentViewport,
                end: Math.min(
                    restoreViewportEnd,
                    restoreViewportStart + RESTORE_INITIAL_ANALYSIS_VIEWPORT_END
                )
            };
            state.isRestoringAnalyze = true;
            state.restoreRenderPassCount = 0;
            state.restorePerf = {
                ...(state.restorePerf || {}),
                hydrateEndedAt: performance.now(),
                decisionCardsMs: restorePerfTarget?.decisionCardsMs || 0,
                stateBuildMs: restorePerfTarget?.stateBuildMs || 0
            };
            logQuoteCompareRestore("quote_compare.restore.hydrate_end", {
                screen,
                bidCount: Array.isArray(comparison?.bids) ? comparison.bids.length : 0,
                durationMs: Number((performance.now() - hydrateStartedAt).toFixed(1)),
                decisionCards: Array.isArray(summary?.decisionCards) ? summary.decisionCards.length : 0
            });
        }
        console.info("[compare prices step3 hydrate end]", {
            screen,
            durationMs: Number((performance.now() - hydrateStartedAt).toFixed(1)),
            decisionCards: Array.isArray(summary?.decisionCards) ? summary.decisionCards.length : 0
        });
    }

    function cancelRestoreAnalyzeDeferredRender(state) {
        if (state.restoreDeferredRenderFrame) {
            cancelAnimationFrame(state.restoreDeferredRenderFrame);
            state.restoreDeferredRenderFrame = 0;
        }
    }

    function getAnalyzeRenderModel(state) {
        const result = state.analysisResult || { comparison: { bids: [] }, evaluation: null, summary: { rowCount: 0, supplierCount: 0, productCount: 0, productsWithSavings: 0, totalVisibleSavings: 0, currentSpend: 0, optimizedSpend: 0, optimizedSavings: 0, optimizedSavingsPercent: 0, optimizedRows: [], decisionCards: [] } };
        const summary = getAnalysisSummary(result);
        const fullDecisionCards = summary.decisionCards || [];
        const activeProductFilter = String(state.activeProductFilter || "").trim().toLowerCase();
        const decisionCards = activeProductFilter
            ? fullDecisionCards.filter((card) => String(card.productName || "").trim().toLowerCase() === activeProductFilter)
            : fullDecisionCards;
        const opportunityCards = getTopPricingOpportunityCards(decisionCards, state);
        const comparisonCurrency = result.comparison?.bids?.[0]?.currency || "USD";
        const isOpportunitySectionVisible = state.showOpportunitySection !== false;
        const activeAnalyzeTab = state.activeAnalyzeTab || "savings";
        const visibleSummary = activeAnalyzeTab === "savings"
            ? getVisibleTopSavingsSummary(state, opportunityCards, { sectionVisible: isOpportunitySectionVisible })
            : getVisibleAnalysisSummary(state, decisionCards);
        const shouldRenderFullComparison = state.showFullComparison && activeAnalyzeTab === "full-table";
        return {
            result,
            summary: {
                ...summary,
                decisionCards
            },
            decisionCards,
            opportunityCards,
            comparisonCurrency,
            isOpportunitySectionVisible,
            activeAnalyzeTab,
            visibleSummary,
            shouldRenderFullComparison
        };
    }

    function renderAnalyzeSummaryGridMarkup(visibleSummary, activeAnalyzeTab, comparisonCurrency) {
        return `
            <article class="summary-card qc2-summary-card-compact"><div class="summary-card-title">${activeAnalyzeTab === "savings" ? "Distinct products" : "Products analyzed"}</div><div class="summary-card-value compact">${visibleSummary.productCount}</div><div class="summary-card-insight">${activeAnalyzeTab === "savings" ? "Unique product names in the visible Top Savings cards." : "Visible product groups in the active filter."}</div></article>
            <article class="summary-card qc2-summary-card-compact"><div class="summary-card-title">Suppliers compared</div><div class="summary-card-value compact">${visibleSummary.supplierCount}</div><div class="summary-card-insight">${activeAnalyzeTab === "savings" ? "Unique suppliers across the visible Top Savings cards." : "Unique suppliers in the visible table view."}</div></article>
            <article class="summary-card qc2-summary-card-compact"><div class="summary-card-title">Pricing opportunities</div><div class="summary-card-value compact">${visibleSummary.pricingOpportunityCount}</div><div class="summary-card-insight">${activeAnalyzeTab === "savings" ? "Visible Top Savings cards with savings above zero." : "Visible rows with savings above zero in the active filter."}</div></article>
            <article class="summary-card qc2-summary-card-compact is-savings"><div class="summary-card-title">Total potential savings</div><div class="summary-card-value compact">${escapeHtml(formatCurrency(visibleSummary.totalPotentialSavings, comparisonCurrency))}</div><div class="summary-card-insight">${activeAnalyzeTab === "savings" ? "Sum of visible Top Savings card values." : "Sum of visible row savings in the active filter."}</div></article>
        `;
    }

    function updateAnalyzeRestoreSlots(elements, state) {
        if (!elements.app || state.currentScreen !== "analyze") {
            return;
        }
        const renderModel = getAnalyzeRenderModel(state);
        const summaryGrid = elements.app.querySelector("[data-qc-analyze-summary-grid]");
        if (summaryGrid) {
            summaryGrid.innerHTML = renderAnalyzeSummaryGridMarkup(
                renderModel.visibleSummary,
                renderModel.activeAnalyzeTab,
                renderModel.comparisonCurrency
            );
        }
        const opportunitySlot = elements.app.querySelector("[data-qc-opportunity-cards]");
        if (opportunitySlot && renderModel.isOpportunitySectionVisible) {
            opportunitySlot.innerHTML = renderDecisionSpotlightCards(renderModel.opportunityCards, state);
        }
        const tableContent = elements.app.querySelector("[data-qc-analysis-table-content]");
        if (tableContent && renderModel.shouldRenderFullComparison) {
            tableContent.innerHTML = renderAnalyzeRows(renderModel.summary.decisionCards || [], state);
        }
    }

    function scheduleRestoreAnalyzeDeferredRender(elements, state, initStartedAt) {
        cancelRestoreAnalyzeDeferredRender(state);
        let cardBatchCount = 0;
        let tableBatchCount = 0;
        const deferredStartedAt = performance.now();
        const runBatch = () => {
            state.restoreDeferredRenderFrame = 0;
            if (!state.isRestoringAnalyze || state.currentScreen !== "analyze" || !elements.app) {
                return;
            }
            const renderModel = getAnalyzeRenderModel(state);
            let renderedBatch = false;

            if (renderModel.activeAnalyzeTab === "savings" && renderModel.isOpportunitySectionVisible) {
                const targetOpportunityCount = Math.max(
                    Number(state.restoreTargetOpportunityRenderCount || OPPORTUNITY_CARD_BATCH_SIZE),
                    OPPORTUNITY_CARD_BATCH_SIZE
                );
                const currentOpportunityCount = Math.max(
                    Number(state.opportunityRenderCount || OPPORTUNITY_CARD_BATCH_SIZE),
                    Math.min(targetOpportunityCount, RESTORE_INITIAL_OPPORTUNITY_CARD_BATCH_SIZE)
                );
                if (currentOpportunityCount < targetOpportunityCount) {
                    state.opportunityRenderCount = Math.min(
                        targetOpportunityCount,
                        currentOpportunityCount + RESTORE_OPPORTUNITY_CARD_BATCH_SIZE
                    );
                    updateAnalyzeRestoreSlots(elements, state);
                    cardBatchCount += 1;
                    renderedBatch = true;
                }
            }

            if (!renderedBatch && renderModel.shouldRenderFullComparison) {
                const targetViewport = state.restoreTargetAnalysisViewport || state.analysisViewport || { start: 0, end: 80, scrollTop: 0 };
                const currentViewport = state.analysisViewport || { start: 0, end: 80, scrollTop: 0 };
                const currentEnd = Number(currentViewport.end || 0);
                const targetEnd = Math.max(Number(targetViewport.end || currentEnd), currentEnd);
                if (currentEnd < targetEnd) {
                    state.analysisViewport = {
                        ...currentViewport,
                        end: Math.min(targetEnd, currentEnd + RESTORE_ANALYSIS_TABLE_BATCH_SIZE)
                    };
                    updateAnalyzeRestoreSlots(elements, state);
                    tableBatchCount += 1;
                    renderedBatch = true;
                }
            }

            if (renderedBatch) {
                state.restoreDeferredRenderFrame = requestAnimationFrame(runBatch);
                return;
            }

            state.restoreAnalyzeSettled = true;
            logQuoteCompareRestore("quote_compare.restore.card_batch_count", {
                count: cardBatchCount
            });
            logQuoteCompareRestore("quote_compare.restore.table_batch_count", {
                count: tableBatchCount
            });
            logQuoteCompareRestore("quote_compare.restore.chart_deferred_ms", {
                durationMs: 0
            });
            logQuoteCompareRestore("quote_compare.restore.stable_paint", {
                totalInitMs: Number((performance.now() - initStartedAt).toFixed(1)),
                renderPassCount: state.renderPassCount,
                restoreRenderPassCount: Number(state.restoreRenderPassCount || 0)
            });
            logQuoteCompareRestore("quote_compare.restore.total_render_time", {
                totalMs: Number((performance.now() - initStartedAt).toFixed(1)),
                deferredRenderMs: Number((performance.now() - deferredStartedAt).toFixed(1)),
                renderPassCount: state.renderPassCount,
                restoreRenderPassCount: Number(state.restoreRenderPassCount || 0)
            });
            if (state.deferPersistUntilStablePaint) {
                state.deferPersistUntilStablePaint = false;
                scheduleQuoteCompareSessionPersist(state, elements);
            }
            state.isRestoringAnalyze = false;
        };
        state.restoreDeferredRenderFrame = requestAnimationFrame(runBatch);
    }

    function getHistoryComparisons(state) {
        const historyMap = new Map();
        (state.savedComparisons || []).forEach((comparison) => {
            if (comparison?.comparison_id) historyMap.set(comparison.comparison_id, comparison);
        });

        const currentComparison = state.analysisResult?.comparison;
        if (currentComparison?.comparison_id && !historyMap.has(currentComparison.comparison_id)) {
            historyMap.set(currentComparison.comparison_id, currentComparison);
        } else if (currentComparison && !currentComparison.comparison_id) {
            historyMap.set(`current-${state.mode}`, {
                ...currentComparison,
                comparison_id: `current-${state.mode}`,
                created_at: new Date().toISOString()
            });
        }

        return Array.from(historyMap.values());
    }

    function normalizeHistoryText(value) {
        return String(value == null ? "" : value).trim();
    }

    function normalizeHistoryComparisonProductName(value) {
        return normalizeHistoryText(value).replace(/\s+/g, " ").toLowerCase();
    }

    function normalizeHistoryComparisonUnit(value) {
        return normalizeHistoryText(value).toLowerCase();
    }

    function normalizeUiSelectionMatch(value) {
        return normalizeHistoryText(value).replace(/\s+/g, " ").toLowerCase();
    }

    function resolveUiSelectionDisplayValue(options, selectedValue, preferredDisplayValue = "") {
        const optionList = Array.isArray(options) ? options : [];
        const preferred = normalizeHistoryText(preferredDisplayValue);
        if (preferred && optionList.includes(preferred)) {
            return preferred;
        }
        const exactValue = normalizeHistoryText(selectedValue);
        if (exactValue && optionList.includes(exactValue)) {
            return exactValue;
        }
        const normalizedValue = normalizeUiSelectionMatch(selectedValue);
        if (!normalizedValue) {
            return "";
        }
        return optionList.find((option) => normalizeUiSelectionMatch(option) === normalizedValue) || "";
    }

    function isValidHistoryDimension(value) {
        const normalized = normalizeHistoryText(value);
        return normalized !== "" && normalized !== "-";
    }

    function buildHistoryDataset(state) {
        return getHistoryComparisons(state).flatMap((comparison) => {
            const comparisonCreatedAt = comparison.created_at || comparison.updated_at || "";
            const comparisonSourceType = comparison.source_type || "manual";
            return (comparison.bids || []).map((bid, index) => {
                const quoteDate = bid.quote_date || bid.date || "";
                const effectiveDate = parseDateValue(quoteDate) || parseDateValue(comparisonCreatedAt);
                const productName = normalizeHistoryText(bid.product_name);
                const supplier = normalizeHistoryText(bid.supplier_name);
                return {
                    historyId: `${comparison.comparison_id || "comparison"}-${index}`,
                    comparisonId: comparison.comparison_id || "",
                    uploadId: comparison.upload_id || "",
                    comparisonName: comparison.name || "Saved pricing records",
                    productName,
                    supplier,
                    unit: normalizeHistoryText(bid.unit),
                    quantity: Number(bid.quantity || 0),
                    unitPrice: Number(bid.unit_price || 0),
                    totalPrice: Number(bid.total_price || 0),
                    quoteDate,
                    currency: normalizeHistoryText(bid.currency || "USD") || "USD",
                    deliveryTime: normalizeHistoryText(bid.delivery_time),
                    paymentTerm: normalizeHistoryText(bid.payment_term),
                    validUntil: normalizeHistoryText(bid.valid_until),
                    notes: normalizeHistoryText(bid.notes),
                    sourceType: comparisonSourceType,
                    createdAt: comparisonCreatedAt,
                    effectiveDate,
                    effectiveTimestamp: effectiveDate ? effectiveDate.getTime() : 0
                };
            });
        }).filter((row) => isValidHistoryDimension(row.productName) && isValidHistoryDimension(row.supplier));
    }

    function getHistoryDataset(state) {
        if (!Array.isArray(state.qcHistoryData)) {
            state.qcHistoryData = [];
        }
        if (!state.qcHistoryData.length) {
            state.qcHistoryData = buildHistoryDataset(state);
        }
        return state.qcHistoryData;
    }

    function getHistoryMemo(state) {
        const dataset = getHistoryDataset(state);
        if (!state.historyMemo || state.historyMemo.datasetRef !== dataset) {
            state.historyMemo = {
                datasetRef: dataset,
                filterScope: new Map(),
                filterOptions: new Map(),
                filteredKey: "",
                filteredRows: null,
                displayRowsRef: null,
                displayKey: "",
                displayRows: null
            };
        }
        return state.historyMemo;
    }

    function getAnalysisMemo(state) {
        const cards = getAnalysisDecisionCards(state);
        if (!state.analysisMemo || state.analysisMemo.cardsRef !== cards) {
            state.analysisMemo = {
                cardsRef: cards,
                filteredKey: "",
                filteredCards: null,
                visibleSummaryKey: "",
                visibleSummary: null,
                topSavingsSummaryKey: "",
                topSavingsSummary: null,
                topOpportunityCards: null,
                spotlightMarkupKey: "",
                spotlightMarkup: "",
                tableMarkupKey: "",
                tableMarkup: ""
            };
        }
        return state.analysisMemo;
    }

    function flattenHistoryRows(state) {
        return getHistoryDataset(state);
    }

    function getHistoryFilterScope(state, { ignoreKey = "" } = {}) {
        const product = ignoreKey === "product" ? "" : normalizeHistoryText(state.historyFilters.product);
        const supplier = ignoreKey === "supplier" ? "" : normalizeHistoryText(state.historyFilters.supplier);
        const startDate = ignoreKey === "dateFrom" ? null : parseDateValue(state.historyFilters.dateFrom, { startOfDay: true });
        const endDate = ignoreKey === "dateTo" ? null : parseDateValue(state.historyFilters.dateTo, { endOfDay: true });
        const focusedSeriesKey = normalizeHistoryText(state.historyFocusedSeriesKey);
        const memo = getHistoryMemo(state);
        const scopeKey = [ignoreKey, product, supplier, startDate?.getTime() || "", endDate?.getTime() || "", focusedSeriesKey].join("|");
        if (memo.filterScope.has(scopeKey)) {
            return memo.filterScope.get(scopeKey);
        }
        const rows = getHistoryDataset(state).filter((row) => {
            if (focusedSeriesKey && getHistorySeriesKey(row.productName, row.unit) !== focusedSeriesKey) return false;
            if (product && row.productName !== product) return false;
            if (supplier && row.supplier !== supplier) return false;
            if (startDate && row.effectiveDate && row.effectiveDate < startDate) return false;
            if (endDate && row.effectiveDate && row.effectiveDate > endDate) return false;
            return true;
        });
        memo.filterScope.set(scopeKey, rows);
        return rows;
    }

    function getHistoryFilterOptions(state, key) {
        const memo = getHistoryMemo(state);
        const optionKey = [key, normalizeHistoryText(state.historyFilters.product), normalizeHistoryText(state.historyFilters.supplier), state.historyFilters.dateFrom || "", state.historyFilters.dateTo || "", normalizeHistoryText(state.historyFocusedSeriesKey)].join("|");
        if (memo.filterOptions.has(optionKey)) {
            return memo.filterOptions.get(optionKey);
        }
        let options = [];
        if (key === "product") {
            options = Array.from(new Set(
                getHistoryFilterScope(state, { ignoreKey: "product" })
                    .map((row) => row.productName)
                    .filter(isValidHistoryDimension)
            )).sort((left, right) => left.localeCompare(right));
        }
        if (key === "supplier") {
            options = Array.from(new Set(
                getHistoryFilterScope(state, { ignoreKey: "supplier" })
                    .map((row) => row.supplier)
                    .filter(isValidHistoryDimension)
            )).sort((left, right) => left.localeCompare(right));
        }
        memo.filterOptions.set(optionKey, options);
        return options;
    }

    function syncHistoryFilterDefaults(state) {
        let didChange = false;
        let guard = 0;
        do {
            didChange = false;
            const productOptions = getHistoryFilterOptions(state, "product");
            if (state.historyFilters.product && !productOptions.includes(state.historyFilters.product)) {
                state.historyFilters.product = "";
                state.historyFilterUi.selectedDisplayValues.product = "";
                state.historyFilterUi.queries.product = "";
                didChange = true;
            }
            const supplierOptions = getHistoryFilterOptions(state, "supplier");
            if (state.historyFilters.supplier && !supplierOptions.includes(state.historyFilters.supplier)) {
                state.historyFilters.supplier = "";
                state.historyFilterUi.selectedDisplayValues.supplier = "";
                state.historyFilterUi.queries.supplier = "";
                didChange = true;
            }
            guard += 1;
        } while (didChange && guard < 5);
    }

    function getFilteredHistoryRows(state) {
        syncHistoryFilterDefaults(state);
        const { product, supplier, dateFrom, dateTo } = state.historyFilters;
        const startDate = parseDateValue(dateFrom, { startOfDay: true });
        const endDate = parseDateValue(dateTo, { endOfDay: true });
        const focusedSeriesKey = normalizeHistoryText(state.historyFocusedSeriesKey);
        const memo = getHistoryMemo(state);
        const filteredKey = [product, supplier, dateFrom || "", dateTo || "", focusedSeriesKey].join("|");
        if (memo.filteredKey === filteredKey && Array.isArray(memo.filteredRows)) {
            return memo.filteredRows;
        }

        const visibleRows = getHistoryDataset(state)
            .filter((row) => !focusedSeriesKey || getHistorySeriesKey(row.productName, row.unit) === focusedSeriesKey)
            .filter((row) => !product || row.productName === product)
            .filter((row) => !supplier || row.supplier === supplier)
            .filter((row) => {
                if (!startDate || !row.effectiveDate) return true;
                return row.effectiveDate >= startDate;
            })
            .filter((row) => {
                if (!endDate || !row.effectiveDate) return true;
                return row.effectiveDate <= endDate;
            })
            .sort((left, right) => {
                if (left.effectiveTimestamp !== right.effectiveTimestamp) return left.effectiveTimestamp - right.effectiveTimestamp;
                return left.supplier.localeCompare(right.supplier);
            });

        const lastSeenBySeries = new Map();
        const filteredRows = visibleRows.map((row) => {
                const seriesKey = getHistorySeriesKey(row.productName, row.unit);
                const previousSameSeries = lastSeenBySeries.get(seriesKey) || null;
                const changeValue = previousSameSeries ? row.unitPrice - previousSameSeries.unitPrice : null;
                const changePercent = previousSameSeries && previousSameSeries.unitPrice
                    ? (changeValue / previousSameSeries.unitPrice) * 100
                    : null;
                lastSeenBySeries.set(seriesKey, row);
                return {
                    ...row,
                    changeValue,
                    changePercent
                };
            });
        memo.filteredKey = filteredKey;
        memo.filteredRows = filteredRows;
        return filteredRows;
    }

    function getHistorySummary(rows) {
        if (!rows.length) {
            return {
                latestPrice: null,
                oldestPrice: null,
                minPrice: null,
                maxPrice: null,
                totalChange: null,
                totalChangePercent: null
            };
        }

        const sortedRows = rows.slice().sort((left, right) => {
            if (left.effectiveTimestamp !== right.effectiveTimestamp) return left.effectiveTimestamp - right.effectiveTimestamp;
            return left.supplier.localeCompare(right.supplier);
        });
        const oldest = sortedRows[0];
        const latest = sortedRows[sortedRows.length - 1];
        const prices = sortedRows.map((row) => row.unitPrice).filter((value) => Number.isFinite(value));
        const minPrice = prices.length ? Math.min(...prices) : null;
        const maxPrice = prices.length ? Math.max(...prices) : null;
        const totalChange = minPrice != null && maxPrice != null ? maxPrice - minPrice : null;
        const totalChangePercent = minPrice ? (totalChange / minPrice) * 100 : null;

        return {
            latestPrice: latest.unitPrice,
            oldestPrice: oldest.unitPrice,
            minPrice,
            maxPrice,
            totalChange,
            totalChangePercent
        };
    }

    function getHistoryViewModel(state) {
        syncHistoryFilterDefaults(state);
        const historyRows = getHistoryDataset(state);
        const filteredRows = getFilteredHistoryRows(state);
        const tableRows = getHistoryDisplayRows(state, filteredRows);
        const uniqueSeries = Array.from(new Set(filteredRows.map((row) => getHistorySeriesKey(row.productName, row.unit))));
        if (uniqueSeries.length === 1) {
            const autoSeriesKey = uniqueSeries[0];
            const autoRowId = tableRows.find((row) => getHistorySeriesKey(row.productName, row.unit) === autoSeriesKey)?.historyId || "";
            if (state.historySelectedSeriesKey !== autoSeriesKey) {
                setHistorySelectedSeries(state, filteredRows, autoSeriesKey, autoRowId);
            } else if (!state.historySelectedRowId) {
                state.historySelectedRowId = autoRowId;
            }
        } else {
            const selectedExistsInFiltered = state.historySelectedSeriesKey && uniqueSeries.includes(state.historySelectedSeriesKey);
            if (!selectedExistsInFiltered) {
                clearHistorySelectedSeries(state);
            }
        }
        const selectedSeriesRows = state.historySelectedSeriesKey
            ? getHistoryFullSeriesRows(state, state.historySelectedSeriesKey)
            : [];
        const summaryRows = selectedSeriesRows;
        const summaryCurrency = summaryRows[summaryRows.length - 1]?.currency || filteredRows[filteredRows.length - 1]?.currency || "USD";
        return {
            hasHistoryContext: historyRows.length > 0,
            productOptions: getHistoryFilterOptions(state, "product"),
            supplierOptions: getHistoryFilterOptions(state, "supplier"),
            filteredRows,
            tableRows,
            selectedSeriesRows,
            selectedSeriesKey: state.historySelectedSeriesKey,
            selectedSeriesLabel: selectedSeriesRows.length ? `${selectedSeriesRows[0].productName} | ${selectedSeriesRows[0].unit}` : "",
            summary: getHistorySummary(summaryRows),
            currency: summaryCurrency
        };
    }

    function initializeHistoryFilters(state) {
        state.qcHistoryData = buildHistoryDataset(state);
        state.historyMemo = null;
        state.historyFocusedSeriesKey = "";
        state.historyFilters.product = "";
        state.historyFilters.supplier = "";
        state.historyFilters.dateFrom = "";
        state.historyFilters.dateTo = "";
        state.historyFilterUi.queries.product = "";
        state.historyFilterUi.queries.supplier = "";
        state.historyFilterUi.selectedDisplayValues.product = "";
        state.historyFilterUi.selectedDisplayValues.supplier = "";
        clearHistorySelectedSeries(state);
        closeHistoryDetailModal(state);
        syncHistoryFilterDefaults(state);
    }

    function focusHistoryOnProductSeries(state, productName, unit) {
        const normalizedProduct = normalizeHistoryText(productName);
        const normalizedUnit = normalizeHistoryText(unit);
        state.historyFocusedSeriesKey = getHistorySeriesKey(normalizedProduct, normalizedUnit);
        state.historyFilters.product = normalizedProduct;
        state.historyFilterUi.selectedDisplayValues.product = normalizedProduct;
        state.historyFilterUi.queries.product = normalizedProduct;
        state.historyFilters.supplier = "";
        state.historyFilterUi.selectedDisplayValues.supplier = "";
        state.historyFilterUi.queries.supplier = "";
        state.historyFilters.dateFrom = "";
        state.historyFilters.dateTo = "";
        clearHistorySelectedSeries(state);
        closeHistoryDetailModal(state);
        const focusedRows = getFilteredHistoryRows(state);
        const firstFocusedRowId = focusedRows[0]?.historyId || "";
        setHistorySelectedSeries(state, focusedRows, state.historyFocusedSeriesKey, firstFocusedRowId);
    }

    function hydrateComparisons(state, comparisons) {
        state.savedComparisons = Array.isArray(comparisons) ? comparisons : [];
        state.hasLoadedSavedComparisons = true;
        initializeHistoryFilters(state);
    }

    async function loadSavedComparisons(state, { includeComparisons = false } = {}) {
        const loadStartedAt = performance.now();
        const hasExistingActiveContext = hasRestorableQuoteCompareContext(state);
        const preferredLastScreen = readLastQuoteCompareScreen() || state.lastQuoteCompareScreen || null;
        try {
            const activeSessionId = state.activeSessionId || sessionStorage.getItem(QUOTE_COMPARE_ACTIVE_SESSION_KEY) || "";
            console.info("[compare prices restore bootstrap start]", {
                includeComparisons,
                hasActiveSessionId: Boolean(activeSessionId)
            });
            const persistedSelectedMappings = { ...(state.selectedMappings || {}) };
            const persistedCurrentScreen = state.currentScreen;
            const persistedCurrentStep = Number(state.currentStep || getQuoteCompareStepForScreen(state) || 1);
            if (activeSessionId) {
                state.activeSessionId = activeSessionId;
            }
            const params = new URLSearchParams();
            if (activeSessionId) {
                params.set("session_id", activeSessionId);
            }
            if (includeComparisons) {
                params.set("include_comparisons", "true");
            }
            const query = params.toString() ? `?${params.toString()}` : "";
            const data = await fetchJson(`/quote-compare/bootstrap${query}`);
            const bootstrapReceivedAt = performance.now();
            console.info("[compare prices bootstrap response received]", {
                includeComparisons,
                hasActiveSession: Boolean(data?.active_session),
                comparisons: Array.isArray(data?.comparisons) ? data.comparisons.length : 0
            });
            logQuoteCompareRestore("quote_compare.restore.bootstrap_received", {
                includeComparisons,
                hasActiveSession: Boolean(data?.active_session),
                comparisons: Array.isArray(data?.comparisons) ? data.comparisons.length : 0,
                elapsedMs: Number((bootstrapReceivedAt - loadStartedAt).toFixed(1))
            });
            if (includeComparisons) {
                hydrateComparisons(state, data.comparisons || []);
            }
            if (activeSessionId && !data.active_session) {
                if (!includeComparisons || !hasExistingActiveContext) {
                    resetQuoteCompareUploadState(
                        state,
                        "Your last upload session could not be recovered. Please upload the file again."
                    );
                }
                return;
            }
            if (!data.active_session) {
                if (preferredLastScreen && applyLastQuoteCompareScreen(state, preferredLastScreen)) {
                    return;
                }
                if (["review", "analyze", "history"].includes(persistedCurrentScreen)) {
                    if (!includeComparisons || !hasExistingActiveContext) {
                        resetQuoteCompareUploadState(state);
                    }
                }
                return;
            }

            const activeSession = data.active_session;
            const canRestoreAnalyze = isValidRestorableAnalyzeSession(activeSession);
            const canRestoreReview = activeSession.step === "review" && isValidRestorableReviewSession(activeSession);
            if (!canRestoreReview && !canRestoreAnalyze) {
                if (!includeComparisons || !hasExistingActiveContext) {
                    resetQuoteCompareUploadState(
                        state,
                        "Your last upload session is incomplete. Please upload the file again."
                    );
                }
                return;
            }

            state.activeSessionId = activeSession.session_id || state.activeSessionId;
            if (state.activeSessionId) {
                sessionStorage.setItem(QUOTE_COMPARE_ACTIVE_SESSION_KEY, state.activeSessionId);
            }
            state.uploadReview = {
                session_id: activeSession.session_id || "",
                filename: activeSession.filename || "",
                required_fields: activeSession.required_fields || REQUIRED_FIELDS,
                optional_fields: activeSession.optional_fields || OPTIONAL_FIELDS,
                message: activeSession.message || "",
                review_message: activeSession.review_message || "",
                mapping: activeSession.mapping || {},
                field_reviews: activeSession.field_reviews || [],
                matched_fields: activeSession.matched_fields || 0,
                missing_fields: activeSession.missing_fields || [],
                optional_columns: activeSession.optional_columns || [],
                headers: activeSession.headers || []
            };
            state.headers = activeSession.headers || [];
            state.detectedMappings = { ...(activeSession.mapping || {}) };
            state.selectedMappings = (
                activeSession.session_id === activeSessionId
                && isValidSelectedMappingSet(persistedSelectedMappings, state.headers)
                && Object.values(persistedSelectedMappings).some(Boolean)
            )
                ? persistedSelectedMappings
                : { ...(activeSession.mapping || {}) };
            computeValidation(state);

            if (canRestoreAnalyze) {
                if (preferredLastScreen?.currentScreen === "history") {
                    state.restorePerf = {
                        ...(state.restorePerf || {}),
                        bootstrapReceivedAt
                    };
                    hydrateAnalyzeState(state, activeSession.comparison, activeSession.evaluation, {
                        screen: "history",
                        step: 4,
                        markRestore: true
                    });
                    return;
                }
                if (preferredLastScreen?.currentScreen === "analyze") {
                    state.restorePerf = {
                        ...(state.restorePerf || {}),
                        bootstrapReceivedAt
                    };
                    hydrateAnalyzeState(state, activeSession.comparison, activeSession.evaluation, {
                        screen: "analyze",
                        step: 3,
                        markRestore: true
                    });
                    return;
                }
                if (preferredLastScreen?.currentScreen === "review") {
                    state.analysisResult = null;
                    state.rows = [];
                    state.currentScreen = "review";
                    state.currentStep = 2;
                    return;
                }
                state.restorePerf = {
                    ...(state.restorePerf || {}),
                    bootstrapReceivedAt
                };
                hydrateAnalyzeState(state, activeSession.comparison, activeSession.evaluation, {
                    screen: persistedCurrentScreen === "history" ? "history" : "analyze",
                    step: persistedCurrentScreen === "history" ? 4 : 3,
                    markRestore: true
                });
                return;
            }

            state.analysisResult = null;
            state.rows = [];
            state.currentScreen = "review";
            state.currentStep = 2;
            console.info("[compare prices bootstrap timing]", {
                includeComparisons,
                durationMs: Number((performance.now() - loadStartedAt).toFixed(1)),
                currentScreen: state.currentScreen
            });
        } catch (error) {
            if (!includeComparisons || !hasExistingActiveContext) {
                resetQuoteCompareUploadState(
                    state,
                    "Your last upload session could not be restored. Please upload the file again."
                );
            }
        } finally {
            console.info("[compare prices restore bootstrap end]", {
                includeComparisons,
                durationMs: Number((performance.now() - loadStartedAt).toFixed(1)),
                currentScreen: state.currentScreen
            });
        }
    }

    async function ensureHistoryComparisonsLoaded(state) {
        if (state.hasLoadedSavedComparisons || state.isHistoryLoading) {
            return;
        }
        state.isHistoryLoading = true;
        const startedAt = performance.now();
        try {
            await loadSavedComparisons(state, { includeComparisons: true });
            console.info("[compare prices history bootstrap timing]", {
                durationMs: Number((performance.now() - startedAt).toFixed(1)),
                comparisons: state.savedComparisons.length
            });
        } finally {
            state.isHistoryLoading = false;
        }
    }

    function renderQcStart(state) {
        return `
            <section class="qc2-screen qc2-screen-start">
                <div class="qc2-head">
                    <div class="panel-label">Compare Prices</div>
                    <h2 class="qc2-title">Choose how you want to begin</h2>
                    <p class="qc2-copy">Upload a supplier pricing file for column review or enter supplier price rows manually when you need a quick buying decision.</p>
                </div>
                <div class="info-box quote-compare-info-box">
                    <strong>Before you start:</strong>
                    Analysis quality depends on your data. Make sure your product names and units are consistent (e.g., lb vs lbs, case vs pcs).
                </div>
                ${state?.demoMode ? `
                    <div class="info-box quote-compare-info-box">
                        Demo Mode is preview-only. Upload and manual-entry actions are disabled while sample data is active.
                    </div>
                ` : ""}
                <div class="qc2-choice-grid">
                    ${state?.demoMode ? `
                        <button type="button" class="qc2-choice-card" data-qc-action="start-demo">
                            <span class="qc2-choice-title">Try Demo</span>
                            <span class="qc2-choice-copy">Load the sample pricing dataset and continue through the same analysis experience buyers see after a successful upload.</span>
                        </button>
                    ` : ""}
                    <button type="button" class="qc2-choice-card" data-qc-action="start-upload" ${state?.demoMode ? "hidden" : ""}>
                        <span class="qc2-choice-title">Upload Pricing File</span>
                        <span class="qc2-choice-copy">Parse one CSV or Excel file, review the detected mappings, and move straight into analysis.</span>
                    </button>
                    <button type="button" class="qc2-choice-card qc2-choice-card-secondary" data-qc-action="start-manual" ${state?.demoMode ? "hidden" : ""}>
                        <span class="qc2-choice-title">Enter Supplier Prices Manually</span>
                        <span class="qc2-choice-copy">Add supplier price rows one by one when data arrives outside a spreadsheet.</span>
                    </button>
                </div>
            </section>
        `;
    }

    function renderQcUpload(state) {
        const fileName = state.file ? state.file.name : "No file selected yet";
        const canReview = !state.isParsing && Boolean(state.file && state.uploadReview && state.headers.length);
        const fileStatus = state.isParsing
            ? "Parsing uploaded file"
            : state.headers.length
                ? `${state.headers.length} columns detected`
                : "Waiting for file";
        return `
            <section class="qc2-screen qc2-screen-upload">
                <div class="qc2-card qc2-upload-card">
                    <div class="qc2-head qc2-upload-head">
                        <div class="upload-step">Step 1</div>
                        <h2 class="qc2-title">Upload supplier pricing file</h2>
                        <p class="qc2-copy">Upload one supplier pricing file, check the detected columns, and move into review with a clean structured file.</p>
                    </div>
                    <div class="qc2-upload-panel">
                        <div class="qc2-upload-shell">
                            <div class="qc2-upload-copy-block">
                                <div class="qc2-upload-title">Supported formats</div>
                                <div class="qc2-upload-copy">CSV, XLSX, XLS</div>
                                <div class="qc2-upload-note">Use a supplier export or pricing sheet with clear column headers so matching can be reviewed quickly.</div>
                            </div>
                            <div class="qc2-upload-actions">
                                <button type="button" class="secondary-btn" data-qc-action="pick-file">Choose File</button>
                                <button type="button" class="secondary-btn" data-qc-action="replace-file" ${state.file ? "" : "hidden"}>Replace File</button>
                                <button type="button" class="secondary-btn" data-qc-action="remove-file" ${state.file ? "" : "hidden"}>Remove File</button>
                            </div>
                        </div>
                        <div class="qc2-file-panel">
                            <div class="qc2-file-panel-head">
                                <div class="qc2-file-panel-label">Selected file</div>
                                <span class="mapping-summary-chip">${escapeHtml(fileStatus)}</span>
                            </div>
                            <div class="qc2-file-line">
                                <div class="qc2-file-meta">
                                    <span class="qc2-file-label">File name</span>
                                    <span class="qc2-file-name">${escapeHtml(fileName)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <input class="qc2-hidden-input" id="qc2FileInput" type="file" accept=".csv,.xlsx,.xls">
                    ${renderStatus(state)}
                    <div class="qc2-actions qc2-upload-footer">
                        <button type="button" class="secondary-btn" data-qc-action="back-start">Back</button>
                        <button type="button" class="action-btn" data-qc-action="go-review" ${canReview ? "" : "disabled"}>${state.isParsing ? "Parsing Headers..." : "Review Columns"}</button>
                    </div>
                </div>
            </section>
        `;
    }

    const MANUAL_REQUIRED_FIELD_LABELS = {
        product_name: "Product Name",
        supplier_name: "Supplier",
        unit: "Unit",
        quantity: "Quantity",
        unit_price: "Unit Price",
        quote_date: "Date"
    };

    const MANUAL_OPTIONAL_FIELDS = [
        { key: "currency", label: "Currency", type: "text" },
        { key: "delivery_time", label: "Delivery Time", type: "text" },
        { key: "payment_term", label: "Payment Terms", type: "text" },
        { key: "valid_until", label: "Valid Until", type: "date" },
        { key: "notes", label: "Notes", type: "text", className: "is-wide" }
    ];

    function getManualRowMissingFields(row) {
        const safeRow = row || {};
        const missingFields = [];
        if (!String(safeRow.product_name || "").trim()) missingFields.push("product_name");
        if (!String(safeRow.supplier_name || "").trim()) missingFields.push("supplier_name");
        if (!String(safeRow.unit || "").trim()) missingFields.push("unit");
        if (!(Number(safeRow.quantity || 0) > 0)) missingFields.push("quantity");
        if (!(Number(safeRow.unit_price || 0) > 0)) missingFields.push("unit_price");
        if (!String(safeRow.quote_date || "").trim()) missingFields.push("quote_date");
        return missingFields;
    }

    function isManualRowTouched(row) {
        const safeRow = row || {};
        return [
            safeRow.product_name,
            safeRow.supplier_name,
            safeRow.unit,
            safeRow.quantity,
            safeRow.unit_price,
            safeRow.quote_date
        ].some((value) => String(value ?? "").trim() !== "");
    }

    function renderManualFieldLabel(label) {
        return `${escapeHtml(label)} <span class="qc2-manual-required" aria-hidden="true">*</span>`;
    }

    function renderManualOptionalField(row, index, field) {
        const value = row[field.key] ?? "";
        const inputClassName = field.type === "date"
            ? "recipe-input qc2-manual-date-input"
            : "recipe-input";
        return `
            <label class="recipe-field ${field.className || ""}">
                <span class="recipe-field-label">${escapeHtml(field.label)}</span>
                <input
                    class="${inputClassName}"
                    type="${field.type}"
                    data-manual-field="${field.key}"
                    data-index="${index}"
                    value="${escapeHtml(value)}"
                    aria-label="${escapeHtml(field.label)}"
                >
            </label>
        `;
    }

    function getManualTouchedRows(state) {
        return (state.manualRows || []).filter((row) => isManualRowTouched(row));
    }

    function getManualValidation(state) {
        const touchedRows = getManualTouchedRows(state);
        const incompleteRows = touchedRows
            .map((row, index) => ({
                index,
                row,
                missingFields: getManualRowMissingFields(row)
            }))
            .filter((item) => item.missingFields.length > 0);
        const completeRows = touchedRows.filter((row) => getManualRowMissingFields(row).length === 0);
        return {
            touchedRows,
            touchedCount: touchedRows.length,
            completeRows,
            completeCount: completeRows.length,
            incompleteRows,
            incompleteCount: incompleteRows.length,
            ready: completeRows.length > 0 && incompleteRows.length === 0
        };
    }

    function getManualNormalizedRows(state) {
        return getManualValidation(state).completeRows.map((row) => {
            const quantity = Number(row.quantity || 0);
            const unitPrice = Number(row.unit_price || 0);
            const derivedTotalPrice = quantity * unitPrice;
            return {
                supplier_name: String(row.supplier_name || "").trim(),
                product_name: String(row.product_name || "").trim(),
                unit: String(row.unit || "").trim(),
                quantity,
                unit_price: unitPrice,
                total_price: row.total_price ? Number(row.total_price || 0) : derivedTotalPrice,
                quote_date: String(row.quote_date || "").trim() || null,
                currency: String(row.currency || "USD").trim() || "USD",
                delivery_time: String(row.delivery_time || "").trim(),
                payment_term: String(row.payment_term || "").trim(),
                valid_until: String(row.valid_until || "").trim() || null,
                notes: String(row.notes || "").trim() || null
            };
        });
    }

    function renderManualDateInput(index, value) {
        return `
            <div class="recipe-field">
                <span class="recipe-field-label">${renderManualFieldLabel("Date")}</span>
                <input class="recipe-input qc2-manual-date-input" type="date" data-manual-field="quote_date" data-index="${index}" value="${escapeHtml(value)}" aria-label="Date">
            </div>
        `;
    }

    function renderManualRow(row, index) {
        const missingFields = getManualRowMissingFields(row);
        const showInlineFeedback = isManualRowTouched(row) && missingFields.length > 0;
        return `
            <div class="qc2-manual-row${showInlineFeedback ? " is-incomplete" : ""}" data-manual-row="${index}">
                <div class="qc2-manual-row-main">
                    <label class="recipe-field"><span class="recipe-field-label">${renderManualFieldLabel("Product Name")}</span><input class="recipe-input" data-manual-field="product_name" data-index="${index}" value="${escapeHtml(row.product_name)}"></label>
                    <label class="recipe-field"><span class="recipe-field-label">${renderManualFieldLabel("Supplier")}</span><input class="recipe-input" data-manual-field="supplier_name" data-index="${index}" value="${escapeHtml(row.supplier_name)}"></label>
                    <label class="recipe-field"><span class="recipe-field-label">${renderManualFieldLabel("Unit")}</span><input class="recipe-input" data-manual-field="unit" data-index="${index}" value="${escapeHtml(row.unit)}"></label>
                    <label class="recipe-field"><span class="recipe-field-label">${renderManualFieldLabel("Quantity")}</span><input class="recipe-input" type="number" min="0" step="0.01" data-manual-field="quantity" data-index="${index}" value="${escapeHtml(row.quantity)}"></label>
                    <label class="recipe-field"><span class="recipe-field-label">${renderManualFieldLabel("Unit Price")}</span><input class="recipe-input" type="number" min="0" step="0.01" data-manual-field="unit_price" data-index="${index}" value="${escapeHtml(row.unit_price)}"></label>
                    ${renderManualDateInput(index, row.quote_date)}
                    <button type="button" class="secondary-btn qc2-remove-row qc2-manual-row-action" data-qc-action="remove-manual-row" data-index="${index}" ${index === 0 ? "disabled" : ""}>Remove</button>
                </div>
                <div class="qc2-manual-row-optional">
                    ${MANUAL_OPTIONAL_FIELDS.map((field) => renderManualOptionalField(row, index, field)).join("")}
                </div>
                ${showInlineFeedback ? `<div class="qc2-manual-inline-note">Complete required fields: ${escapeHtml(missingFields.map((fieldName) => MANUAL_REQUIRED_FIELD_LABELS[fieldName]).join(", "))}.</div>` : ""}
            </div>
        `;
    }

    function renderQcManual(state) {
        const validation = getManualValidation(state);
        return `
            <section class="qc2-screen qc2-screen-manual">
                <div class="qc2-card qc2-upload-card">
                    <div class="qc2-head qc2-head-compact">
                        <div class="upload-step">Step 1</div>
                        <h2 class="qc2-title">Enter supplier prices manually</h2>
                        <p class="qc2-copy">Enter supplier rows by hand using the same required fields and review discipline as the upload flow before analysis begins.</p>
                    </div>
                    <div class="qc2-upload-panel">
                        <div class="qc2-upload-shell">
                            <div class="qc2-upload-copy-block">
                                <div class="qc2-upload-title">Manual pricing rows</div>
                                <div class="qc2-upload-copy">${validation.completeCount} ready rows • ${validation.incompleteCount} incomplete rows</div>
                                <div class="qc2-upload-note">Required fields come first. Optional context stays available below each row when payment terms, notes, or validity dates matter.</div>
                            </div>
                            <div class="qc2-upload-actions">
                                <button type="button" class="secondary-btn" data-qc-action="add-manual-row">Add Row</button>
                            </div>
                        </div>
                    </div>
                    <div class="qc2-manual-list">
                        ${state.manualRows.map(renderManualRow).join("")}
                    </div>
                    ${renderStatus(state)}
                    <div class="qc2-actions qc2-manual-actions">
                        <div class="qc2-manual-actions-group">
                            <button type="button" class="secondary-btn qc2-manual-footer-btn" data-qc-action="back-start">Back</button>
                            <button type="button" class="secondary-btn qc2-manual-footer-btn" data-qc-action="add-manual-row">Add Row</button>
                        </div>
                        <div class="qc2-manual-actions-group qc2-manual-actions-group-end">
                            <button type="button" class="action-btn qc2-manual-footer-btn qc2-manual-footer-btn-primary" data-qc-action="go-manual-review" ${validation.completeCount ? "" : "disabled"}>Review Manual Rows</button>
                        </div>
                    </div>
                </div>
            </section>
        `;
    }

    function renderManualReviewTableRow(row, index) {
        return `
            <tr>
                <td>${index + 1}</td>
                <td>${escapeHtml(row.product_name)}</td>
                <td>${escapeHtml(row.supplier_name)}</td>
                <td>${escapeHtml(row.unit)}</td>
                <td>${escapeHtml(String(row.quantity))}</td>
                <td>${escapeHtml(formatCurrency(row.unit_price, row.currency))}</td>
                <td>${escapeHtml(formatDate(row.quote_date))}</td>
                <td>${escapeHtml(row.currency || "USD")}</td>
                <td>${escapeHtml(row.notes || "—")}</td>
            </tr>
        `;
    }

    function renderQcManualReview(state) {
        const validation = getManualValidation(state);
        const normalizedRows = getManualNormalizedRows(state);
        const incompleteText = validation.incompleteRows.length
            ? validation.incompleteRows.map((item) => `Row ${item.index + 1}: ${item.missingFields.map((fieldName) => MANUAL_REQUIRED_FIELD_LABELS[fieldName]).join(", ")}`).join(" | ")
            : "";

        return `
            <section class="qc2-screen qc2-screen-review">
                <div class="mapping-review-panel qc2-review-panel">
                    <div class="mapping-review-head">
                        <div>
                            <div class="upload-step">Step 2</div>
                            <h2 class="mapping-review-title">Review your manual pricing rows</h2>
                            <p class="mapping-review-copy">Confirm the required fields, scan the entered supplier rows, and move to analysis only when the manual dataset is complete.</p>
                        </div>
                        <div class="mapping-summary-chips">
                            <span class="mapping-summary-chip">${validation.completeCount} of ${validation.touchedCount || state.manualRows.length} rows ready</span>
                            <span class="mapping-summary-chip ${validation.ready ? "" : "is-warning"}">${validation.ready ? "Ready for analysis" : "Incomplete rows"}</span>
                        </div>
                    </div>
                    <div class="mapping-alert mapping-alert-info">Manual entry uses the same required fields as upload: Product Name, Supplier, Unit, Quantity, Unit Price, and Date.</div>
                    <section class="mapping-section">
                        <div class="mapping-section-head">
                            <div>
                                <div class="mapping-section-title">Entered supplier rows</div>
                                <div class="mapping-section-copy">Review the rows exactly as they will be sent into pricing analysis.</div>
                            </div>
                        </div>
                        <div class="quote-compare-table-scroll qc2-manual-review-table-shell">
                            <table class="quote-compare-table qc2-manual-review-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Product Name</th>
                                        <th>Supplier</th>
                                        <th>Unit</th>
                                        <th>Quantity</th>
                                        <th>Unit Price</th>
                                        <th>Date</th>
                                        <th>Currency</th>
                                        <th>Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${normalizedRows.length ? normalizedRows.map((row, index) => renderManualReviewTableRow(row, index)).join("") : '<tr><td colspan="9"><div class="decision-list-empty">Add at least one complete supplier row to review it here.</div></td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </section>
                    <section class="mapping-section">
                        <div class="mapping-section-head">
                            <div>
                                <div class="mapping-section-title">Optional context</div>
                                <div class="mapping-section-copy">Currency, delivery timing, payment terms, validity, and notes are passed through when provided.</div>
                            </div>
                        </div>
                        <div class="mapping-alert mapping-alert-info">Total price is derived automatically from Quantity x Unit Price when not entered manually.</div>
                    </section>
                    ${incompleteText ? `<div class="mapping-alert mapping-alert-error">${escapeHtml(incompleteText)}</div>` : ""}
                    ${renderStatus(state)}
                    <div class="qc2-actions">
                        <button type="button" id="qcStep2BackBtn" class="secondary-btn" data-qc-action="back-review">Back</button>
                        <button type="button" id="qcStep2StartBtn" class="action-btn" data-qc-action="start-analysis" ${validation.ready && !state.isSubmitting ? "" : "disabled"}>${state.isSubmitting ? "Starting..." : "Start Analysis"}</button>
                    </div>
                </div>
            </section>
        `;
    }

    function detectStatusText(fieldName, selectedColumn, detectedColumn, detectedQuality) {
        if (!selectedColumn) return REQUIRED_FIELDS.includes(fieldName) ? "Missing" : "Optional";
        if (!detectedColumn) return "Manual";
        if (selectedColumn !== detectedColumn) return "Changed";
        return detectedQuality === "exact" || detectedQuality === "alias" || detectedQuality === "strong" ? "Auto-detected" : "Likely match";
    }

    function buildMappingOptions(state, row) {
        const assignedColumns = new Set(
            Object.entries(state.selectedMappings || {})
                .filter(([fieldName, columnName]) => fieldName !== row.fieldName && columnName)
                .map(([, columnName]) => columnName)
        );
        return state.headers.map((columnName) => ({
            value: columnName,
            disabled: assignedColumns.has(columnName) && columnName !== row.selectedColumn
        }));
    }

    function renderMappingRow(row, duplicateColumns) {
        const statusText = detectStatusText(row.fieldName, row.selectedColumn, row.detectedColumn, row.detectedQuality);
        const hasDuplicate = row.selectedColumn && duplicateColumns.includes(row.selectedColumn);
        const isVisualError = hasDuplicate || (row.required && !row.selectedColumn);
        const statusClass = !row.selectedColumn || hasDuplicate
            ? "is-missing"
            : row.detectedColumn && row.selectedColumn === row.detectedColumn
                ? (row.detectedQuality === "exact" || row.detectedQuality === "alias" || row.detectedQuality === "strong" ? "is-strong" : "is-possible")
                : "is-possible";
        const duplicateNote = hasDuplicate ? "This uploaded column is already assigned elsewhere." : "";
        return `
            <div class="mapping-row ${isVisualError ? "is-missing" : ""}" data-field-name="${escapeHtml(row.fieldName)}">
                <div class="mapping-field-label mapping-row-info">
                    <div class="qc2-review-field-head">
                        <div class="mapping-field-title">${escapeHtml(row.fieldName)}</div>
                        ${!row.required ? '<span class="qc2-optional-badge">Optional</span>' : ""}
                        ${row.autoDetected ? '<span class="qc2-detected-badge">Auto-detected</span>' : ""}
                    </div>
                    <div class="mapping-field-help">${escapeHtml(FIELD_HELP[row.fieldName] || "")}</div>
                    ${duplicateNote ? `<div class="qc2-inline-error">${escapeHtml(duplicateNote)}</div>` : ""}
                    ${row.required && !row.selectedColumn ? '<div class="qc2-inline-error">This required field still needs a unique column.</div>' : ""}
                </div>
                <div class="mapping-select-shell mapping-row-select">
                    <select class="mapping-select" data-qc-mapping-field="${escapeHtml(row.fieldName)}">
                        <option value="">Choose a column</option>
                        ${row.options.map((option) => `<option value="${escapeHtml(option.value)}" ${option.value === row.selectedColumn ? "selected" : ""} ${option.disabled ? "disabled" : ""}>${escapeHtml(option.value)}${option.disabled ? " (Already used)" : ""}</option>`).join("")}
                    </select>
                </div>
                <div class="mapping-row-status">
                    <span class="mapping-status ${statusClass}">${escapeHtml(statusText)}</span>
                </div>
            </div>
        `;
    }

    function renderQcReview(state) {
        if (state.mode === "manual") {
            return renderQcManualReview(state);
        }
        const rows = getReviewRows(state).map((row) => ({ ...row, options: buildMappingOptions(state, row) }));
        const requiredRows = rows.filter((row) => row.required);
        const optionalRows = rows.filter((row) => !row.required);
        const duplicateColumns = state.validation.duplicateColumns.map((item) => item.columnName);
        const duplicateText = state.validation.duplicateColumns.map((item) => `"${item.columnName}" is assigned to ${item.fieldNames.join(", ")}.`).join(" ");
        const missingText = state.validation.missingFields.length ? `Map the remaining required fields: ${state.validation.missingFields.join(", ")}.` : "";
        const mappingReuseBanner = state.mappingReuseNotice
            ? `<div class="mapping-alert mapping-alert-${escapeHtml(state.mappingReuseNotice.tone || "info")}">${escapeHtml(state.mappingReuseNotice.message)}${state.mappingReuseCandidate ? ' <button type="button" class="secondary-btn mapping-toolbar-btn" data-qc-action="apply-saved-mappings-partial">Apply matching fields</button>' : ""}</div>`
            : "";

        return `
            <section class="qc2-screen qc2-screen-review">
                <div class="mapping-review-panel qc2-review-panel">
                    <div class="mapping-review-head">
                        <div>
                            <div class="upload-step">Step 2</div>
                            <h2 class="mapping-review-title">Review your column matches</h2>
                            <p class="mapping-review-copy">Confirm each required field, adjust anything that was matched incorrectly, and start analysis only when the mapping is complete.If you have used the same supplier pricing format with same file name before, you may be able to reuse past mappings to save time.</p>
                            
                        </div>
                        <div class="mapping-summary-chips">
                            <span class="mapping-summary-chip">${state.validation.mappedCount} of ${REQUIRED_FIELDS.length} required fields mapped</span>
                            <span class="mapping-summary-chip ${state.validation.ready ? "" : "is-warning"}">${state.validation.ready ? "Ready for analysis" : "Incomplete mapping"}</span>
                        </div>
                    </div>
                    <div class="mapping-alert mapping-alert-info">${escapeHtml(state.file?.name || state.uploadReview?.filename || "Uploaded file")}</div>
                    ${mappingReuseBanner}
                    <div class="mapping-toolbar">
                        <div class="mapping-toolbar-copy">Required fields come first. Each uploaded column can be assigned only once.</div>
                        <div class="mapping-toolbar-actions">
                            <button type="button" class="secondary-btn mapping-toolbar-btn" data-qc-action="clear-mappings">Clear selections</button>
                        </div>
                    </div>
                    ${!state.headers.length ? '<div class="mapping-alert mapping-alert-error">No parsed columns are available for this upload. Go back and choose another file.</div>' : ""}
                    <section class="mapping-section">
                        <div class="mapping-section-head">
                            <div>
                                <div class="mapping-section-title">Required mappings</div>
                                <div class="mapping-section-copy">These six fields must be mapped uniquely before analysis can begin.</div>
                            </div>
                        </div>
                        <div class="mapping-grid">
                            ${requiredRows.map((row) => renderMappingRow(row, duplicateColumns)).join("")}
                        </div>
                    </section>
                    <section class="mapping-section">
                        <div class="mapping-section-head">
                            <div>
                                <div class="mapping-section-title">Optional context</div>
                                <div class="mapping-section-copy">Use these only when payment terms, delivery timing, currency, or notes should add context to the sourcing decision.</div>
                            </div>
                        </div>
                        <div class="mapping-grid">
                            ${optionalRows.map((row) => renderMappingRow(row, duplicateColumns)).join("") || '<div class="decision-list-empty">No optional fields were detected for this upload.</div>'}
                        </div>
                    </section>
                    ${missingText || duplicateText ? `<div class="mapping-alert mapping-alert-error">${escapeHtml(`${missingText} ${duplicateText}`.trim())}</div>` : ""}
                    ${renderStatus(state)}
                    <div class="qc2-actions">
                        <button type="button" class="secondary-btn" data-qc-action="back-home">Back to Home</button>
                        <button type="button" id="qcStep2BackBtn" class="secondary-btn" data-qc-action="${state.mode === "manual" ? "back-review" : "back-upload"}">Back</button>
                        <button type="button" id="qcStep2StartBtn" class="action-btn" data-qc-action="start-analysis" ${state.validation.ready && !state.isSubmitting ? "" : "disabled"}>${state.isSubmitting ? "Starting..." : "Start Analysis"}</button>
                    </div>
                </div>
            </section>
        `;
    }

    async function triggerStep2StartAnalysis(elements, state) {
        if (state.isSubmitting) return;
        const triggerStartedAt = performance.now();
        state.isSubmitting = true;
        await setProgressPhase(state, "Validating -> Mapping -> Aggregating -> Building analysis");
        renderApp(elements, state, { preserveScroll: true });
        await waitForNextPaint();
        const started = state.demoMode
            ? await startDemoAnalysis(state)
            : state.mode === "manual"
            ? await startManualAnalysis(state, elements)
            : await startUploadAnalysis(state, elements);
        state.progressPhase = "";
        renderApp(elements, state);
        if (started) {
            writeScrollPosition(elements, 0);
            requestAnimationFrame(() => {
                const postConfirmVisibleAt = performance.now();
                const extraWorkMs = state.confirmResponseReceivedAt
                    ? Number((postConfirmVisibleAt - state.confirmResponseReceivedAt).toFixed(1))
                    : 0;
                console.info("[compare prices step3 visible after confirm]", {
                    durationMs: Number((performance.now() - triggerStartedAt).toFixed(1)),
                    currentScreen: state.currentScreen
                });
                console.info("[PERF] confirm_to_analyze.extra_work_ms", {
                    durationMs: extraWorkMs
                });
                console.info("[PERF] confirm_to_analyze.total_post_confirm_ms", {
                    durationMs: state.confirmResponseReceivedAt
                        ? Number((postConfirmVisibleAt - state.confirmResponseReceivedAt).toFixed(1))
                        : 0
                });
                requestAnimationFrame(() => {
                    const scopePayload = state.pendingPostConfirmScopePayload || buildClientAnalysisScopePayload(state);
                    state.pendingPostConfirmScopePayload = null;
                    (state.demoMode
                        ? activateAnalysisScope(elements, state, "demo", scopePayload, state.demoSessionId)
                        : activateCurrentUploadScope(elements, state, scopePayload)
                    ).catch(() => null);
                    state.deferPersistUntilPostConfirmPaint = false;
                    scheduleQuoteCompareSessionPersist(state, elements);
                });
            });
        }
    }

    function bindCriticalQuoteCompareButtons(elements, state) {
        const analysisScroller = elements.app?.querySelector(".qc2-analysis-table-scroll");
        if (analysisScroller && analysisScroller.dataset.virtualBound !== "true") {
            analysisScroller.dataset.virtualBound = "true";
            analysisScroller.addEventListener("scroll", () => {
                const filteredCards = getFilteredAnalysisCards(state, getAnalysisDecisionCards(state));
                if (filteredCards.length <= 60) return;
                const viewportHeight = analysisScroller.clientHeight || 0;
                const scrollTop = analysisScroller.scrollTop || 0;
                const approxStart = Math.max(Math.floor(scrollTop / ANALYSIS_ROW_HEIGHT) - ANALYSIS_VIRTUAL_OVERSCAN, 0);
                const approxVisible = Math.ceil(viewportHeight / ANALYSIS_ROW_HEIGHT) + (ANALYSIS_VIRTUAL_OVERSCAN * 2);
                const nextViewport = {
                    start: approxStart,
                    end: Math.min(approxStart + approxVisible, filteredCards.length),
                    scrollTop
                };
                const previousViewport = state.analysisViewport || { start: 0, end: 80, scrollTop: 0 };
                if (
                    previousViewport.start === nextViewport.start
                    && previousViewport.end === nextViewport.end
                    && Math.abs((previousViewport.scrollTop || 0) - scrollTop) < 4
                ) {
                    return;
                }
                state.analysisViewport = nextViewport;
                if (state.analysisViewportFrame) {
                    cancelAnimationFrame(state.analysisViewportFrame);
                }
                state.analysisViewportFrame = requestAnimationFrame(() => {
                    state.analysisViewportFrame = 0;
                    applyAnalysisTableFilter(elements, state);
                });
            }, { passive: true });
        }

    }

    const MANUAL_REBUILD_FIELDS = [
        { key: "product_name", label: "Product Name", required: true, type: "text" },
        { key: "supplier_name", label: "Supplier", required: true, type: "text" },
        { key: "unit", label: "Unit", required: true, type: "text" },
        { key: "quantity", label: "Quantity", required: true, type: "number", min: "0", step: "0.01" },
        { key: "unit_price", label: "Unit Price", required: true, type: "number", min: "0", step: "0.01" },
        { key: "quote_date", label: "Date", required: true, type: "date" },
        { key: "currency", label: "Currency", required: false, type: "text" },
        { key: "delivery_time", label: "Delivery Time", required: false, type: "text" },
        { key: "payment_term", label: "Payment Terms", required: false, type: "text" },
        { key: "valid_until", label: "Valid Until", required: false, type: "date" },
        { key: "notes", label: "Notes", required: false, type: "text" }
    ];

    const MANUAL_REBUILD_HEADERS = MANUAL_REBUILD_FIELDS.map((field) => field.label);
    const MANUAL_REBUILD_REQUIRED_LABELS = Object.fromEntries(
        MANUAL_REBUILD_FIELDS.filter((field) => field.required).map((field) => [field.key, field.label])
    );

    function normalizeManualDraftText(value) {
        return String(value ?? "").trim();
    }

    function parseManualDraftNumber(value) {
        const normalizedValue = String(value ?? "").trim().replace(/,/g, "");
        if (!normalizedValue) return 0;
        const parsed = Number(normalizedValue);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    function isManualDraftRowBlank(row) {
        return MANUAL_REBUILD_FIELDS.every((field) => normalizeManualDraftText(row?.[field.key]) === "");
    }

    function getManualRowMissingFields(row) {
        return MANUAL_REBUILD_FIELDS
            .filter((field) => field.required)
            .filter((field) => {
                if (field.key === "quantity" || field.key === "unit_price") {
                    return !(parseManualDraftNumber(row?.[field.key]) > 0);
                }
                return !normalizeManualDraftText(row?.[field.key]);
            })
            .map((field) => field.key);
    }

    function getManualDraftStats(state) {
        const draftRows = (state.manualRows || []).filter((row) => !isManualDraftRowBlank(row));
        const incompleteRows = draftRows
            .map((row, index) => ({
                index,
                row,
                missingFields: getManualRowMissingFields(row)
            }))
            .filter((item) => item.missingFields.length > 0);
        return {
            draftRows,
            rowCount: draftRows.length,
            incompleteRows,
            incompleteCount: incompleteRows.length,
            readyCount: draftRows.length - incompleteRows.length,
            ready: draftRows.length > 0 && incompleteRows.length === 0
        };
    }

    function buildManualDraftTableRows(state) {
        return getManualDraftStats(state).draftRows.map((row) => Object.fromEntries(
            MANUAL_REBUILD_FIELDS.map((field) => [field.label, row?.[field.key] ?? ""])
        ));
    }

    function buildManualReviewPayloadFromDraft() {
        return {
            session_id: "",
            filename: "Manual entry",
            required_fields: REQUIRED_FIELDS,
            optional_fields: OPTIONAL_FIELDS,
            message: "Manual pricing rows are ready for mapping review.",
            review_message: "Review required and optional column matches before moving into pricing analysis.",
            mapping: Object.fromEntries(MANUAL_REBUILD_FIELDS.map((field) => [field.label, field.label])),
            field_reviews: MANUAL_REBUILD_FIELDS.map((field) => ({
                field: field.label,
                detected_column: field.label,
                score: 200,
                match_quality: "exact"
            })),
            matched_fields: REQUIRED_FIELDS.length,
            missing_fields: [],
            optional_columns: [],
            headers: MANUAL_REBUILD_HEADERS
        };
    }

    function prepareManualDraftForReview(state) {
        const stats = getManualDraftStats(state);
        if (!stats.rowCount) {
            throw new Error("Add at least one pricing row before continuing to review.");
        }
        if (stats.incompleteCount) {
            const incompleteText = stats.incompleteRows
                .map((item) => `Row ${item.index + 1}: ${item.missingFields.map((fieldKey) => MANUAL_REBUILD_REQUIRED_LABELS[fieldKey]).join(", ")}`)
                .join(" | ");
            throw new Error(`Complete the required fields before continuing. ${incompleteText}`);
        }
        state.rows = buildManualDraftTableRows(state);
        initializeReviewState(state, buildManualReviewPayloadFromDraft());
    }

    function applySelectedMappingsToRows(rows, mapping) {
        const missingFields = REQUIRED_FIELDS.filter((fieldName) => !mapping?.[fieldName]);
        if (missingFields.length) {
            throw new Error(`Missing required field mappings: ${missingFields.join(", ")}`);
        }
        return (rows || []).map((row) => {
            const mappedRow = {};
            [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].forEach((fieldName) => {
                const sourceColumn = mapping?.[fieldName];
                if (!sourceColumn) return;
                mappedRow[fieldName] = row?.[sourceColumn] ?? "";
            });
            return mappedRow;
        });
    }

    function normalizeMappedManualRows(rows) {
        const textFields = new Set(["Supplier", "Product Name", "Unit", "Date", "Currency", "Delivery Time", "Payment Terms", "Valid Until", "Notes"]);
        return (rows || []).map((row) => {
            const normalizedRow = {};
            Object.entries(row || {}).forEach(([key, value]) => {
                normalizedRow[key] = textFields.has(key) ? normalizeManualDraftText(value) : value;
            });
            return normalizedRow;
        });
    }

    function buildQuoteBidImportResultFromRows(rows) {
        const bids = [];
        let skippedRowCount = 0;
        (rows || []).forEach((row) => {
            const supplierName = normalizeManualDraftText(row?.["Supplier"]);
            const productName = normalizeManualDraftText(row?.["Product Name"]);
            const unit = normalizeManualDraftText(row?.["Unit"]);
            const quantity = parseManualDraftNumber(row?.["Quantity"]);
            const unitPrice = parseManualDraftNumber(row?.["Unit Price"]);
            const totalPrice = parseManualDraftNumber(row?.["Total Price"]);
            if (!supplierName && !productName && quantity <= 0 && unitPrice <= 0 && totalPrice <= 0) {
                skippedRowCount += 1;
                return;
            }
            if (!supplierName || quantity <= 0) {
                skippedRowCount += 1;
                return;
            }
            const resolvedTotal = totalPrice > 0 ? totalPrice : quantity * unitPrice;
            if (unitPrice <= 0 && resolvedTotal <= 0) {
                skippedRowCount += 1;
                return;
            }
            bids.push({
                supplier_name: supplierName,
                product_name: productName,
                unit,
                quantity: Number(quantity.toFixed(4)),
                unit_price: Number(unitPrice.toFixed(4)),
                total_price: Number(resolvedTotal.toFixed(4)),
                quote_date: normalizeManualDraftText(row?.["Date"]),
                currency: normalizeManualDraftText(row?.["Currency"]).toUpperCase() || "USD",
                delivery_time: normalizeManualDraftText(row?.["Delivery Time"]),
                payment_term: normalizeManualDraftText(row?.["Payment Terms"]),
                valid_until: normalizeManualDraftText(row?.["Valid Until"]),
                notes: normalizeManualDraftText(row?.["Notes"])
            });
        });
        return {
            bids,
            skipped_row_count: skippedRowCount,
            valid_row_count: bids.length
        };
    }

    function refreshManualDraftUi(elements, state, rowIndex) {
        if (state.currentScreen !== "manual" || !elements.app) return;
        const stats = getManualDraftStats(state);
        const summaryNode = elements.app.querySelector("[data-qc-manual-summary]");
        if (summaryNode) {
            summaryNode.textContent = `${stats.readyCount} ready rows | ${stats.incompleteCount} incomplete rows`;
        }
        const reviewButton = elements.app.querySelector('[data-qc-action="go-manual-review"]');
        if (reviewButton) {
            reviewButton.disabled = !stats.rowCount;
        }
        const rowNode = elements.app.querySelector(`[data-manual-row="${rowIndex}"]`);
        if (!rowNode) return;
        const row = state.manualRows[rowIndex] || createEmptyManualRow();
        const missingFields = getManualRowMissingFields(row);
        const showInlineFeedback = !isManualDraftRowBlank(row) && missingFields.length > 0;
        rowNode.classList.toggle("is-incomplete", showInlineFeedback);
        rowNode.querySelectorAll("[data-manual-field]").forEach((input) => {
            const fieldKey = input.dataset.manualField || "";
            const isInvalid = showInlineFeedback && missingFields.includes(fieldKey);
            input.classList.toggle("is-invalid", isInvalid);
            if (isInvalid) {
                input.setAttribute("aria-invalid", "true");
            } else {
                input.removeAttribute("aria-invalid");
            }
        });
        const noteNode = rowNode.querySelector("[data-qc-manual-row-note]");
        if (noteNode) {
            noteNode.hidden = !showInlineFeedback;
            noteNode.textContent = showInlineFeedback
                ? `Complete: ${missingFields.map((fieldKey) => MANUAL_REBUILD_REQUIRED_LABELS[fieldKey]).join(", ")}.`
                : "";
        }
    }

    function getManualEntryScroller(elements) {
        return elements.app?.querySelector(".qc2-manual-entry-scroll") || null;
    }

    function restoreManualEntryScrollLeft(elements, scrollLeft) {
        requestAnimationFrame(() => {
            const scroller = getManualEntryScroller(elements);
            if (!scroller) return;
            scroller.scrollLeft = Math.max(Number(scrollLeft) || 0, 0);
        });
    }

    function renderManualDraftHeaderCell(field) {
        return `
            <th class="${field.required ? "is-required" : "is-optional"}">
                <span class="qc2-manual-entry-head-label">${escapeHtml(field.label)}</span>
                <span class="qc2-manual-entry-head-badge">${field.required ? "Required" : "Optional"}</span>
            </th>
        `;
    }

    function renderManualDraftCell(row, index, field) {
        const value = row?.[field.key] ?? "";
        const missingFields = getManualRowMissingFields(row);
        const isInvalid = !isManualDraftRowBlank(row) && missingFields.includes(field.key);
        const attrs = [];
        if (field.min != null) attrs.push(`min="${escapeHtml(field.min)}"`);
        if (field.step != null) attrs.push(`step="${escapeHtml(field.step)}"`);
        return `
            <td class="${field.required ? "is-required" : "is-optional"}">
                <label class="qc2-manual-entry-cell">
                    <span class="qc2-manual-entry-mobile-label">${escapeHtml(field.label)}${field.required ? " *" : ""}</span>
                    <input
                        class="recipe-input qc2-manual-entry-input ${isInvalid ? "is-invalid" : ""}"
                        type="${field.type}"
                        ${attrs.join(" ")}
                        data-manual-field="${field.key}"
                        data-index="${index}"
                        value="${escapeHtml(value)}"
                        aria-label="${escapeHtml(field.label)}"
                    >
                </label>
            </td>
        `;
    }

    function renderManualDraftRow(row, index) {
        const missingFields = getManualRowMissingFields(row);
        const showInlineFeedback = !isManualDraftRowBlank(row) && missingFields.length > 0;
        return `
            <tr class="${showInlineFeedback ? "is-incomplete" : ""}" data-manual-row="${index}">
                <td class="qc2-manual-entry-row-index">${index + 1}</td>
                ${MANUAL_REBUILD_FIELDS.map((field) => renderManualDraftCell(row, index, field)).join("")}
                <td class="qc2-manual-entry-row-actions">
                    <button type="button" class="secondary-btn qc2-remove-row" data-qc-action="remove-manual-row" data-index="${index}" ${index === 0 ? "disabled" : ""}>Remove</button>
                    ${showInlineFeedback ? `<div class="qc2-manual-inline-note">Complete: ${escapeHtml(missingFields.map((fieldKey) => MANUAL_REBUILD_REQUIRED_LABELS[fieldKey]).join(", "))}.</div>` : ""}
                </td>
            </tr>
        `;
    }

    function renderQcManual(state) {
        const stats = getManualDraftStats(state);
        return `
            <section class="qc2-screen qc2-screen-manual">
                <div class="qc2-card qc2-upload-card">
                    <div class="qc2-head qc2-head-compact">
                        <div class="upload-step">Step 1</div>
                        <h2 class="qc2-title">Enter pricing data</h2>
                        <p class="qc2-copy">Enter pricing rows manually using the same fields expected by upload, then continue into the same mapping and analysis workflow.</p>
                    </div>
                    <div class="qc2-upload-panel">
                        <div class="qc2-upload-shell">
                            <div class="qc2-upload-copy-block">
                                <div class="qc2-upload-title">Manual entry</div>
                                <div class="qc2-upload-copy">${stats.readyCount} ready rows • ${stats.incompleteCount} incomplete rows</div>
                                <div class="qc2-upload-note">Required fields mirror upload exactly. Optional fields keep delivery, payment, and validity context attached to each row.</div>
                            </div>
                            <div class="qc2-upload-actions">
                                <button type="button" class="secondary-btn" data-qc-action="add-manual-row">Add Row</button>
                            </div>
                        </div>
                    </div>
                    <div class="qc2-manual-entry-shell">
                        <div class="qc2-manual-entry-scroll">
                            <table class="quote-compare-table qc2-manual-entry-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        ${MANUAL_REBUILD_FIELDS.map((field) => renderManualDraftHeaderCell(field)).join("")}
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${state.manualRows.map((row, index) => renderManualDraftRow(row, index)).join("")}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="qc2-manual-entry-legend">
                        <span><strong>Required:</strong> Product Name, Supplier, Unit, Quantity, Unit Price, Date</span>
                        <span><strong>Optional:</strong> Currency, Delivery Time, Payment Terms, Valid Until, Notes</span>
                    </div>
                    ${renderStatus(state)}
                    <div class="qc2-actions qc2-manual-actions">
                        <div class="qc2-manual-actions-group">
                            <button type="button" class="secondary-btn qc2-manual-footer-btn" data-qc-action="back-start">Back</button>
                            <button type="button" class="secondary-btn qc2-manual-footer-btn" data-qc-action="add-manual-row">Add Row</button>
                        </div>
                        <div class="qc2-manual-actions-group qc2-manual-actions-group-end">
                            <button type="button" class="action-btn qc2-manual-footer-btn qc2-manual-footer-btn-primary" data-qc-action="go-manual-review" ${stats.rowCount ? "" : "disabled"}>Review Columns</button>
                        </div>
                    </div>
                </div>
            </section>
        `;
    }

    function renderQcReview(state) {
        const rows = getReviewRows(state).map((row) => ({ ...row, options: buildMappingOptions(state, row) }));
        const requiredRows = rows.filter((row) => row.required);
        const optionalRows = rows.filter((row) => !row.required);
        const duplicateColumns = state.validation.duplicateColumns.map((item) => item.columnName);
        const duplicateText = state.validation.duplicateColumns.map((item) => `"${item.columnName}" is assigned to ${item.fieldNames.join(", ")}.`).join(" ");
        const missingText = state.validation.missingFields.length ? `Map the remaining required fields: ${state.validation.missingFields.join(", ")}.` : "";
        const reviewCopy = state.mode === "manual"
            ? "Confirm the required fields, adjust anything you want to reinterpret, and start analysis only when the mapping is complete."
            : "Confirm each required field, adjust anything that was matched incorrectly, and start analysis only when the mapping is complete.If you have used the same supplier pricing format with same file name before, you may be able to reuse past mappings to save time.";
        const sourceLabel = state.mode === "manual" ? "Manual entry" : (state.file?.name || state.uploadReview?.filename || "Uploaded file");
        const toolbarCopy = state.mode === "manual"
            ? "Required fields come first. Each entered column can be assigned only once."
            : "Required fields come first. Each uploaded column can be assigned only once.";

        return `
            <section class="qc2-screen qc2-screen-review">
                <div class="mapping-review-panel qc2-review-panel">
                    <div class="mapping-review-head">
                        <div>
                            <div class="upload-step">Step 2</div>
                            <h2 class="mapping-review-title">Review your column matches</h2>
                            <p class="mapping-review-copy">${reviewCopy}</p>
                        </div>
                        <div class="mapping-summary-chips">
                            <span class="mapping-summary-chip">${state.validation.mappedCount} of ${REQUIRED_FIELDS.length} required fields mapped</span>
                            <span class="mapping-summary-chip ${state.validation.ready ? "" : "is-warning"}">${state.validation.ready ? "Ready for analysis" : "Incomplete mapping"}</span>
                        </div>
                    </div>
                    <div class="mapping-alert mapping-alert-info">${escapeHtml(sourceLabel)}</div>
                    <div class="mapping-toolbar">
                        <div class="mapping-toolbar-copy">${escapeHtml(toolbarCopy)}</div>
                        <div class="mapping-toolbar-actions">
                            <button type="button" class="secondary-btn mapping-toolbar-btn" data-qc-action="clear-mappings">Clear selections</button>
                        </div>
                    </div>
                    ${!state.headers.length ? '<div class="mapping-alert mapping-alert-error">No parsed columns are available for this entry set. Go back and add pricing rows.</div>' : ""}
                    <section class="mapping-section">
                        <div class="mapping-section-head">
                            <div>
                                <div class="mapping-section-title">Required mappings</div>
                                <div class="mapping-section-copy">These six fields must be mapped uniquely before analysis can begin.</div>
                            </div>
                        </div>
                        <div class="mapping-grid">
                            ${requiredRows.map((row) => renderMappingRow(row, duplicateColumns)).join("")}
                        </div>
                    </section>
                    <section class="mapping-section">
                        <div class="mapping-section-head">
                            <div>
                                <div class="mapping-section-title">Optional context</div>
                                <div class="mapping-section-copy">Use these only when payment terms, delivery timing, currency, or notes should add context to the sourcing decision.</div>
                            </div>
                        </div>
                        <div class="mapping-grid">
                            ${optionalRows.map((row) => renderMappingRow(row, duplicateColumns)).join("") || '<div class="decision-list-empty">No optional fields were detected for this entry set.</div>'}
                        </div>
                    </section>
                    ${missingText || duplicateText ? `<div class="mapping-alert mapping-alert-error">${escapeHtml(`${missingText} ${duplicateText}`.trim())}</div>` : ""}
                    ${renderStatus(state)}
                    <div class="qc2-actions">
                        <button type="button" id="qcStep2BackBtn" class="secondary-btn" data-qc-action="${state.mode === "manual" ? "back-review" : "back-upload"}">Back</button>
                        <button type="button" id="qcStep2StartBtn" class="action-btn" data-qc-action="start-analysis" ${state.validation.ready && !state.isSubmitting ? "" : "disabled"}>${state.isSubmitting ? "Starting..." : "Start Analysis"}</button>
                    </div>
                </div>
            </section>
        `;
    }

    function renderManualDraftCell(row, index, field) {
        const value = row?.[field.key] ?? "";
        const missingFields = getManualRowMissingFields(row);
        const isInvalid = !isManualDraftRowBlank(row) && missingFields.includes(field.key);
        const attrs = [];
        if (field.min != null) attrs.push(`min="${escapeHtml(field.min)}"`);
        if (field.step != null) attrs.push(`step="${escapeHtml(field.step)}"`);
        return `
            <td class="${field.required ? "is-required" : "is-optional"}">
                <label class="qc2-manual-entry-cell">
                    <span class="qc2-manual-entry-mobile-label">${escapeHtml(field.label)}${field.required ? " *" : ""}</span>
                    <input
                        class="recipe-input qc2-manual-entry-input ${isInvalid ? "is-invalid" : ""}"
                        type="${field.type}"
                        ${attrs.join(" ")}
                        data-manual-field="${field.key}"
                        data-index="${index}"
                        value="${escapeHtml(value)}"
                        aria-label="${escapeHtml(field.label)}"
                        ${isInvalid ? 'aria-invalid="true"' : ""}
                    >
                </label>
            </td>
        `;
    }

    function renderManualDraftRow(row, index) {
        const missingFields = getManualRowMissingFields(row);
        const showInlineFeedback = !isManualDraftRowBlank(row) && missingFields.length > 0;
        return `
            <tr class="${showInlineFeedback ? "is-incomplete" : ""}" data-manual-row="${index}">
                <td class="qc2-manual-entry-row-index">${index + 1}</td>
                ${MANUAL_REBUILD_FIELDS.map((field) => renderManualDraftCell(row, index, field)).join("")}
                <td class="qc2-manual-entry-row-actions">
                    <button type="button" class="secondary-btn qc2-remove-row" data-qc-action="remove-manual-row" data-index="${index}" ${index === 0 ? "disabled" : ""}>Remove</button>
                    <div class="qc2-manual-inline-note" data-qc-manual-row-note ${showInlineFeedback ? "" : "hidden"}>${showInlineFeedback ? `Complete: ${escapeHtml(missingFields.map((fieldKey) => MANUAL_REBUILD_REQUIRED_LABELS[fieldKey]).join(", "))}.` : ""}</div>
                </td>
            </tr>
        `;
    }

    function renderQcManual(state) {
        const stats = getManualDraftStats(state);
        return `
            <section class="qc2-screen qc2-screen-manual">
                <div class="qc2-card qc2-upload-card">
                    <div class="qc2-head qc2-head-compact">
                        <div class="upload-step">Step 1</div>
                        <h2 class="qc2-title">Enter pricing data</h2>
                        <p class="qc2-copy">Enter pricing rows manually using the same fields expected by upload, then continue into the same mapping and analysis workflow.</p>
                    </div>
                    <div class="qc2-upload-panel">
                        <div class="qc2-upload-shell">
                            <div class="qc2-upload-copy-block">
                                <div class="qc2-upload-title">Manual entry</div>
                                <div class="qc2-upload-copy" data-qc-manual-summary>${stats.readyCount} ready rows | ${stats.incompleteCount} incomplete rows</div>
                                <div class="qc2-upload-note">Required fields mirror upload exactly. Optional fields keep delivery, payment, and validity context attached to each row.</div>
                            </div>
                            <div class="qc2-upload-actions">
                                <button type="button" class="secondary-btn" data-qc-action="add-manual-row">Add Row</button>
                            </div>
                        </div>
                    </div>
                    <div class="qc2-manual-entry-shell">
                        <div class="qc2-manual-entry-scroll">
                            <table class="quote-compare-table qc2-manual-entry-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        ${MANUAL_REBUILD_FIELDS.map((field) => renderManualDraftHeaderCell(field)).join("")}
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${state.manualRows.map((row, index) => renderManualDraftRow(row, index)).join("")}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="qc2-manual-entry-legend">
                        <span><strong>Required:</strong> Product Name, Supplier, Unit, Quantity, Unit Price, Date</span>
                        <span><strong>Optional:</strong> Currency, Delivery Time, Payment Terms, Valid Until, Notes</span>
                    </div>
                    ${renderStatus(state)}
                    <div class="qc2-actions qc2-manual-actions">
                        <div class="qc2-manual-actions-group">
                            <button type="button" class="secondary-btn qc2-manual-footer-btn" data-qc-action="back-start">Back</button>
                            <button type="button" class="secondary-btn qc2-manual-footer-btn" data-qc-action="add-manual-row">Add Row</button>
                        </div>
                        <div class="qc2-manual-actions-group qc2-manual-actions-group-end">
                            <button type="button" class="action-btn qc2-manual-footer-btn qc2-manual-footer-btn-primary" data-qc-action="go-manual-review" ${stats.rowCount ? "" : "disabled"}>Review Columns</button>
                        </div>
                    </div>
                </div>
            </section>
        `;
    }

    function getDecisionCardKey(card) {
        return `${card.productName}__${card.unit}__${normalizeQuantityContext(card.quantity)}__${card.currentOffer?.supplier_name || ""}__${card.bestOffer?.supplier_name || ""}`;
    }

    function getScopedDecisionCardKey(scope, baseKey) {
        return `${scope}::${baseKey}`;
    }

    function clearDecisionCardsForScope(collapsedDecisionCards, scope) {
        const prefix = `${scope}::`;
        return Object.fromEntries(
            Object.entries(collapsedDecisionCards || {}).filter(([key]) => !key.startsWith(prefix))
        );
    }

    function toggleDecisionCardState(collapsedDecisionCards, cardKey) {
        const nextDecisionCards = { ...(collapsedDecisionCards || {}) };
        if (nextDecisionCards[cardKey]) {
            delete nextDecisionCards[cardKey];
        } else {
            nextDecisionCards[cardKey] = true;
        }
        return nextDecisionCards;
    }

    function clearFullComparisonDetails(collapsedDecisionCards) {
        return clearDecisionCardsForScope(
            clearDecisionCardsForScope(collapsedDecisionCards, "analysis"),
            "optimize"
        );
    }

    function getFullComparisonTableScroller(elements) {
        return elements.app?.querySelector(".qc2-analysis-table-scroll") || null;
    }

    function rememberFullComparisonTablePosition(elements, state) {
        const tableScroller = getFullComparisonTableScroller(elements);
        if (!tableScroller) return;
        state.fullComparisonTableScroll = {
            top: Number(tableScroller.scrollTop || 0),
            left: Number(tableScroller.scrollLeft || 0)
        };
    }

    function restoreFullComparisonTablePosition(elements, state) {
        const tableScroller = getFullComparisonTableScroller(elements);
        if (!tableScroller || state.currentScreen !== "analyze") return;
        const savedPosition = state.fullComparisonTableScroll || {};
        tableScroller.scrollTop = Number(savedPosition.top || 0);
        tableScroller.scrollLeft = Number(savedPosition.left || 0);
    }

    function setFullComparisonTableActiveState(elements, isActive) {
        elements.app?.querySelector(".qc2-analysis-table-frame")?.classList.toggle("is-active", Boolean(isActive));
    }

    function selectFullComparisonRow(elements, state, cardKey, { persist = true, toggle = false } = {}) {
        const requestedCardKey = String(cardKey || "").trim();
        const nextCardKey = toggle && requestedCardKey === state.selectedAnalysisRowKey
            ? ""
            : requestedCardKey;
        state.selectedAnalysisRowKey = nextCardKey;
        elements.app?.querySelectorAll("[data-qc-analysis-card-key]").forEach((row) => {
            row.classList.toggle("is-selected", row.dataset.qcAnalysisCardKey === nextCardKey);
        });
        if (persist) {
            scheduleQuoteCompareSessionPersist(state, elements);
        }
    }

    function cssEscape(value) {
        if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
            return CSS.escape(String(value || ""));
        }
        return String(value || "").replace(/["\\]/g, "\\$&");
    }

    function setDecisionButtonLabel(button, isExpanded) {
        if (!button) return;
        const cardKey = button.dataset.cardKey || "";
        const scope = getDecisionCardScope(cardKey);
        button.textContent = scope === "spotlight"
            ? (isExpanded ? "Hide table" : "Show table")
            : (isExpanded ? "Close table" : "Open table");
        button.setAttribute("aria-expanded", isExpanded ? "true" : "false");
    }

    function toggleSpotlightCardInPlace(elements, state, cardKey) {
        if (!elements.app || !cardKey) {
            console.info("[PERF] quote_compare.card_detail_render_skipped_reason", {
                cardKey: String(cardKey || ""),
                reason: !elements.app ? "missing_app" : "missing_card_key"
            });
            return false;
        }
        const targetCard = elements.app.querySelector(`[data-qc-card-key="${cssEscape(cardKey)}"]`);
        if (!targetCard) {
            console.info("[PERF] quote_compare.card_detail_render_skipped_reason", {
                cardKey,
                reason: "missing_target_card"
            });
            return false;
        }
        const panelScroll = targetCard.closest(".qc2-spotlight-panel-scroll");
        const anchorTopBefore = panelScroll
            ? targetCard.getBoundingClientRect().top - panelScroll.getBoundingClientRect().top
            : targetCard.getBoundingClientRect().top;
        const panelScrollTopBefore = panelScroll ? panelScroll.scrollTop : 0;
        const pageScrollTopBefore = panelScroll ? 0 : readScrollPosition(elements);
        const nextExpanded = !state.collapsedDecisionCards[cardKey];
        console.info("[PERF] quote_compare.card_detail_toggle", {
            cardKey,
            nextExpanded
        });
        const renderModel = getAnalyzeRenderModel(state);
        const targetCardData = (renderModel.opportunityCards || []).find(
            (card) => getScopedDecisionCardKey("spotlight", getDecisionCardKey(card)) === cardKey
        );
        if (!targetCardData) {
            console.info("[PERF] quote_compare.card_detail_render_skipped_reason", {
                cardKey,
                reason: "missing_card_data"
            });
            return false;
        }
        const spotlightCards = Array.from(elements.app.querySelectorAll("[data-qc-card-key]"));
        spotlightCards.forEach((card) => {
            const isTarget = card.dataset.qcCardKey === cardKey;
            const shouldExpand = nextExpanded && isTarget;
            card.classList.toggle("is-expanded", shouldExpand);
            card.classList.toggle("is-active-card", shouldExpand);
            setDecisionButtonLabel(card.querySelector('[data-qc-action="toggle-decision-card"]'), shouldExpand);
            if (!shouldExpand) {
                card.querySelector(".qc2-spotlight-detail")?.remove();
            }
        });
        if (nextExpanded) {
            if (!targetCard.querySelector(".qc2-spotlight-detail")) {
                targetCard.insertAdjacentHTML("beforeend", renderExpandedSpotlightDetail(targetCardData));
            }
            console.info("[PERF] quote_compare.card_detail_rendered", {
                cardKey,
                rendered: true
            });
        } else {
            console.info("[PERF] quote_compare.card_detail_rendered", {
                cardKey,
                rendered: false
            });
        }
        const anchorTopAfter = panelScroll
            ? targetCard.getBoundingClientRect().top - panelScroll.getBoundingClientRect().top
            : targetCard.getBoundingClientRect().top;
        const anchorDelta = anchorTopAfter - anchorTopBefore;
        if (panelScroll && Math.abs(anchorDelta) > 1) {
            panelScroll.scrollTop = panelScrollTopBefore + anchorDelta;
        } else if (Math.abs(anchorDelta) > 1) {
            writeScrollPosition(elements, pageScrollTopBefore + anchorDelta);
        }
        state.collapsedDecisionCards = clearDecisionCardsForScope(state.collapsedDecisionCards, "spotlight");
        if (nextExpanded) {
            state.collapsedDecisionCards[cardKey] = true;
        }
        persistQuoteCompareSession(state, elements);
        return true;
    }

    function getAnalysisFilterResultValue(card) {
        return getPriceSpreadMetrics(card).hasSavings ? "pricing-opportunities" : "no-immediate-action";
    }

    function normalizeAnalysisTableFilter(filterValue) {
        if (filterValue === "direct-savings" || filterValue === "another-supplier-lower" || filterValue === "same-supplier-lower" || filterValue === "price-variation") {
            return "pricing-opportunities";
        }
        if (filterValue === "lowest-observed") return "no-immediate-action";
        return filterValue || "all";
    }

    function getDecisionCardScope(cardKey) {
        if (typeof cardKey !== "string") return "";
        const separatorIndex = cardKey.indexOf("::");
        return separatorIndex === -1 ? "" : cardKey.slice(0, separatorIndex);
    }

    function getFullTableLowestOffer(card) {
        return card?.lowestObservedOffer || card?.currentOffer || null;
    }

    function getFullTableHighestOffer(card) {
        return card?.highestObservedOffer
            || card?.productSummary?.highestObservedOffer
            || card?.referenceOffer
            || card?.currentOffer
            || null;
    }

    function normalizeUnitPriceForComparison(value) {
        const numericValue = Number(value || 0);
        if (!Number.isFinite(numericValue)) return 0;
        return Math.round((numericValue + Number.EPSILON) * 100) / 100;
    }

    function getPriceSpreadMetrics(card) {
        if (card?.__priceSpreadMetrics) {
            return card.__priceSpreadMetrics;
        }
        const lowestOffer = getFullTableLowestOffer(card);
        const highestOffer = getFullTableHighestOffer(card);
        const normalizedLowestPrice = normalizeUnitPriceForComparison(lowestOffer?.unit_price || 0);
        const normalizedHighestPrice = normalizeUnitPriceForComparison(highestOffer?.unit_price || 0);
        const totalQuantity = Number(card?.totalQuantity || card?.quantity || 0);
        const savingsAmount = Math.max(normalizedHighestPrice - normalizedLowestPrice, 0) * totalQuantity;
        const hasSavings = normalizedHighestPrice > normalizedLowestPrice;
        const metrics = {
            leftOffer: lowestOffer,
            rightOffer: highestOffer,
            leftUnitPrice: normalizedLowestPrice,
            rightUnitPrice: normalizedHighestPrice,
            totalQuantity,
            savingsAmount,
            hasSavings
        };
        if (card && typeof card === "object") {
            card.__priceSpreadMetrics = metrics;
        }
        return metrics;
    }

    function getAnalysisTableViewModel(card) {
        if (card?.__analysisTableViewModel) {
            return card.__analysisTableViewModel;
        }
        const priceSpread = getPriceSpreadMetrics(card);
        const viewModel = {
            leftHeader: "Lowest Supplier",
            leftPriceHeader: "Lowest Price",
            rightHeader: "Highest Supplier",
            rightPriceHeader: "Highest Price",
            savingsHeader: "Savings Opportunity",
            leftOffer: priceSpread.leftOffer,
            rightOffer: priceSpread.rightOffer,
            leftUnitPrice: priceSpread.leftUnitPrice,
            rightUnitPrice: priceSpread.rightUnitPrice,
            totalQuantity: priceSpread.totalQuantity,
            savingsAmount: priceSpread.savingsAmount,
            hasSavings: priceSpread.hasSavings,
            leftMeta: priceSpread.leftOffer?.quote_date ? formatDate(priceSpread.leftOffer.quote_date) : "Best observed context",
            leftPriceMeta: "Lowest unit price",
            rightMeta: priceSpread.rightOffer?.quote_date ? formatDate(priceSpread.rightOffer.quote_date) : "Highest observed context",
            rightPriceMeta: "Highest unit price",
            leftDetailLabel: "Lowest Price",
            rightDetailLabel: "Highest Price",
            resultValue: priceSpread.hasSavings ? "pricing-opportunities" : "no-immediate-action",
            statusLabel: priceSpread.hasSavings ? "Pricing opportunity" : "No immediate action",
            statusTone: priceSpread.hasSavings ? "opportunity" : "neutral",
            resultHelper: priceSpread.hasSavings ? "Savings available" : "No savings",
            resultInsight: priceSpread.hasSavings
                ? `Highest ${formatCurrency(priceSpread.rightUnitPrice)} vs lowest ${formatCurrency(priceSpread.leftUnitPrice)}`
                : "",
            decisionNote: priceSpread.hasSavings
                ? `Price spread opportunity: highest ${formatCurrency(priceSpread.rightUnitPrice)} vs lowest ${formatCurrency(priceSpread.leftUnitPrice)} across qty ${formatQuantity(priceSpread.totalQuantity)}.`
                : "No immediate action after 2-decimal price comparison."
        };
        if (card && typeof card === "object") {
            card.__analysisTableViewModel = viewModel;
        }
        return viewModel;
    }

    function getFullTableSavingsAmount(card) {
        return getAnalysisTableViewModel(card).savingsAmount;
    }

    function buildSpotlightCardFromFullTable(card) {
        const viewModel = getAnalysisTableViewModel(card);
        const highestOffer = viewModel.rightOffer || card?.currentOffer || null;
        const lowestOffer = viewModel.leftOffer || card?.referenceOffer || card?.bestOffer || null;
        const totalQuantity = Number(viewModel.totalQuantity || card?.totalQuantity || card?.quantity || 0);
        const currentTotalBasis = Number(viewModel.rightUnitPrice || 0) * totalQuantity;
        const savingsAmount = Number(viewModel.savingsAmount || 0);
        const savingsPercent = currentTotalBasis > 0
            ? (savingsAmount / currentTotalBasis) * 100
            : 0;
        return {
            ...card,
            __fullTableRecordId: getDecisionCardKey(card),
            __fullTableSavingsAmount: savingsAmount,
            currentOffer: highestOffer,
            currentOfferLabel: viewModel.rightHeader,
            referenceOffer: lowestOffer,
            bestOffer: lowestOffer,
            referenceOfferLabel: viewModel.leftHeader,
            quantity: totalQuantity,
            totalQuantity,
            savingsAmount,
            savingsPercent,
            hasValidAlternative: Boolean(viewModel.hasSavings),
            statusLabel: viewModel.statusLabel,
            statusTone: viewModel.statusTone,
            quantityContextNote: viewModel.resultInsight,
            decisionSentence: viewModel.decisionNote,
            potentialSavingsAmount: 0,
            hasPotentialSavings: false,
            potentialSavingsObservedAtDifferentQuantity: false
        };
    }

    function getFilteredAnalysisCards(state, cards) {
        const activeFilter = normalizeAnalysisTableFilter(state.analysisTableFilter);
        const searchTerm = String(state.analysisTableSearch || "").trim().toLowerCase();
        const activeProductFilter = String(state.activeProductFilter || "").trim().toLowerCase();
        const sourceCards = Array.isArray(cards) ? cards : [];
        const memo = getAnalysisMemo(state);
        const filteredKey = [
            activeFilter,
            searchTerm,
            activeProductFilter,
            state.analysisTableSort?.key || "",
            state.analysisTableSort?.direction || "",
            sourceCards.length
        ].join("|");
        if (memo.cardsRef === sourceCards && memo.filteredKey === filteredKey && Array.isArray(memo.filteredCards)) {
            return memo.filteredCards;
        }
        let filteredCards = [...sourceCards].filter((card) => {
            if (activeProductFilter && String(card.productName || "").trim().toLowerCase() !== activeProductFilter) {
                return false;
            }
            const matchesFilter = activeFilter === "all" || getAnalysisFilterResultValue(card) === activeFilter;
            if (!matchesFilter) return false;
            if (!searchTerm) return true;
            const viewModel = getAnalysisTableViewModel(card);
            const haystack = [
                card.productName,
                getOfferSupplierLabel(viewModel.leftOffer),
                getOfferSupplierLabel(viewModel.rightOffer)
            ].filter(Boolean).join(" ").toLowerCase();
            return haystack.includes(searchTerm);
        });
        if (state.analysisTableSort?.key === "savings") {
            const direction = state.analysisTableSort.direction === "asc" ? 1 : -1;
            filteredCards.sort((left, right) => {
                const delta = getFullTableSavingsAmount(left) - getFullTableSavingsAmount(right);
                if (delta !== 0) return delta * direction;
                return String(left.productName || "").localeCompare(String(right.productName || "")) * direction;
            });
        }
        memo.filteredKey = filteredKey;
        memo.filteredCards = filteredCards;
        return filteredCards;
    }

    function getVisibleAnalysisSummary(state, cards) {
        const sourceCards = Array.isArray(cards) ? cards : getAnalysisDecisionCards(state);
        const filteredCards = getFilteredAnalysisCards(state, sourceCards);
        const memo = getAnalysisMemo(state);
        const summaryKey = [
            normalizeAnalysisTableFilter(state.analysisTableFilter),
            String(state.analysisTableSearch || "").trim().toLowerCase(),
            String(state.activeProductFilter || "").trim().toLowerCase(),
            state.analysisTableSort?.key || "",
            state.analysisTableSort?.direction || "",
            filteredCards.length
        ].join("|");
        if (memo.filteredCards === filteredCards && memo.visibleSummaryKey === summaryKey && memo.visibleSummary) {
            return memo.visibleSummary;
        }

        const productKeys = new Set();
        const supplierKeys = new Set();
        let pricingOpportunityCount = 0;
        let totalPotentialSavings = 0;

        filteredCards.forEach((card) => {
            const viewModel = getAnalysisTableViewModel(card);
            productKeys.add(String(card.productName || "").trim());
            const leftSupplier = getOfferSupplierLabel(viewModel.leftOffer);
            const rightSupplier = getOfferSupplierLabel(viewModel.rightOffer);
            if (leftSupplier) supplierKeys.add(getSupplierKey(leftSupplier));
            if (rightSupplier) supplierKeys.add(getSupplierKey(rightSupplier));
            if (viewModel.hasSavings) {
                pricingOpportunityCount += 1;
                totalPotentialSavings += Number(viewModel.savingsAmount || 0);
            }
        });

        memo.visibleSummaryKey = summaryKey;
        memo.visibleSummary = {
            productCount: productKeys.size,
            supplierCount: supplierKeys.size,
            pricingOpportunityCount,
            totalPotentialSavings,
            filteredCards
        };
        return memo.visibleSummary;
    }

    function getVisibleTopSavingsSummary(state, cards, { sectionVisible = true } = {}) {
        const sourceCards = Array.isArray(cards) ? cards : [];
        const visibleCards = sectionVisible
            ? sourceCards.slice(0, Math.max(state.opportunityRenderCount || OPPORTUNITY_CARD_BATCH_SIZE, OPPORTUNITY_CARD_BATCH_SIZE))
            : [];
        const memo = getAnalysisMemo(state);
        const summaryKey = [
            sectionVisible ? "visible" : "hidden",
            visibleCards.length,
            state.opportunityRenderCount || OPPORTUNITY_CARD_BATCH_SIZE
        ].join("|");
        if (memo.topSavingsSummaryKey === summaryKey && memo.topSavingsSummary) {
            return memo.topSavingsSummary;
        }

        const productKeys = new Set();
        const supplierKeys = new Set();
        let pricingOpportunityCount = 0;
        let totalPotentialSavings = 0;

        visibleCards.forEach((card) => {
            productKeys.add(String(card.productName || "").trim());
            const currentSupplier = getOfferSupplierLabel(card.currentOffer);
            const bestSupplier = getOfferSupplierLabel(card.bestOffer || card.referenceOffer);
            if (currentSupplier) supplierKeys.add(getSupplierKey(currentSupplier));
            if (bestSupplier) supplierKeys.add(getSupplierKey(bestSupplier));
            if (Number(card.savingsAmount || 0) > 0) {
                pricingOpportunityCount += 1;
                totalPotentialSavings += Number(card.savingsAmount || 0);
            }
        });

        memo.topSavingsSummaryKey = summaryKey;
        memo.topSavingsSummary = {
            productCount: productKeys.size,
            supplierCount: supplierKeys.size,
            pricingOpportunityCount,
            totalPotentialSavings,
            visibleCards
        };
        return memo.topSavingsSummary;
    }

    function getAnalysisRowApproxHeight(card, state) {
        const cardKey = getScopedDecisionCardKey("analysis", getDecisionCardKey(card));
        return state.collapsedDecisionCards?.[cardKey] ? ANALYSIS_ROW_EXPANDED_HEIGHT : ANALYSIS_ROW_HEIGHT;
    }

    function getAnalysisVirtualSlice(cards, state) {
        const sourceCards = Array.isArray(cards) ? cards : [];
        if (sourceCards.length <= 60) {
            return { visibleCards: sourceCards, topSpacer: 0, bottomSpacer: 0 };
        }
        const viewport = state.analysisViewport || { start: 0, end: 80 };
        const start = Math.max(0, Math.min(viewport.start || 0, sourceCards.length));
        const end = Math.max(start, Math.min(viewport.end || sourceCards.length, sourceCards.length));
        const topSpacer = sourceCards.slice(0, start).reduce((sum, card) => sum + getAnalysisRowApproxHeight(card, state), 0);
        const bottomSpacer = sourceCards.slice(end).reduce((sum, card) => sum + getAnalysisRowApproxHeight(card, state), 0);
        return {
            visibleCards: sourceCards.slice(start, end),
            topSpacer,
            bottomSpacer
        };
    }

    function renderAnalysisFilterBar(state, cards) {
        const counts = cards.reduce((summary, card) => {
            const resultKey = getAnalysisFilterResultValue(card);
            summary.all += 1;
            summary[resultKey] += 1;
            return summary;
        }, {
            all: 0,
            "pricing-opportunities": 0,
            "no-immediate-action": 0
        });
        const activeFilter = normalizeAnalysisTableFilter(state.analysisTableFilter);
        const filters = [
            { value: "all", label: "All results" },
            { value: "pricing-opportunities", label: "Pricing opportunities" },
            { value: "no-immediate-action", label: "No immediate action" }
        ];
        const activeProductFilter = String(state.activeProductFilter || "").trim();
        return `
            <div class="qc2-analysis-filterbar" data-qc-analysis-filterbar>
                ${activeProductFilter ? `
                    <div class="qc2-analysis-filter-scope">
                        Filtered by: ${escapeHtml(activeProductFilter)}
                    </div>
                ` : ""}
                <div class="qc2-analysis-filterbar-actions">
                    ${filters.map((filter) => `
                        <button
                            type="button"
                            class="secondary-btn qc2-analysis-filter-btn ${activeFilter === filter.value ? "is-active" : ""}"
                            data-qc-action="set-analysis-filter"
                            data-filter-value="${escapeHtml(filter.value)}"
                            aria-pressed="${activeFilter === filter.value ? "true" : "false"}"
                        >
                            ${escapeHtml(filter.label)} <span class="qc2-analysis-filter-count">${counts[filter.value]}</span>
                        </button>
                    `).join("")}
                </div>
                <div class="search-input-shell qc2-analysis-search-shell" role="search" aria-label="Search products or suppliers">
                    <input
                        type="text"
                        class="search-input qc2-analysis-search-input"
                        data-qc-analysis-search
                        value="${escapeHtml(state.analysisTableSearch || "")}"
                        placeholder="Search product or supplier"
                        autocomplete="off"
                    >
                    <button type="button" class="secondary-btn qc2-analysis-search-clear" data-qc-action="clear-analysis-search" ${state.analysisTableSearch ? "" : "hidden"} aria-label="Clear search">X</button>
                    <button type="button" class="action-btn qc2-analysis-search-button" tabindex="-1" aria-hidden="true">Search</button>
                </div>
            </div>
        `;
    }

    function getOpportunityCardTheme(index) {
        return OPPORTUNITY_CARD_PALETTE[index % OPPORTUNITY_CARD_PALETTE.length];
    }

    function getTopPricingOpportunityCards(cards, state = null) {
        const sourceCards = Array.isArray(cards) ? cards : [];
        const memo = state ? getAnalysisMemo(state) : null;
        if (memo && memo.cardsRef === sourceCards && Array.isArray(memo.topOpportunityCards)) {
            return memo.topOpportunityCards;
        }
        const groupedCards = new Map();
        sourceCards.forEach((card) => {
            const normalizedGroupKey = getNormalizedProductUnitKey(card.productName, card.unit);
            if (!normalizedGroupKey) {
                return;
            }
            if (!groupedCards.has(normalizedGroupKey)) {
                groupedCards.set(normalizedGroupKey, []);
            }
            groupedCards.get(normalizedGroupKey).push(card);
        });

        const spotlightCandidates = Array.from(groupedCards.values()).map((groupCards) => {
            const allOffers = groupCards.flatMap((card) => (
                Array.isArray(card?.productSummary?.offers) && card.productSummary.offers.length
                    ? card.productSummary.offers
                    : []
            ));
            const offersByRecency = [...allOffers].sort(compareOffersByRecency);
            const latestOffer = offersByRecency[0] || groupCards.slice().sort((left, right) => compareOffersByRecency(left.currentOffer || {}, right.currentOffer || {}))[0]?.currentOffer || null;
            const lowestOffer = [...allOffers].sort(compareOffersByUnitPrice)[0] || null;
            const displayProductName = latestOffer?.product_name || groupCards[0]?.productName || "";
            const displayUnit = latestOffer?.unit || groupCards[0]?.unit || "";
            const totalQuantity = allOffers.reduce((sum, offer) => sum + Number(offer?.quantity || 0), 0);
            const latestUnitPrice = Number(latestOffer?.unit_price || 0);
            const lowestUnitPrice = Number(lowestOffer?.unit_price || 0);
            const savingsAmount = (latestUnitPrice - lowestUnitPrice) * totalQuantity;
            const currentTotalBasis = latestUnitPrice * totalQuantity;
            const savingsPercent = currentTotalBasis > 0 ? (savingsAmount / currentTotalBasis) * 100 : 0;
            const productSummary = buildProductSummaryStats(allOffers, displayProductName, displayUnit, offersByRecency);
            const representativeCard = groupCards.slice().sort((left, right) => compareOffersByRecency(left.currentOffer || {}, right.currentOffer || {}))[0] || groupCards[0] || {};
            const hasValidAlternative = savingsAmount > 0;

            return {
                ...representativeCard,
                productName: displayProductName,
                unit: displayUnit,
                quantity: totalQuantity,
                totalQuantity,
                quoteDate: latestOffer?.quote_date || representativeCard?.quoteDate || "",
                currency: latestOffer?.currency || lowestOffer?.currency || representativeCard?.currency || "USD",
                currentOffer: latestOffer,
                currentOfferLabel: "Latest price",
                referenceOffer: lowestOffer,
                bestOffer: lowestOffer,
                referenceOfferLabel: "Lowest observed price",
                productSummary,
                offers: offersByRecency,
                lowestObservedOffer: lowestOffer,
                highestObservedOffer: productSummary.highestObservedOffer || null,
                savingsAmount,
                savingsPercent,
                hasValidAlternative,
                statusLabel: hasValidAlternative ? "Pricing opportunity" : "No immediate action",
                statusTone: hasValidAlternative ? "opportunity" : "neutral",
                quantityContextNote: `Latest ${formatCurrency(latestUnitPrice, latestOffer?.currency || representativeCard?.currency || "USD")} vs lowest ${formatCurrency(lowestUnitPrice, lowestOffer?.currency || representativeCard?.currency || "USD")} across qty ${formatQuantity(totalQuantity)}.`,
                decisionSentence: hasValidAlternative
                    ? `Latest unit price is ${formatCurrency(latestUnitPrice, latestOffer?.currency || representativeCard?.currency || "USD")} and the lowest observed unit price is ${formatCurrency(lowestUnitPrice, lowestOffer?.currency || representativeCard?.currency || "USD")}. Applying that gap across the full observed quantity of ${formatQuantity(totalQuantity)} yields ${formatCurrency(savingsAmount, latestOffer?.currency || representativeCard?.currency || "USD")} in product-level savings potential.`
                    : `Latest unit price already matches the lowest observed unit price for this product history, so there is no product-level savings gap at the observed quantity.`,
                potentialSavingsAmount: 0,
                hasPotentialSavings: false,
                potentialSavingsObservedAtDifferentQuantity: false
            };
        });

        const getSavingsSortValue = (card) => Number(card?.savingsAmount || 0);
        const rankedCandidates = [...spotlightCandidates]
            .sort((left, right) => {
                const savingsDelta = getSavingsSortValue(right) - getSavingsSortValue(left);
                if (savingsDelta !== 0) return savingsDelta;
                return String(left.productName || "").localeCompare(String(right.productName || ""));
            });
        const opportunityCards = rankedCandidates.slice(0, 10);
        console.info("[PERF] quote_compare.top_savings.selection_mode", {
            mode: "product_level_group_top_10_savings_desc"
        });
        console.info("[PERF] quote_compare.top_savings.total_candidates", {
            directSavingsCandidates: spotlightCandidates.filter((card) => Number(card.savingsAmount || 0) > 0).length,
            meaningfulCandidates: spotlightCandidates.length,
            totalCards: sourceCards.length
        });
        console.info("[PERF] quote_compare.top_savings.threshold_applied", {
            applied: false,
            threshold: 0
        });
        console.info("[PERF] quote_compare.top_savings.fallback_used", {
            used: false,
            renderedFromFallbackOnly: false
        });
        console.info("[PERF] quote_compare.top_savings.rendered_count", {
            count: opportunityCards.length
        });
        console.info("[PERF] quote_compare.top_cards.source_count", {
            sourceCount: sourceCards.length,
            candidateCount: spotlightCandidates.length
        });
        console.info("[PERF] quote_compare.top_cards.source_matches_full_table", {
            value: false
        });
        console.info("[PERF] quote_compare.top_cards.max_candidate_value", {
            value: rankedCandidates.length ? Math.max(...rankedCandidates.map((card) => getSavingsSortValue(card))) : 0
        });
        console.info("[PERF] quote_compare.top_cards.top_5_values", {
            values: rankedCandidates.slice(0, 5).map((card) => getSavingsSortValue(card))
        });
        console.info("[PERF] quote_compare.top_cards.card_top_5_values", {
            values: rankedCandidates.slice(0, 5).map((card) => getSavingsSortValue(card))
        });
        console.info("[PERF] quote_compare.top_cards.same_model_as_full_table", {
            value: false
        });
        console.info("[PERF] quote_compare.top_cards.same_value_as_full_table", {
            value: false
        });
        console.info("[PERF] quote_compare.top_cards.record_id_match", {
            value: false
        });
        const renderedSavingsValues = opportunityCards.map((card) => getSavingsSortValue(card));
        console.info("[PERF] quote_compare.top_savings.max_value", {
            value: renderedSavingsValues.length ? Math.max(...renderedSavingsValues) : 0
        });
        console.info("[PERF] quote_compare.top_savings.min_value", {
            value: renderedSavingsValues.length ? Math.min(...renderedSavingsValues) : 0
        });
        console.info("[PERF] quote_compare.top_savings.sorted_correctly", {
            value: renderedSavingsValues.every((value, index) => index === 0 || renderedSavingsValues[index - 1] >= value)
        });
        if (memo && memo.cardsRef === sourceCards) {
            memo.topOpportunityCards = opportunityCards;
        }
        return opportunityCards;
    }

    function getSpotlightBadgeLabel(card) {
        if (card.hasValidAlternative && card.savingsAmount > 0) return "Direct savings";
        if (card.decisionType === "lower-historical-price-with-current-supplier") return "Current supplier history";
        if (card.decisionType === "lower-price-with-another-supplier") return "Another supplier lower";
        if (card.observedAtDifferentQuantity) return "Different quantity";
        return "Price insight";
    }

    function ensureDecisionCardExpandedMetrics(card) {
        if (!card) return card;
        if (!Array.isArray(card.monthlyInsights)) {
            card.monthlyInsights = buildMonthlyAnalysisRows(card.productSummary?.offers || card.offers || [], card.currentOffer);
        }
        if (!card.overallAnalysis) {
            const productOffers = card.productSummary?.offers || [];
            const earliestOffer = productOffers.length
                ? productOffers[productOffers.length - 1]
                : null;
            const currentUnitPrice = Number(card.currentOffer?.unit_price || 0);
            const quantityBasis = Number(card.currentOffer?.quantity || 0);
            card.overallAnalysis = {
                firstDate: formatDate(earliestOffer?.quote_date),
                latestDate: formatDate(card.currentOffer?.quote_date),
                firstUnitPrice: Number(earliestOffer?.unit_price || 0),
                latestUnitPrice: currentUnitPrice,
                minUnitPrice: Number(card.lowestObservedOffer?.unit_price || 0),
                maxUnitPrice: Number(card.productSummary?.highestObservedOffer?.unit_price || 0),
                trendSavingsAmount: earliestOffer && Number(earliestOffer.unit_price || 0) > currentUnitPrice
                    ? Math.max((Number(earliestOffer.unit_price || 0) - currentUnitPrice) * quantityBasis, 0)
                    : 0
            };
        }
        return card;
    }

    function renderExpandedAnalysisRowDetail(card, viewModel) {
        ensureDecisionCardExpandedMetrics(card);
        const leftDisplayOffer = viewModel.leftOffer;
        const rightDisplayOffer = viewModel.rightOffer;
        const leftDisplayUnitPrice = viewModel.leftUnitPrice;
        const rightDisplayUnitPrice = viewModel.rightUnitPrice;
        return `
            <div class="qc2-analysis-row-detail qc2-ft-detail-panel">
                <div class="qc2-analysis-detail-grid qc2-ft-detail-grid">
                    <div class="qc2-analysis-detail-item qc2-ft-detail-card">
                        <span class="qc2-analysis-detail-label">Overall trend</span>
                        <span class="qc2-analysis-detail-value">${escapeHtml(card.overallAnalysis?.firstDate || "--")} -> ${escapeHtml(card.overallAnalysis?.latestDate || "--")} | ${escapeHtml(formatCurrency(card.overallAnalysis?.firstUnitPrice || 0, card.currency))} -> ${escapeHtml(formatCurrency(card.overallAnalysis?.latestUnitPrice || 0, card.currency))}</span>
                    </div>
                    <div class="qc2-analysis-detail-item qc2-ft-detail-card">
                        <span class="qc2-analysis-detail-label">${escapeHtml(viewModel.leftDetailLabel)}</span>
                        <span class="qc2-analysis-detail-value">${escapeHtml(getOfferSupplierLabel(leftDisplayOffer) || "Supplier missing")} | ${escapeHtml(formatCurrency(leftDisplayUnitPrice, card.currency))} unit</span>
                    </div>
                    <div class="qc2-analysis-detail-item qc2-ft-detail-card">
                        <span class="qc2-analysis-detail-label">${escapeHtml(viewModel.rightDetailLabel)}</span>
                        <span class="qc2-analysis-detail-value">${escapeHtml(getOfferSupplierLabel(rightDisplayOffer) || "Supplier missing")} | ${escapeHtml(formatCurrency(rightDisplayUnitPrice, card.currency))} unit</span>
                    </div>
                    <div class="qc2-analysis-detail-item qc2-ft-detail-card">
                        <span class="qc2-analysis-detail-label">Commercial Terms</span>
                        <span class="qc2-analysis-detail-value">${escapeHtml(card.referenceOffer?.currency || card.currency || "USD")} | ${escapeHtml(card.referenceOffer?.delivery_time || "Delivery not provided")} | ${escapeHtml(card.referenceOffer?.payment_term || "Payment terms not provided")}</span>
                    </div>
                    <div class="qc2-analysis-detail-item qc2-ft-detail-card">
                        <span class="qc2-analysis-detail-label">Monthly analysis</span>
                        <span class="qc2-analysis-detail-value">${escapeHtml((card.monthlyInsights || []).slice(0, 4).map((entry) => `${entry.label}: avg ${formatCurrency(entry.avgPrice, card.currency)}`).join(" | ") || "No monthly history available")}</span>
                    </div>
                </div>
                ${(card.currentOffer?.notes || card.referenceOffer?.notes) ? `<div class="qc2-analysis-detail-note qc2-analysis-detail-note-secondary qc2-ft-detail-note">${escapeHtml(card.currentOffer?.notes || card.referenceOffer?.notes)}</div>` : ""}
                <div class="qc2-analysis-detail-note qc2-ft-detail-insight">${escapeHtml(viewModel.decisionNote)}</div>
            </div>
        `;
    }

    function renderExpandedSpotlightDetail(card) {
        return `
            <div class="qc2-spotlight-detail">
                <div class="qc2-spotlight-detail-shell">
                    <div class="qc2-spotlight-detail-grid">
                        <section class="qc2-spotlight-detail-group" aria-label="Current price detail">
                            <div class="qc2-spotlight-detail-group-title">Current Price</div>
                            <div class="qc2-spotlight-detail-table">
                                <div class="qc2-spotlight-detail-row">
                                    <span class="qc2-spotlight-detail-label">Supplier</span>
                                    <span class="qc2-spotlight-detail-value">${escapeHtml(card.currentOffer?.supplier_name || "Supplier missing")}</span>
                                </div>
                                <div class="qc2-spotlight-detail-row">
                                    <span class="qc2-spotlight-detail-label">Unit price</span>
                                    <span class="qc2-spotlight-detail-value">${escapeHtml(formatCurrency(card.currentOffer?.unit_price || 0, card.currency))}</span>
                                </div>
                                <div class="qc2-spotlight-detail-row">
                                    <span class="qc2-spotlight-detail-label">Price date</span>
                                    <span class="qc2-spotlight-detail-value">${escapeHtml(formatDate(card.quoteDate))}</span>
                                </div>
                            </div>
                        </section>
                        <section class="qc2-spotlight-detail-group is-highlighted" aria-label="Reference price detail">
                            <div class="qc2-spotlight-detail-group-title">Reference Price</div>
                            <div class="qc2-spotlight-detail-table">
                                <div class="qc2-spotlight-detail-row">
                                    <span class="qc2-spotlight-detail-label">Supplier</span>
                                    <span class="qc2-spotlight-detail-value">${escapeHtml(card.referenceOffer?.supplier_name || "Supplier missing")}</span>
                                </div>
                                <div class="qc2-spotlight-detail-row">
                                    <span class="qc2-spotlight-detail-label">Unit price</span>
                                    <span class="qc2-spotlight-detail-value">${escapeHtml(formatCurrency(card.referenceOffer?.unit_price || 0, card.currency))}</span>
                                </div>
                                <div class="qc2-spotlight-detail-row">
                                    <span class="qc2-spotlight-detail-label">Price date</span>
                                    <span class="qc2-spotlight-detail-value">${escapeHtml(formatDate(card.referenceOffer?.quote_date || card.quoteDate))}</span>
                                </div>
                            </div>
                        </section>
                        <section class="qc2-spotlight-detail-group qc2-spotlight-detail-group-snapshot" aria-label="Opportunity detail">
                            <div class="qc2-spotlight-detail-group-title">Opportunity Snapshot</div>
                            <div class="qc2-spotlight-detail-table">
                                <div class="qc2-spotlight-detail-row">
                                    <span class="qc2-spotlight-detail-label">Opportunity type</span>
                                    <span class="qc2-spotlight-detail-value">${escapeHtml(card.statusLabel)}</span>
                                </div>
                                <div class="qc2-spotlight-detail-row">
                                    <span class="qc2-spotlight-detail-label">Current vs reference</span>
                                    <span class="qc2-spotlight-detail-value">${escapeHtml(formatCurrency(card.currentOffer?.unit_price || 0, card.currency))} vs ${escapeHtml(formatCurrency(card.referenceOffer?.unit_price || 0, card.currency))}</span>
                                </div>
                                <div class="qc2-spotlight-detail-row">
                                    <span class="qc2-spotlight-detail-label">Context</span>
                                    <span class="qc2-spotlight-detail-value">${escapeHtml(card.quantityContextNote || "Observed context available")}</span>
                                </div>
                            </div>
                        </section>
                        <section class="qc2-spotlight-detail-group qc2-spotlight-detail-group-notes" aria-label="Decision guidance detail">
                            <div class="qc2-spotlight-detail-group-title">Decision Guidance</div>
                            <div class="qc2-spotlight-detail-note">${escapeHtml(card.decisionSentence)}</div>
                        </section>
                    </div>
                </div>
            </div>
        `;
    }

    function renderDecisionSpotlightCardsLegacy(cards, state) {
        if (!cards.length) {
            return '<div class="decision-list-empty">No savings opportunities are visible in the current pricing set.</div>';
        }
        return `
            <div class="qc2-spotlight-panel">
                <div class="qc2-spotlight-panel-scroll">
                    <div class="qc2-spotlight-grid">
                ${cards.map((card, index) => {
                    const theme = getOpportunityCardTheme(index);
                    const cardKey = getScopedDecisionCardKey("spotlight", getDecisionCardKey(card));
                    const isExpanded = Boolean(state.collapsedDecisionCards[cardKey]);
                    return `
                        <article
                            class="qc2-spotlight-card ${isExpanded ? "is-expanded" : ""}"
                            data-qc-card-key="${escapeHtml(cardKey)}"
                            style="
                                --qc2-card-border:${theme.border};
                                --qc2-card-glow:${theme.glow};
                                --qc2-card-badge-bg:${theme.badgeBg};
                                --qc2-card-badge-text:${theme.badgeText};
                                --qc2-card-lane-border:${theme.laneBorder};
                                --qc2-card-best-border:${theme.laneBestBorder};
                                --qc2-card-decision-bg:${theme.decisionBg};
                                --qc2-card-decision-border:${theme.decisionBorder};
                                --qc2-card-savings-text:${theme.savingsText};
                            "
                        >
                            <div class="qc2-spotlight-card-head">
                                <div>
                                    <div class="qc2-spotlight-title">${escapeHtml(card.productName)}</div>
                                    <div class="qc2-spotlight-meta">${escapeHtml(card.unit || "Unit not provided")} | Qty ${escapeHtml(formatQuantity(card.quantity || 0))}</div>
                                </div>
                                <span class="qc2-spotlight-badge">Top savings</span>
                            </div>
                            <div class="qc2-spotlight-compare">
                                <div class="qc2-spotlight-lane is-current">
                                    <div class="qc2-spotlight-label">Current supplier</div>
                                    <div class="qc2-spotlight-supplier">${escapeHtml(card.currentOffer?.supplier_name || "Supplier missing")}</div>
                                    <div class="qc2-spotlight-value">${escapeHtml(formatCurrency(card.currentOffer?.total_price || 0, card.currency))}</div>
                                </div>
                                <div class="qc2-spotlight-arrow">→</div>
                                <div class="qc2-spotlight-lane is-best">
                                    <div class="qc2-spotlight-label">Recommended supplier</div>
                                    <div class="qc2-spotlight-supplier">${escapeHtml(card.bestOffer?.supplier_name || "Supplier missing")}</div>
                                    <div class="qc2-spotlight-value">${escapeHtml(formatCurrency(card.bestOffer?.total_price || 0, card.currency))}</div>
                                </div>
                            </div>
                            <div class="qc2-spotlight-savings-row">
                                <div>
                                    <div class="qc2-spotlight-savings-value">${escapeHtml(formatCurrency(card.savingsAmount, card.currency))}</div>
                                    <div class="qc2-spotlight-savings-copy">${card.hasValidAlternative ? `${escapeHtml(formatPercent(card.savingsPercent))} lower unit price` : "Insight only"}</div>
                                </div>
                                <div class="qc2-spotlight-actions">
                                    <button type="button" class="secondary-btn qc2-collapse-btn" data-qc-action="open-product-summary" data-product-name="${escapeHtml(card.productName)}" data-product-unit="${escapeHtml(card.unit || "")}">
                                        Price summary
                                    </button>
                                    <button type="button" class="secondary-btn qc2-collapse-btn" data-qc-action="toggle-decision-card" data-card-key="${escapeHtml(cardKey)}" aria-expanded="${isExpanded ? "true" : "false"}">
                                        ${isExpanded ? "Hide table" : "Show table"}
                                    </button>
                                </div>
                            </div>
                            <div class="qc2-spotlight-decision ${card.statusTone === "neutral" ? "is-neutral" : ""}">${escapeHtml(card.decisionSentence)}</div>
                            <div class="qc2-spotlight-detail">
                                <div class="qc2-spotlight-detail-shell">
                                    <div class="qc2-spotlight-detail-grid">
                                        <section class="qc2-spotlight-detail-group" aria-label="Current price detail">
                                            <div class="qc2-spotlight-detail-group-title">Current Price</div>
                                            <div class="qc2-spotlight-detail-table">
                                                <div class="qc2-spotlight-detail-row">
                                                    <span class="qc2-spotlight-detail-label">Supplier</span>
                                                    <span class="qc2-spotlight-detail-value">${escapeHtml(card.currentOffer?.supplier_name || "Supplier missing")}</span>
                                                </div>
                                                <div class="qc2-spotlight-detail-row">
                                                    <span class="qc2-spotlight-detail-label">Unit price</span>
                                                    <span class="qc2-spotlight-detail-value">${escapeHtml(formatCurrency(card.currentOffer?.unit_price || 0, card.currency))}</span>
                                                </div>
                                                <div class="qc2-spotlight-detail-row">
                                                    <span class="qc2-spotlight-detail-label">Price date</span>
                                                    <span class="qc2-spotlight-detail-value">${escapeHtml(formatDate(card.quoteDate))}</span>
                                                </div>
                                            </div>
                                        </section>
                                        <section class="qc2-spotlight-detail-group is-highlighted" aria-label="Recommended price detail">
                                            <div class="qc2-spotlight-detail-group-title">Recommended Price</div>
                                            <div class="qc2-spotlight-detail-table">
                                                <div class="qc2-spotlight-detail-row">
                                                    <span class="qc2-spotlight-detail-label">Supplier</span>
                                                    <span class="qc2-spotlight-detail-value">${escapeHtml(card.bestOffer?.supplier_name || "Supplier missing")}</span>
                                                </div>
                                                <div class="qc2-spotlight-detail-row">
                                                    <span class="qc2-spotlight-detail-label">Unit price</span>
                                                    <span class="qc2-spotlight-detail-value">${escapeHtml(formatCurrency(card.bestOffer?.unit_price || 0, card.currency))}</span>
                                                </div>
                                                <div class="qc2-spotlight-detail-row">
                                                    <span class="qc2-spotlight-detail-label">Price date</span>
                                                    <span class="qc2-spotlight-detail-value">${escapeHtml(formatDate(card.bestOffer?.quote_date || card.quoteDate))}</span>
                                                </div>
                                            </div>
                                        </section>
                                        <section class="qc2-spotlight-detail-group" aria-label="Savings and impact detail">
                                            <div class="qc2-spotlight-detail-group-title">Savings / Impact</div>
                                            <div class="qc2-spotlight-detail-table">
                                                <div class="qc2-spotlight-detail-row">
                                                    <span class="qc2-spotlight-detail-label">Total savings</span>
                                                    <span class="qc2-spotlight-detail-value">${escapeHtml(formatCurrency(card.savingsAmount, card.currency))}</span>
                                                </div>
                                                <div class="qc2-spotlight-detail-row">
                                                    <span class="qc2-spotlight-detail-label">Variance</span>
                                                    <span class="qc2-spotlight-detail-value">${escapeHtml(formatPercent(card.savingsPercent))} lower unit price</span>
                                                </div>
                                                <div class="qc2-spotlight-detail-row">
                                                    <span class="qc2-spotlight-detail-label">Quantity</span>
                                                    <span class="qc2-spotlight-detail-value">${escapeHtml(formatQuantity(card.quantity || 0))} ${escapeHtml(card.unit || "")}</span>
                                                </div>
                                            </div>
                                        </section>
                                        <section class="qc2-spotlight-detail-group qc2-spotlight-detail-group-notes" aria-label="Decision guidance detail">
                                            <div class="qc2-spotlight-detail-group-title">Decision Guidance</div>
                                            <div class="qc2-spotlight-detail-note">${escapeHtml(card.decisionSentence)}</div>
                                        </section>
                                    </div>
                                </div>
                            </div>
                        </article>
                    `;
                }).join("")}
                    </div>
                </div>
            </div>
        `;
    }

    function renderDecisionSpotlightCards(cards, state) {
        const renderStartedAt = performance.now();
        if (!cards.length) {
            return '<div class="decision-list-empty">No immediate pricing opportunities found. Review full table for detailed price insights.</div>';
        }
        const visibleCards = cards.slice(0, Math.max(state.opportunityRenderCount || OPPORTUNITY_CARD_BATCH_SIZE, OPPORTUNITY_CARD_BATCH_SIZE));
        const hasMoreCards = visibleCards.length < cards.length;
        const memo = getAnalysisMemo(state);
        const spotlightMarkupKey = [
            visibleCards.length,
            cards.length,
            state.opportunityRenderCount || OPPORTUNITY_CARD_BATCH_SIZE,
            state.spotlightTableFilterKey || "",
            visibleCards.map((card) => getDecisionCardKey(card)).join("|")
        ].join("::");
        if (memo.cardsRef === cards && memo.spotlightMarkupKey === spotlightMarkupKey && memo.spotlightMarkup) {
            return memo.spotlightMarkup;
        }
        const markup = `
            <div class="qc2-spotlight-panel">
                <div class="qc2-spotlight-panel-scroll">
                    <div class="qc2-spotlight-grid">
                ${visibleCards.map((card, index) => {
                    const theme = getOpportunityCardTheme(index);
                    const cardKey = getScopedDecisionCardKey("spotlight", getDecisionCardKey(card));
                    const isExpanded = String(state.spotlightTableFilterKey || "") === getNormalizedProductUnitKey(card.productName, card.unit)
                        || String(state.activeProductFilter || "").trim().toLowerCase() === String(card.productName || "").trim().toLowerCase();
                    const badgeLabel = getSpotlightBadgeLabel(card);
                    return `
                        <article
                            class="qc2-spotlight-card ${isExpanded ? "is-active-card" : ""}"
                            data-qc-card-key="${escapeHtml(cardKey)}"
                            style="
                                --qc2-card-border:${theme.border};
                                --qc2-card-glow:${theme.glow};
                                --qc2-card-badge-bg:${theme.badgeBg};
                                --qc2-card-badge-text:${theme.badgeText};
                                --qc2-card-lane-border:${theme.laneBorder};
                                --qc2-card-best-border:${theme.laneBestBorder};
                                --qc2-card-decision-bg:${theme.decisionBg};
                                --qc2-card-decision-border:${theme.decisionBorder};
                                --qc2-card-savings-text:${theme.savingsText};
                            "
                        >
                            <div class="qc2-spotlight-card-head">
                                <div>
                                    <div class="qc2-spotlight-title">${escapeHtml(card.productName)}</div>
                                    <div class="qc2-spotlight-meta">${escapeHtml(card.statusLabel)} | ${escapeHtml(card.unit || "Unit not provided")} | Qty ${escapeHtml(formatQuantity(card.quantity || 0))}</div>
                                </div>
                                <span class="qc2-spotlight-badge">${escapeHtml(badgeLabel)}</span>
                            </div>
                            <div class="qc2-spotlight-compare">
                                <div class="qc2-spotlight-lane is-current">
                                    <div class="qc2-spotlight-label">Current unit price</div>
                                    <div class="qc2-spotlight-supplier">${escapeHtml(card.currentOffer?.supplier_name || "Supplier missing")}</div>
                                    <div class="qc2-spotlight-value">${escapeHtml(formatCurrency(card.currentOffer?.unit_price || 0, card.currency))}</div>
                                    <div class="qc2-spotlight-meta">${escapeHtml(formatDate(card.quoteDate))} | Qty ${escapeHtml(formatQuantity(card.currentOffer?.quantity || card.quantity || 0))}</div>
                                </div>
                                <div class="qc2-spotlight-arrow">-&gt;</div>
                                <div class="qc2-spotlight-lane is-best">
                                    <div class="qc2-spotlight-label">${escapeHtml(card.referenceOfferLabel || "Reference price")}</div>
                                    <div class="qc2-spotlight-supplier">${escapeHtml(card.referenceOffer?.supplier_name || "Supplier missing")}</div>
                                    <div class="qc2-spotlight-value">${escapeHtml(formatCurrency(card.referenceOffer?.unit_price || 0, card.currency))}</div>
                                    <div class="qc2-spotlight-meta">${escapeHtml(formatDate(card.referenceOffer?.quote_date || card.quoteDate))} | Qty ${escapeHtml(formatQuantity(card.referenceOffer?.quantity || 0))}</div>
                                </div>
                            </div>
                            <div class="qc2-spotlight-savings-row">
                                <div>
                                    <div class="qc2-spotlight-savings-value">${card.hasValidAlternative ? escapeHtml(formatCurrency(card.savingsAmount, card.currency)) : escapeHtml(formatCurrency(card.referenceOffer?.unit_price || 0, card.currency))}</div>
                                    <div class="qc2-spotlight-savings-copy">${card.hasValidAlternative ? `${escapeHtml(formatPercent(card.savingsPercent))} direct savings` : escapeHtml(card.quantityContextNote || "Insight only")}</div>
                                    ${card.hasPotentialSavings ? `
                                        <div class="qc2-spotlight-potential">
                                            <span class="qc2-spotlight-potential-label">Potential savings</span>
                                            <span class="qc2-spotlight-potential-value">${escapeHtml(formatCurrency(card.potentialSavingsAmount, card.currency))}</span>
                                        </div>
                                        ${card.potentialSavingsObservedAtDifferentQuantity ? '<div class="qc2-spotlight-potential-note">Estimated based on price observed at different quantity</div>' : ""}
                                    ` : ""}
                                </div>
                                <div class="qc2-spotlight-actions">
                                    <button type="button" class="secondary-btn qc2-collapse-btn" data-qc-action="open-product-summary" data-product-name="${escapeHtml(card.productName)}" data-product-unit="${escapeHtml(card.unit || "")}" data-card-key="${escapeHtml(cardKey)}">
                                        View summary
                                    </button>
                                    <button type="button" class="secondary-btn qc2-collapse-btn" data-qc-action="toggle-decision-card" data-card-key="${escapeHtml(cardKey)}" aria-expanded="${isExpanded ? "true" : "false"}">
                                        ${isExpanded ? "Hide table" : "Show table"}
                                    </button>
                                </div>
                            </div>
                            <div class="qc2-spotlight-decision ${card.statusTone === "neutral" ? "is-neutral" : ""}">${escapeHtml(card.decisionSentence)}</div>
                        </article>
                    `;
                }).join("")}
                    </div>
                    ${hasMoreCards ? `
                        <div class="qc2-spotlight-loadmore">
                            <button type="button" class="secondary-btn" data-qc-action="load-more-opportunities">Load more opportunities (${cards.length - visibleCards.length} remaining)</button>
                        </div>
                    ` : ""}
                </div>
            </div>
        `;
        console.info("[compare prices opportunity cards render]", {
            visibleCards: visibleCards.length,
            totalCards: cards.length,
            durationMs: Number((performance.now() - renderStartedAt).toFixed(1))
        });
        if (memo.cardsRef === cards) {
            memo.spotlightMarkupKey = spotlightMarkupKey;
            memo.spotlightMarkup = markup;
        }
        return markup;
    }

    function getAnalysisDecisionCards(state) {
        return getAnalysisSummary(state.analysisResult || { comparison: { bids: [] } }).decisionCards || [];
    }

    function getAnalyzeHistoryTargetCard(state) {
        const decisionCards = getAnalysisDecisionCards(state);
        if (!decisionCards.length) return null;
        const selectedCard = decisionCards.find((card) => getScopedDecisionCardKey("analysis", getDecisionCardKey(card)) === state.selectedAnalysisRowKey);
        return selectedCard || null;
    }

    function findProductSummaryCard(state, productName, unit) {
        const cards = getAnalysisDecisionCards(state)
            .filter((card) => card.productName === productName && String(card.unit || "") === String(unit || ""));
        if (!cards.length) return null;
        return [...cards].sort((left, right) => compareOffersByRecency(left.currentOffer || {}, right.currentOffer || {}))[0] || cards[0];
    }

    function openProductSummary(state, productName, unit) {
        const card = findProductSummaryCard(state, productName, unit);
        if (!card?.productSummary) return false;
        state.productSummaryModalOpen = true;
        state.productSummaryModalData = {
            productName: card.productName,
            unit: card.unit || "",
            currentOffer: card.currentOffer || null,
            productSummary: card.productSummary
        };
        return true;
    }

    function closeProductSummary(state) {
        state.productSummaryModalOpen = false;
        state.productSummaryModalData = null;
    }

    function clearActiveProductFilterState(state, { clearSearch = true } = {}) {
        state.activeProductFilter = null;
        state.spotlightTableFilterKey = "";
        if (clearSearch) {
            state.analysisTableSearch = "";
        }
    }

    function renderProductSummaryDrawer(state) {
        if (!state.productSummaryModalOpen || !state.productSummaryModalData?.productSummary) return "";
        const { productName, unit, currentOffer, productSummary } = state.productSummaryModalData;
        const {
            lowestObservedOffer,
            highestObservedOffer,
            latestObservedOffer,
            averageObservedUnitPrice,
            supplierCount,
            offers
        } = productSummary;
        const currency = lowestObservedOffer?.currency || currentOffer?.currency || "USD";
        const currentVsLowestUnitGap = Math.max(Number(currentOffer?.unit_price || 0) - Number(lowestObservedOffer?.unit_price || 0), 0);
        const currentVsLowestPercent = Number(currentOffer?.unit_price || 0)
            ? (currentVsLowestUnitGap / Number(currentOffer?.unit_price || 0)) * 100
            : 0;
        const summaryInsights = [
            lowestObservedOffer
                ? `Best recorded price: ${formatCurrency(lowestObservedOffer.unit_price || 0, lowestObservedOffer.currency || currency)} from ${lowestObservedOffer.supplier_name || "Supplier missing"} on ${formatDate(lowestObservedOffer.quote_date)} at quantity ${formatQuantity(lowestObservedOffer.quantity || 0)}.`
                : "Best recorded price is not available.",
            highestObservedOffer
                ? `Highest observed price: ${formatCurrency(highestObservedOffer.unit_price || 0, highestObservedOffer.currency || currency)} from ${highestObservedOffer.supplier_name || "Supplier missing"} on ${formatDate(highestObservedOffer.quote_date)}.`
                : "Highest observed price is not available.",
            currentOffer && lowestObservedOffer
                ? currentVsLowestUnitGap > 0
                    ? `${currentOffer.supplier_name || "Current supplier"} is ${formatCurrency(currentVsLowestUnitGap, currentOffer.currency || currency)} per unit above the best recorded price (${formatPercent(currentVsLowestPercent)} gap).`
                    : `${currentOffer.supplier_name || "Current supplier"} is already at the best recorded unit price for this product.`
                : "Current supplier comparison is not available."
        ];

        return `
            <div class="qc2-product-summary-backdrop" data-qc-product-summary-close></div>
            <aside class="qc2-product-summary-drawer" role="dialog" aria-modal="true" aria-label="${escapeHtml(`${productName} ${unit} price summary`)}">
                <div class="qc2-product-summary-head">
                    <div>
                        <div class="mapping-section-title">${escapeHtml(productName)}</div>
                        <div class="mapping-section-copy">Unit: ${escapeHtml(unit || "Unit missing")} | ${offers.length} observed records | ${supplierCount} suppliers</div>
                    </div>
                    <button type="button" class="secondary-btn" data-qc-product-summary-close="true" aria-label="Close price summary">Close</button>
                </div>
                <div class="qc2-product-summary-kpis">
                    <article class="summary-card qc2-product-summary-kpi"><div class="summary-card-title">Best Unit Price</div><div class="summary-card-value compact">${lowestObservedOffer ? escapeHtml(formatCurrency(lowestObservedOffer.unit_price || 0, lowestObservedOffer.currency || currency)) : "--"}</div><div class="summary-card-insight">${escapeHtml(lowestObservedOffer?.supplier_name || "Supplier missing")} | Qty ${escapeHtml(formatQuantity(lowestObservedOffer?.quantity || 0))}</div></article>
                    <article class="summary-card qc2-product-summary-kpi"><div class="summary-card-title">Highest Unit Price</div><div class="summary-card-value compact">${highestObservedOffer ? escapeHtml(formatCurrency(highestObservedOffer.unit_price || 0, highestObservedOffer.currency || currency)) : "--"}</div><div class="summary-card-insight">${escapeHtml(highestObservedOffer?.supplier_name || "Supplier missing")}</div></article>
                    <article class="summary-card qc2-product-summary-kpi"><div class="summary-card-title">Latest Unit Price</div><div class="summary-card-value compact">${latestObservedOffer ? escapeHtml(formatCurrency(latestObservedOffer.unit_price || 0, latestObservedOffer.currency || currency)) : "--"}</div><div class="summary-card-insight">${escapeHtml(formatDate(latestObservedOffer?.quote_date))}</div></article>
                    <article class="summary-card qc2-product-summary-kpi"><div class="summary-card-title">Average Unit Price</div><div class="summary-card-value compact">${escapeHtml(formatCurrency(averageObservedUnitPrice || 0, currency))}</div><div class="summary-card-insight">Across all observed records</div></article>
                </div>
                <div class="qc2-product-summary-insights">
                    ${summaryInsights.map((insight) => `<div class="qc2-product-summary-insight">${escapeHtml(insight)}</div>`).join("")}
                </div>
                <div class="qc2-product-summary-timeline">
                    ${offers.map((offer) => `
                        <div class="qc2-product-summary-item ${lowestObservedOffer && isSameOffer(offer, lowestObservedOffer) ? "is-highlighted" : ""}">
                            <div class="qc2-product-summary-item-head">
                                <span>${escapeHtml(formatDate(offer.quote_date))}</span>
                                <span>${escapeHtml(offer.supplier_name || "Supplier missing")}</span>
                            </div>
                            <div class="qc2-product-summary-item-copy">Qty ${escapeHtml(formatQuantity(offer.quantity || 0))} | Unit ${escapeHtml(formatCurrency(offer.unit_price || 0, offer.currency || currency))} | Total ${escapeHtml(formatCurrency(offer.total_price || 0, offer.currency || currency))}</div>
                        </div>
                    `).join("")}
                </div>
            </aside>
        `;
    }

    function renderAnalysisMobileCards(cards) {
        return `
            <div class="qc2-mobile-card-list qc2-mobile-analysis-list">
                ${cards.map((card) => {
                    const bestOffer = card.bestOffer || card.currentOffer || null;
                    const bestPrice = Number(bestOffer?.unit_price || card.currentOffer?.unit_price || 0);
                    const changePercent = card.hasValidAlternative
                        ? Number(card.savingsPercent || 0)
                        : 0;
                    return `
                        <article class="qc2-mobile-data-card qc2-mobile-analysis-card">
                            <div class="qc2-mobile-data-row">
                                <span class="qc2-mobile-data-label">Product</span>
                                <span class="qc2-mobile-data-value">${escapeHtml(card.productName || "Product missing")}</span>
                            </div>
                            <div class="qc2-mobile-data-row">
                                <span class="qc2-mobile-data-label">Best price</span>
                                <span class="qc2-mobile-data-value">${escapeHtml(formatCurrency(bestPrice, card.currency))}</span>
                            </div>
                            <div class="qc2-mobile-data-row">
                                <span class="qc2-mobile-data-label">Change %</span>
                                <span class="qc2-mobile-data-value ${changePercent > 0 ? "qc2-mobile-data-value--positive" : changePercent < 0 ? "qc2-mobile-data-value--negative" : ""}">${escapeHtml(formatPercent(changePercent))}</span>
                            </div>
                        </article>
                    `;
                }).join("")}
            </div>
        `;
    }

    function getCurrentVisibleData(state, scope = "") {
        const renderModel = getAnalyzeRenderModel(state);
        if (scope === "top-savings") {
            if (!renderModel.isOpportunitySectionVisible) {
                return [];
            }
            return (renderModel.opportunityCards || []).slice(
                0,
                Math.max(state.opportunityRenderCount || OPPORTUNITY_CARD_BATCH_SIZE, OPPORTUNITY_CARD_BATCH_SIZE)
            );
        }
        const sourceCards = Array.isArray(renderModel.summary?.decisionCards)
            ? renderModel.summary.decisionCards
            : (renderModel.decisionCards || []);
        return getFilteredAnalysisCards(state, sourceCards);
    }

    function sanitizeExportFilePart(value, fallback = "export") {
        const sanitized = String(value || "")
            .trim()
            .replace(/[^a-z0-9]+/gi, "_")
            .replace(/^_+|_+$/g, "");
        return sanitized || fallback;
    }

    function triggerAnalysisDownload(filename, content, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 0);
    }

    function toCsvValue(value) {
        const text = value == null ? "" : String(value);
        if (/^=".*"$/.test(text)) return text;
        if (!/[",\n]/.test(text)) return text;
        return `"${text.replace(/"/g, "\"\"")}"`;
    }

    function toExcelSafeNumericText(value, { decimals = 2, suffix = "" } = {}) {
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue)) {
            return "";
        }
        return `="${numericValue.toFixed(decimals)}${suffix}"`;
    }

    function buildAnalysisExportFilename(state, scope) {
        const baseName = scope === "top-savings" ? "top_savings_export" : "full_table_export";
        const productPart = state.activeProductFilter ? `_${sanitizeExportFilePart(state.activeProductFilter, "product")}` : "";
        return `${baseName}${productPart}.csv`;
    }

    function buildFullTableExportRows(cards) {
        return cards.map((card) => {
            const viewModel = getAnalysisTableViewModel(card);
            return {
                Product: card.productName || "",
                "Lowest Supplier": getOfferSupplierLabel(viewModel.leftOffer) || "",
                "Lowest Price": toExcelSafeNumericText(viewModel.leftUnitPrice),
                "Highest Supplier": getOfferSupplierLabel(viewModel.rightOffer) || "",
                "Highest Price": toExcelSafeNumericText(viewModel.rightUnitPrice),
                Savings: toExcelSafeNumericText(viewModel.savingsAmount || 0)
            };
        });
    }

    function buildTopSavingsExportRows(cards) {
        return cards.map((card) => ({
            Product: card.productName || "",
            "Current Price": toExcelSafeNumericText(card.currentOffer?.unit_price || 0),
            "Lowest Price": toExcelSafeNumericText(card.referenceOffer?.unit_price || card.bestOffer?.unit_price || 0),
            Savings: toExcelSafeNumericText(card.savingsAmount || 0),
            "Savings %": toExcelSafeNumericText(card.savingsPercent || 0, { suffix: "%" })
        }));
    }

    function buildCsvFromRows(rows, columns) {
        const lines = [columns.map(toCsvValue).join(",")];
        rows.forEach((row) => {
            lines.push(columns.map((column) => toCsvValue(row[column])).join(","));
        });
        return lines.join("\n");
    }

    function exportCurrentVisibleData(state, scope) {
        const visibleData = getCurrentVisibleData(state, scope);
        const rows = scope === "top-savings"
            ? buildTopSavingsExportRows(visibleData)
            : buildFullTableExportRows(visibleData);
        const columns = scope === "top-savings"
            ? ["Product", "Current Price", "Lowest Price", "Savings", "Savings %"]
            : ["Product", "Lowest Supplier", "Lowest Price", "Highest Supplier", "Highest Price", "Savings"];
        triggerAnalysisDownload(
            buildAnalysisExportFilename(state, scope),
            buildCsvFromRows(rows, columns),
            "text/csv;charset=utf-8"
        );
    }

    function renderAnalyzeRows(cards, state) {
        const renderStartedAt = performance.now();
        const filteredCards = getFilteredAnalysisCards(state, cards);
        if (!filteredCards.length) {
            return '<div class="decision-list-empty">No supplier rows were available for comparison.</div>';
        }
        const { visibleCards, topSpacer, bottomSpacer } = getAnalysisVirtualSlice(filteredCards, state);
        const memo = getAnalysisMemo(state);
        const tableMarkupKey = [
            normalizeAnalysisTableFilter(state.analysisTableFilter),
            String(state.analysisTableSearch || "").trim().toLowerCase(),
            state.analysisTableSort?.key || "",
            state.analysisTableSort?.direction || "",
            state.selectedAnalysisRowKey || "",
            state.analysisViewport?.start || 0,
            state.analysisViewport?.end || visibleCards.length,
            filteredCards.length,
            visibleCards.map((card) => {
                const cardKey = getScopedDecisionCardKey("analysis", getDecisionCardKey(card));
                return `${getDecisionCardKey(card)}:${state.collapsedDecisionCards[cardKey] ? 1 : 0}`;
            }).join("|")
        ].join("::");
        if (memo.cardsRef === cards && memo.tableMarkupKey === tableMarkupKey && memo.tableMarkup) {
            return memo.tableMarkup;
        }
        const savingsSortDirection = state.analysisTableSort?.key === "savings" ? state.analysisTableSort.direction : "";
        const headerModel = getAnalysisTableViewModel(visibleCards[0] || filteredCards[0] || {});
        const savingsSortIndicator = savingsSortDirection === "asc" ? "↑" : savingsSortDirection === "desc" ? "↓" : "↕";
        const markup = `
            <div class="qc2-analysis-responsive-shell">
                ${renderAnalysisMobileCards(visibleCards)}
                <div class="qc2-analysis-table qc2-full-table-v3">
                <div class="qc2-analysis-table-head qc2-ft-head qc2-ft-grid" role="row">
                    <span class="qc2-ft-head-cell qc2-ft-head-cell--product" role="columnheader">Product</span>
                    <span class="qc2-ft-head-cell" role="columnheader">${escapeHtml(headerModel.leftHeader)}</span>
                    <span class="qc2-ft-head-cell qc2-ft-head-cell--price" role="columnheader">${escapeHtml(headerModel.leftPriceHeader)}</span>
                    <span class="qc2-ft-head-cell" role="columnheader">${escapeHtml(headerModel.rightHeader)}</span>
                    <span class="qc2-ft-head-cell qc2-ft-head-cell--price" role="columnheader">${escapeHtml(headerModel.rightPriceHeader)}</span>
                    <button type="button" class="qc2-ft-head-cell qc2-ft-head-cell--savings qc2-ft-sort-btn ${savingsSortDirection ? "is-active" : ""}" data-qc-action="sort-analysis-savings" aria-label="Sort by savings">${escapeHtml(headerModel.savingsHeader)} ${savingsSortIndicator}</button>
                    <span class="qc2-ft-head-cell qc2-ft-head-cell--result" role="columnheader">Result</span>
                    <span class="qc2-ft-head-cell qc2-ft-head-cell--details" role="columnheader">Details</span>
                </div>
                ${topSpacer ? `<div class="qc2-virtual-spacer" style="height:${topSpacer}px" aria-hidden="true"></div>` : ""}
                ${visibleCards.map((card, rowIndex) => {
                    const cardKey = getScopedDecisionCardKey("analysis", getDecisionCardKey(card));
                    const isExpanded = Boolean(state.collapsedDecisionCards[cardKey]);
                    const viewModel = getAnalysisTableViewModel(card);
                    const resultValue = viewModel.resultValue;
                    const leftDisplayOffer = viewModel.leftOffer;
                    const rightDisplayOffer = viewModel.rightOffer;
                    const leftDisplayUnitPrice = viewModel.leftUnitPrice;
                    const rightDisplayUnitPrice = viewModel.rightUnitPrice;
                    const totalDisplayQuantity = viewModel.totalQuantity;
                    const displaySavingsAmount = viewModel.savingsAmount;
                    const hasDirectSavings = viewModel.hasSavings;
                    const searchText = [
                        card.productName,
                        getOfferSupplierLabel(leftDisplayOffer),
                        getOfferSupplierLabel(rightDisplayOffer)
                    ].filter(Boolean).join(" ").toLowerCase();
                    const supplierSearchText = [
                        getOfferSupplierLabel(leftDisplayOffer),
                        getOfferSupplierLabel(rightDisplayOffer)
                    ].filter(Boolean).join(" ").toLowerCase();
                    const statusToneClass = viewModel.statusTone === "best"
                        ? "qc2-ft-result__badge--best"
                        : viewModel.statusTone === "neutral"
                            ? "qc2-ft-result__badge--neutral"
                            : "qc2-ft-result__badge--opportunity";
                    return `
                    <article
                        class="qc2-analysis-row qc2-ft-row ${isExpanded ? "is-expanded" : ""} ${state.selectedAnalysisRowKey === cardKey ? "is-selected" : ""}"
                        data-qc-analysis-row
                        data-qc-analysis-card-key="${escapeHtml(cardKey)}"
                        data-result="${escapeHtml(resultValue)}"
                        data-row-index="${rowIndex}"
                        data-search-text="${escapeHtml(searchText)}"
                        data-product-search-text="${escapeHtml(String(card.productName || "").toLowerCase())}"
                        data-supplier-search-text="${escapeHtml(supplierSearchText)}"
                        data-product-name="${escapeHtml(card.productName)}"
                        data-product-unit="${escapeHtml(card.unit || "")}"
                    >
                        <div class="qc2-analysis-row-main qc2-ft-row-main qc2-ft-grid" role="row">
                            <div class="qc2-analysis-cell qc2-analysis-cell-product qc2-ft-cell qc2-ft-cell--product" role="gridcell">
                                <div class="qc2-ft-stack">
                                    <div class="qc2-ft-primary qc2-ft-product" title="${escapeHtml(card.productName)}">${escapeHtml(card.productName)}</div>
                                    <div class="qc2-ft-meta">${escapeHtml(card.unit || "Unit not provided")} | Qty ${escapeHtml(formatQuantity(totalDisplayQuantity || 0))}</div>
                                </div>
                            </div>
                            <div class="qc2-analysis-cell qc2-ft-cell qc2-ft-cell--supplier" role="gridcell">
                                <div class="qc2-ft-stack">
                                    <div class="qc2-ft-primary qc2-ft-supplier" title="${escapeHtml(getOfferSupplierLabel(leftDisplayOffer) || "Supplier missing")}">${escapeHtml(getOfferSupplierLabel(leftDisplayOffer) || "Supplier missing")}</div>
                                    <div class="qc2-ft-meta">${escapeHtml(viewModel.leftMeta)}</div>
                                </div>
                            </div>
                            <div class="qc2-analysis-cell qc2-ft-cell qc2-ft-cell--price" role="gridcell">
                                <div class="qc2-ft-stack">
                                    <div class="qc2-ft-primary qc2-ft-money">${escapeHtml(formatCurrency(leftDisplayUnitPrice, card.currency))}</div>
                                    <div class="qc2-ft-meta">${escapeHtml(viewModel.leftPriceMeta)}</div>
                                </div>
                            </div>
                            <div class="qc2-analysis-cell qc2-ft-cell qc2-ft-cell--supplier" role="gridcell">
                                <div class="qc2-ft-stack">
                                    <div class="qc2-ft-primary qc2-ft-supplier" title="${escapeHtml(getOfferSupplierLabel(rightDisplayOffer) || "Supplier missing")}">${escapeHtml(getOfferSupplierLabel(rightDisplayOffer) || "Supplier missing")}</div>
                                    <div class="qc2-ft-meta">${escapeHtml(viewModel.rightMeta)}</div>
                                </div>
                            </div>
                            <div class="qc2-analysis-cell qc2-ft-cell qc2-ft-cell--price" role="gridcell">
                                <div class="qc2-ft-stack">
                                    <div class="qc2-ft-primary qc2-ft-money">${escapeHtml(formatCurrency(rightDisplayUnitPrice, card.currency))}</div>
                                    <div class="qc2-ft-meta">${escapeHtml(viewModel.rightPriceMeta)}</div>
                                </div>
                            </div>
                            <div class="qc2-analysis-cell qc2-ft-cell qc2-ft-cell--savings" role="gridcell">
                                ${!hasDirectSavings ? `
                                    <div class="qc2-ft-neutral-value">--</div>
                                ` : `
                                    <div class="qc2-ft-savings-pill qc2-ft-savings-pill--nowrap">${escapeHtml(formatCurrency(displaySavingsAmount, card.currency))}</div>
                                    <div class="qc2-ft-meta">Qty ${escapeHtml(formatQuantity(totalDisplayQuantity || 0))}</div>
                                `}
                            </div>
                            <div class="qc2-analysis-cell qc2-analysis-cell-result qc2-ft-cell qc2-ft-cell--result" role="gridcell">
                                <div class="qc2-ft-result" aria-label="Result summary">
                                    <div class="qc2-ft-result__badge-zone">
                                        <div class="qc2-ft-result__badge ${statusToneClass}" title="${escapeHtml(viewModel.statusLabel)}">${escapeHtml(viewModel.statusLabel)}</div>
                                    </div>
                                    <div class="qc2-ft-result__helper-zone">
                                        <div class="qc2-ft-result__helper">${escapeHtml(viewModel.resultHelper)}</div>
                                    </div>
                                    <div class="qc2-ft-result__insight-zone">
                                        <div class="qc2-ft-result__insight">${viewModel.resultInsight ? escapeHtml(viewModel.resultInsight) : ""}</div>
                                    </div>
                                </div>
                            </div>
                            <div class="qc2-analysis-cell qc2-analysis-cell-expand qc2-ft-cell qc2-ft-cell--details" role="gridcell">
                                <div class="qc2-ft-actions">
                                    <button
                                        type="button"
                                        class="secondary-btn qc2-collapse-btn qc2-analysis-history-btn"
                                        data-qc-action="see-history-offers"
                                        data-product-name="${escapeHtml(card.productName)}"
                                        data-product-unit="${escapeHtml(card.unit || "")}"
                                    >
                                        See history
                                    </button>
                                    <button type="button" class="secondary-btn qc2-collapse-btn" data-qc-action="open-product-summary" data-product-name="${escapeHtml(card.productName)}" data-product-unit="${escapeHtml(card.unit || "")}">
                                        Price summary
                                    </button>
                                    <button type="button" class="secondary-btn qc2-collapse-btn" data-qc-action="toggle-decision-card" data-card-key="${escapeHtml(cardKey)}" aria-expanded="${isExpanded ? "true" : "false"}">
                                        ${isExpanded ? "Close table" : "Open table"}
                                    </button>
                                </div>
                            </div>
                        </div>
                        ${isExpanded ? renderExpandedAnalysisRowDetail(card, viewModel) : ""}
                    </article>
                `;
                }).join("")}
                ${bottomSpacer ? `<div class="qc2-virtual-spacer" style="height:${bottomSpacer}px" aria-hidden="true"></div>` : ""}
                <div class="qc2-analysis-filter-empty" data-qc-analysis-empty hidden>No comparison rows match the selected filter.</div>
                </div>
            </div>
        `;
        console.info("[compare prices table render]", {
            filteredRows: filteredCards.length,
            visibleRows: visibleCards.length,
            durationMs: Number((performance.now() - renderStartedAt).toFixed(1))
        });
        if (memo.cardsRef === cards) {
            memo.tableMarkupKey = tableMarkupKey;
            memo.tableMarkup = markup;
        }
        return markup;
    }

    function renderOptimizeRows(rows, state) {
        if (!rows.length) {
            return '<div class="decision-list-empty">No products are available to optimize yet.</div>';
        }
        return `
            <div class="qc2-analysis-table qc2-analysis-table-optimize">
                <div class="qc2-analysis-table-head qc2-analysis-table-head-optimize">
                    <span>Product</span>
                    <span>Selected Supplier</span>
                    <span>Unit Price</span>
                    <span>Quantity</span>
                    <span>Total</span>
                    <span>Source</span>
                    <span>Price Date</span>
                    <span class="qc2-analysis-expand-col">Details</span>
                </div>
                ${rows.map((row) => {
                    const rowKey = getScopedDecisionCardKey("optimize", `${row.productName}__${row.unit}__${row.selectedSupplier}`);
                    const isExpanded = Boolean(state.collapsedDecisionCards[rowKey]);
                    return `
                    <article class="qc2-analysis-row ${isExpanded ? "is-expanded" : ""}">
                        <div class="qc2-analysis-row-main qc2-analysis-row-main-optimize">
                            <div class="qc2-analysis-cell">
                                <div class="qc2-analysis-product">${escapeHtml(row.productName)}</div>
                                <div class="qc2-analysis-sub">${escapeHtml(row.unit || "Unit not provided")}</div>
                            </div>
                            <div class="qc2-analysis-cell">
                                <div class="qc2-analysis-value">${escapeHtml(row.selectedSupplier || "Supplier missing")}</div>
                                <div class="qc2-analysis-sub">Best visible price</div>
                            </div>
                            <div class="qc2-analysis-cell">
                                <div class="qc2-analysis-value">${escapeHtml(formatCurrency(row.unitPrice || 0, row.currency))}</div>
                            </div>
                            <div class="qc2-analysis-cell">
                                <div class="qc2-analysis-value">${escapeHtml(String(row.quantity || 0))}</div>
                            </div>
                            <div class="qc2-analysis-cell">
                                <div class="qc2-analysis-value">${escapeHtml(formatCurrency(row.totalPrice || 0, row.currency))}</div>
                            </div>
                            <div class="qc2-analysis-cell">
                                <div class="qc2-analysis-value">${escapeHtml(row.sourceType || "manual")}</div>
                            </div>
                            <div class="qc2-analysis-cell">
                                <div class="qc2-analysis-value">${escapeHtml(formatDate(row.quoteDate))}</div>
                            </div>
                            <div class="qc2-analysis-cell qc2-analysis-cell-expand">
                                <button type="button" class="secondary-btn qc2-collapse-btn" data-qc-action="toggle-decision-card" data-card-key="${escapeHtml(rowKey)}" aria-expanded="${isExpanded ? "true" : "false"}">
                                    ${isExpanded ? "Close table" : "Open table"}
                                </button>
                            </div>
                        </div>
                        <div class="qc2-analysis-row-detail">
                            <div class="qc2-analysis-detail-grid">
                                ${(row.offers || []).map((offer) => `
                                    <div class="qc2-analysis-detail-item ${offer.supplier_name === row.selectedSupplier && Number(offer.total_price || 0) === Number(row.totalPrice || 0) ? "is-highlighted" : ""}">
                                        <span class="qc2-analysis-detail-label">${escapeHtml(offer.supplier_name || "Supplier missing")}</span>
                                        <span class="qc2-analysis-detail-value">${escapeHtml(formatCurrency(offer.total_price || 0, offer.currency || row.currency))} | ${escapeHtml(formatCurrency(offer.unit_price || 0, offer.currency || row.currency))} unit | ${escapeHtml(formatDate(offer.quote_date))}</span>
                                        <span class="qc2-analysis-detail-value">${escapeHtml(offer.currency || row.currency || "USD")} | ${escapeHtml(offer.delivery_time || "Delivery not provided")} | ${escapeHtml(offer.payment_term || "Payment terms not provided")}</span>
                                        ${(offer.valid_until || offer.notes) ? `<span class="qc2-analysis-detail-value">${escapeHtml(offer.valid_until ? formatDate(offer.valid_until) : "Validity not provided")}${offer.notes ? ` | ${escapeHtml(offer.notes)}` : ""}</span>` : ""}
                                    </div>
                                `).join("")}
                            </div>
                        </div>
                    </article>
                `;
                }).join("")}
            </div>
        `;
    }

    function renderQcAnalyze(state) {
        const step3RenderStartedAt = performance.now();
        const tableDataStartedAt = performance.now();
        const {
            result,
            summary,
            decisionCards,
            opportunityCards,
            comparisonCurrency,
            isOpportunitySectionVisible,
            activeAnalyzeTab,
            visibleSummary,
            shouldRenderFullComparison
        } = getAnalyzeRenderModel(state);
        const tableDataBuiltAt = performance.now();
        if (state.isRestoringAnalyze) {
            logQuoteCompareRestore("quote_compare.restore.table_data_ms", {
                activeTab: activeAnalyzeTab,
                decisionCards: decisionCards.length,
                opportunityCards: opportunityCards.length,
                durationMs: Number((tableDataBuiltAt - tableDataStartedAt).toFixed(1))
            });
        }
        const markup = `
            <section class="qc2-screen qc2-screen-analyze" id="qc2AnalysisTop">
                <div class="qc2-card qc2-analyze-card">
                    <div class="qc2-head qc2-head-compact qc2-analyze-head">
                        <div class="qc2-head-shell">
                            <div class="qc2-head-copy">
                                <div class="upload-step">Step 3</div>
                                <h2 class="qc2-title">Procurement decision screen</h2>
                                <p class="qc2-copy">See direct savings first, then review product-level price intelligence so you can spot lower supplier, historical, and quantity-based price patterns.</p>
                            </div>
                        </div>
                    </div>
                    <div class="qc2-analyze-tabs" role="tablist" aria-label="Analysis views">
                        <button type="button" class="secondary-btn qc2-analyze-tab ${activeAnalyzeTab === "savings" ? "active-tab" : ""}" data-qc-action="set-analyze-tab" data-tab="savings" role="tab" aria-selected="${activeAnalyzeTab === "savings" ? "true" : "false"}">
                            Top Savings
                        </button>
                        <button type="button" class="secondary-btn qc2-analyze-tab ${activeAnalyzeTab === "full-table" ? "active-tab" : ""}" data-qc-action="set-analyze-tab" data-tab="full-table" role="tab" aria-selected="${activeAnalyzeTab === "full-table" ? "true" : "false"}">
                            Full Table
                        </button>
                    </div>
                    <div class="qc2-summary-grid qc2-summary-grid-compact qc2-summary-grid-hero" data-qc-analyze-summary-grid>
                        ${renderAnalyzeSummaryGridMarkup(visibleSummary, activeAnalyzeTab, comparisonCurrency)}
                    </div>
                    <div class="qc2-analyze-tab-panels">
                        <div id="qcTabSavings" class="qc2-analyze-tab-panel ${activeAnalyzeTab === "savings" ? "active-tab" : ""}" role="tabpanel" aria-hidden="${activeAnalyzeTab === "savings" ? "false" : "true"}">
                            <section class="qc2-analysis-block qc2-analysis-block-primary ${isOpportunitySectionVisible ? "" : "is-collapsed"}" data-qc-anchor="opportunity-section">
                                ${isOpportunitySectionVisible ? `
                                    <div class="mapping-section-head">
                                        <div>
                                            <div class="mapping-section-title">Top pricing opportunities</div>
                                            <div class="mapping-section-copy">Review direct savings first, then the strongest supplier, historical, and quantity-based price opportunities that may warrant action.</div>
                                        </div>
                                        <div class="qc2-analysis-section-actions">
                                            <button type="button" class="secondary-btn qc2-section-action-btn" data-qc-action="export-analysis-csv" data-export-scope="top-savings">Export CSV</button>
                                            <button type="button" class="secondary-btn qc2-section-action-btn" data-qc-action="collapse-all-opportunity-tables">Collapse all tables</button>
                                            <button type="button" class="secondary-btn qc2-section-action-btn" data-qc-action="hide-opportunity-section">Hide section</button>
                                        </div>
                                    </div>
                                    <div data-qc-opportunity-cards>${renderDecisionSpotlightCards(opportunityCards, state)}</div>
                                ` : `
                                    <button type="button" class="qc2-collapsible-summary qc2-section-summary-btn" data-qc-action="toggle-opportunity-section" aria-expanded="false">
                                        <span>
                                            <span class="mapping-section-title">Top pricing opportunities</span>
                                            <span class="qc2-collapsible-summary-copy">Top pricing opportunity cards are hidden from view.</span>
                                        </span>
                                        <span class="qc2-collapsible-summary-action">Show section</span>
                                    </button>
                                `}
                            </section>
                        </div>
                        <div id="qcTabFullTable" class="qc2-analyze-tab-panel ${activeAnalyzeTab === "full-table" ? "active-tab" : ""}" role="tabpanel" aria-hidden="${activeAnalyzeTab === "full-table" ? "false" : "true"}">
                            <section class="qc2-analysis-block qc2-analysis-block-advanced" data-qc-anchor="full-comparison-section">
                                <div class="mapping-section-head qc2-analysis-table-headbar">
                                    <div>
                                        <div class="mapping-section-title">Full comparison table</div>
                                        <div class="mapping-section-copy">Structured all-products price intelligence view across the complete pricing set.</div>
                                    </div>
                                    <div class="qc2-analysis-section-actions">
                                        <button type="button" class="secondary-btn qc2-section-action-btn" data-qc-action="export-analysis-csv" data-export-scope="full-table">Export CSV</button>
                                        ${shouldRenderFullComparison ? '<button type="button" class="secondary-btn qc2-section-action-btn" data-qc-action="hide-all-details">Hide selections</button>' : ""}
                                        <button type="button" class="secondary-btn qc2-section-action-btn" data-qc-action="toggle-full-comparison" aria-expanded="${state.showFullComparison ? "true" : "false"}">
                                            ${state.showFullComparison ? "Hide table" : "Open table"}
                                        </button>
                                    </div>
                                </div>
                                ${shouldRenderFullComparison ? `
                                    ${renderAnalysisFilterBar(state, decisionCards)}
                                    <div class="qc2-analysis-table-frame">
                                        <div class="qc2-analysis-table-scroll" tabindex="0" aria-label="Full comparison table results">
                                            <div data-qc-analysis-table-content>${renderAnalyzeRows(decisionCards, state)}</div>
                                        </div>
                                    </div>
                                ` : ""}
                            </section>
                        </div>
                    </div>
                    ${activeAnalyzeTab === "savings" ? "" : renderStatus(state)}
                    <div data-qc-product-summary-modal>${renderProductSummaryDrawer(state)}</div>
                    <div class="qc2-actions qc2-analyze-actions" id="qc2AnalysisLower">
                        <div class="qc2-analyze-actions-slot is-left">
                            <button type="button" id="qcStep3BackBtn" class="secondary-btn" data-qc-action="back-review">Back</button>
                            ${state.demoMode ? "" : '<button type="button" class="secondary-btn" data-qc-action="back-home">Back to Home</button>'}
                        </div>
                        <div class="qc2-analyze-actions-slot is-right">
                            <button type="button" class="action-btn" data-qc-action="go-history">Product History</button>
                        </div>
                    </div>
                </div>
            </section>
        `;
        console.info("[compare prices step3 render]", {
            activeTab: activeAnalyzeTab,
            decisionCards: decisionCards.length,
            renderedOpportunityCards: opportunityCards.length,
            renderedFullComparison: shouldRenderFullComparison,
            tableDataBuildMs: Number((tableDataBuiltAt - tableDataStartedAt).toFixed(1)),
            durationMs: Number((performance.now() - step3RenderStartedAt).toFixed(1))
        });
        return markup;
    }

    function renderHistoryTrend(state, rows, { hasHistoryContext = false } = {}) {
        if (!hasHistoryContext) {
            return '<div class="decision-list-empty">Save supplier price records to start building product history.</div>';
        }
        if (!state.historySelectedSeriesKey) {
            return '<div class="decision-list-empty">Select a product to view trend.</div>';
        }
        if (!rows.length) {
            if (hasHistoryContext) {
                return '<div class="decision-list-empty">The selected product is outside the current filters.</div>';
            }
            return '<div class="decision-list-empty">Save supplier price records to start building product history.</div>';
        }
        const summary = buildHistorySeriesSummary(rows);
        const prices = rows.map((row) => row.unitPrice);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const range = maxPrice - minPrice;
        const minBarWidth = 18;
        const equalBarWidth = 70;
        return `
            <div class="qc2-history-selected-series-head">
                <div>
                    <div class="mapping-section-title">${escapeHtml(state.historySelectedProductName || rows[0].productName)}</div>
                    <div class="mapping-section-copy">${escapeHtml(state.historySelectedUnit || rows[0].unit || "Unit missing")} | ${rows.length} visible movements</div>
                </div>
                <div class="qc2-history-selected-series-stats">
                    <span>Latest ${escapeHtml(formatCurrency(summary.latestUnitPrice, rows[rows.length - 1]?.currency || "USD"))}</span>
                    <span>${summary.firstDate} to ${summary.latestDate}</span>
                </div>
            </div>
            <div class="qc2-trend-list qc2-trend-list-series">
                ${rows.map((row) => {
                    const normalizedWidth = range === 0
                        ? equalBarWidth
                        : minBarWidth + (((row.unitPrice - minPrice) / range) * (100 - minBarWidth));
                    const priceRatio = range === 0 ? 0.35 : (row.unitPrice - minPrice) / range;
                    const directionClass = row.changeValue == null ? "neutral" : row.changeValue > 0 ? "negative" : row.changeValue < 0 ? "positive" : "neutral";
                    let trackColor = "linear-gradient(90deg, rgba(96, 165, 250, 0.88), rgba(56, 189, 248, 0.72))";
                    if (priceRatio >= 0.75) {
                        trackColor = "linear-gradient(90deg, rgba(251, 191, 36, 0.9), rgba(249, 115, 22, 0.76))";
                    } else if (priceRatio >= 0.45) {
                        trackColor = "linear-gradient(90deg, rgba(52, 211, 153, 0.88), rgba(250, 204, 21, 0.70))";
                    } else if (priceRatio >= 0.2) {
                        trackColor = "linear-gradient(90deg, rgba(59, 130, 246, 0.88), rgba(16, 185, 129, 0.68))";
                    }
                    return `
                        <div class="qc2-trend-row">
                            <div class="qc2-trend-meta">
                                <span>${escapeHtml(formatDate(row.quoteDate || row.createdAt))}</span>
                                <span>${escapeHtml(row.supplier || "Supplier missing")} | Qty ${escapeHtml(String(row.quantity || 0))}</span>
                            </div>
                            <div class="qc2-trend-bar-shell">
                                <div class="qc2-trend-bar-track">
                                    <div class="qc2-trend-bar is-${directionClass}" style="width:${normalizedWidth}%; background:${trackColor};"></div>
                                </div>
                            </div>
                            <div class="qc2-trend-value">
                                ${escapeHtml(formatCurrency(row.unitPrice, row.currency))}
                                <span class="qc2-trend-value-sub">${escapeHtml(formatCurrency(row.totalPrice, row.currency))}${row.changeValue == null ? "" : ` | ${escapeHtml(formatCurrency(row.changeValue, row.currency))}`}</span>
                            </div>
                        </div>
                    `;
                }).join("")}
            </div>
        `;
    }

    function renderHistoryCombobox(key, label, placeholder, selectedValue, options, searchValue = "") {
        const emptyLabel = key === "product" ? "Clear product" : "All suppliers";
        return `
            <label class="recipe-field">
                <span class="recipe-field-label">${label}</span>
                <div class="qc2-history-combobox" data-qc-history-combobox="${key}">
                    <button
                        type="button"
                        class="mapping-select qc2-history-combobox-trigger ${selectedValue ? "has-value" : ""}"
                        data-qc-history-combobox-toggle="${key}"
                        aria-expanded="false"
                        aria-haspopup="listbox"
                    >
                        <span class="qc2-history-combobox-value ${selectedValue ? "" : "is-placeholder"}">${escapeHtml(selectedValue || placeholder)}</span>
                        <span class="qc2-history-combobox-caret" aria-hidden="true"></span>
                    </button>
                    <div class="qc2-history-combobox-panel" hidden>
                        <div class="qc2-history-combobox-search-shell">
                            <input
                                type="text"
                                class="qc2-history-combobox-search"
                                data-qc-history-filter-search="${key}"
                                value="${escapeHtml(searchValue)}"
                                placeholder="${escapeHtml(placeholder)}"
                                autocomplete="off"
                                spellcheck="false"
                                aria-label="${escapeHtml(`Search ${label.toLowerCase()}`)}"
                            >
                        </div>
                        <div class="qc2-history-combobox-options" role="listbox">
                            <button type="button" class="qc2-history-combobox-option is-clear" data-qc-history-filter-option="${key}" data-value="">
                                ${emptyLabel}
                            </button>
                            ${options.map((option) => `
                                <button
                                    type="button"
                                    class="qc2-history-combobox-option${option === selectedValue ? " is-selected" : ""}"
                                    data-qc-history-filter-option="${key}"
                                    data-value="${escapeHtml(option)}"
                                >
                                    ${escapeHtml(option)}
                                </button>
                            `).join("")}
                            <div class="qc2-history-combobox-empty" data-qc-history-filter-empty hidden>No matches found.</div>
                        </div>
                    </div>
                </div>
            </label>
        `;
    }

    function renderHistoryFilters(state, productOptions, supplierOptions) {
        const selectedProductValue = resolveUiSelectionDisplayValue(
            productOptions,
            state.historyFilters.product || "",
            state.historyFilterUi?.selectedDisplayValues?.product || ""
        );
        const selectedSupplierValue = resolveUiSelectionDisplayValue(
            supplierOptions,
            state.historyFilters.supplier || "",
            state.historyFilterUi?.selectedDisplayValues?.supplier || ""
        );
        return `
            <div class="qc2-history-filters">
                ${renderHistoryCombobox("product", "Product", "Search product", selectedProductValue, productOptions, state.historyFilterUi?.queries?.product || "")}
                ${renderHistoryCombobox("supplier", "Supplier", "Search supplier", selectedSupplierValue, supplierOptions, state.historyFilterUi?.queries?.supplier || "")}
                <div class="recipe-field">
                    <span class="recipe-field-label">Start Date</span>
                    <label class="date-input-inline qc2-history-date-shell ${state.historyFilters.dateFrom ? "has-value" : ""}" data-date-shell>
                        <input class="date-input qc2-history-date-input" type="date" data-qc-history-filter="dateFrom" value="${escapeHtml(state.historyFilters.dateFrom)}" aria-label="History start date">
                        <span class="qc2-history-date-value ${state.historyFilters.dateFrom ? "" : "is-placeholder"}">${escapeHtml(state.historyFilters.dateFrom || "Start date")}</span>
                        ${state.historyFilters.dateFrom ? '<button type="button" class="qc2-history-date-clear" data-qc-history-date-clear="dateFrom" aria-label="Clear start date filter">Clear date</button>' : ""}
                        <button type="button" class="qc2-history-date-trigger" aria-label="Open start date picker"></button>
                    </label>
                </div>
                <div class="recipe-field">
                    <span class="recipe-field-label">End Date</span>
                    <label class="date-input-inline qc2-history-date-shell ${state.historyFilters.dateTo ? "has-value" : ""}" data-date-shell>
                        <input class="date-input qc2-history-date-input" type="date" data-qc-history-filter="dateTo" value="${escapeHtml(state.historyFilters.dateTo)}" aria-label="History end date">
                        <span class="qc2-history-date-value ${state.historyFilters.dateTo ? "" : "is-placeholder"}">${escapeHtml(state.historyFilters.dateTo || "End date")}</span>
                        ${state.historyFilters.dateTo ? '<button type="button" class="qc2-history-date-clear" data-qc-history-date-clear="dateTo" aria-label="Clear end date filter">Clear date</button>' : ""}
                        <button type="button" class="qc2-history-date-trigger" aria-label="Open end date picker"></button>
                    </label>
                </div>
            </div>
        `;
    }

    function applyHistoryFilterValue(state, key, value) {
        if (!["product", "supplier"].includes(key)) return false;
        const optionSource = getHistoryFilterOptions(state, key);
        const matchedValue = resolveUiSelectionDisplayValue(optionSource, value, value);
        state.historyFilters[key] = matchedValue;
        state.historyFilterUi.selectedDisplayValues[key] = matchedValue;
        state.historyFilterUi.queries[key] = matchedValue;
        state.historyViewport = { start: 0, end: 120, scrollTop: 0 };
        syncHistoryFilterDefaults(state);
        return true;
    }

    function scrollHistoryComboboxSelectionIntoView(combobox) {
        if (!combobox) return;
        const selectedOption = combobox.querySelector(".qc2-history-combobox-option.is-selected");
        selectedOption?.scrollIntoView({ block: "nearest" });
    }

    function filterHistoryComboboxOptions(combobox, searchTerm) {
        if (!combobox) return;

        const normalizedSearch = normalizeUiSelectionMatch(searchTerm);
        let visibleCount = 0;

        combobox.querySelectorAll("[data-qc-history-filter-option]").forEach((option) => {
            if (option.dataset.value === "") {
                option.style.display = "";
                return;
            }

            const text = normalizeUiSelectionMatch(option.textContent);
            const matches = !normalizedSearch || text.includes(normalizedSearch);

            option.style.display = matches ? "" : "none";

            if (matches) {
                visibleCount += 1;
            }
        });

        const emptyState = combobox.querySelector("[data-qc-history-filter-empty]");
        if (emptyState) {
            emptyState.style.display = visibleCount > 0 ? "none" : "";
        }

        scrollHistoryComboboxSelectionIntoView(combobox);
    }

    function closeHistoryComboboxes(elements) {
        if (!elements.app) return;
        elements.app.querySelectorAll("[data-qc-history-combobox]").forEach((combobox) => {
            combobox.classList.remove("is-open");
            const trigger = combobox.querySelector("[data-qc-history-combobox-toggle]");
            const panel = combobox.querySelector(".qc2-history-combobox-panel");
            if (trigger) {
                trigger.setAttribute("aria-expanded", "false");
            }
            if (panel) {
                panel.hidden = true;
            }
        });
    }

    function openHistoryCombobox(elements, state, key) {
        if (!elements.app) return;
        closeHistoryComboboxes(elements);
        const combobox = elements.app.querySelector(`[data-qc-history-combobox="${key}"]`);
        if (!combobox) return;
        const trigger = combobox.querySelector("[data-qc-history-combobox-toggle]");
        const panel = combobox.querySelector(".qc2-history-combobox-panel");
        const searchInput = combobox.querySelector("[data-qc-history-filter-search]");
        combobox.classList.add("is-open");
        if (trigger) {
            trigger.setAttribute("aria-expanded", "true");
        }
        if (panel) {
            panel.hidden = false;
        }
        if (searchInput) {
            const persistedQuery = String(state.historyFilterUi?.queries?.[key] || "");
            searchInput.value = persistedQuery;
            filterHistoryComboboxOptions(combobox, persistedQuery);
            searchInput.focus({ preventScroll: true });
            searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
            return;
        }
        scrollHistoryComboboxSelectionIntoView(combobox);
    }

    function renderHistorySummaryCards(summary, currency) {
        return `
            <article class="summary-card"><div class="summary-card-title">Latest price</div><div class="summary-card-value compact">${summary.latestPrice == null ? "--" : escapeHtml(formatCurrency(summary.latestPrice, currency))}</div><div class="summary-card-insight">Most recent unit price in the selected range.</div></article>
            <article class="summary-card"><div class="summary-card-title">Oldest price</div><div class="summary-card-value compact">${summary.oldestPrice == null ? "--" : escapeHtml(formatCurrency(summary.oldestPrice, currency))}</div><div class="summary-card-insight">Starting unit price in the selected range.</div></article>
            <article class="summary-card"><div class="summary-card-title">Min / Max</div><div class="summary-card-value compact">${summary.minPrice == null ? "--" : `${escapeHtml(formatCurrency(summary.minPrice, currency))} / ${escapeHtml(formatCurrency(summary.maxPrice, currency))}`}</div><div class="summary-card-insight">Lowest and highest unit price in the visible history.</div></article>
            <article class="summary-card"><div class="summary-card-title">Total change</div><div class="summary-card-value compact">${summary.totalChange == null ? "--" : escapeHtml(formatCurrency(summary.totalChange, currency))}</div><div class="summary-card-insight">${summary.totalChangePercent == null ? "No change percentage available yet." : `${escapeHtml(formatPercent(summary.totalChangePercent))} from lowest to highest visible price.`}</div></article>
        `;
    }

    function refreshHistoryView(elements, state) {
        if (state.currentScreen !== "history") return;
        const historyScreen = elements.app?.querySelector(".qc2-screen-history");
        if (!historyScreen) {
            renderApp(elements, state, { preserveScroll: true });
            return;
        }

        const viewModel = getHistoryViewModel(state);
        closeHistoryComboboxes(elements);

        const controls = historyScreen.querySelector(".qc2-history-controls");
        if (controls) {
            controls.innerHTML = renderHistoryFilters(state, viewModel.productOptions, viewModel.supplierOptions);
        }

        const summaryGrid = historyScreen.querySelector(".qc2-history-summary-grid");
        if (summaryGrid) {
            summaryGrid.innerHTML = renderHistorySummaryCards(viewModel.summary, viewModel.currency);
        }

        const tableContent = historyScreen.querySelector("[data-qc-history-table-content]");
        if (tableContent) {
            tableContent.innerHTML = renderHistoryTable(state, viewModel.tableRows, { hasHistoryContext: viewModel.hasHistoryContext });
        }

        const trendContent = historyScreen.querySelector("[data-qc-history-trend-content]");
        if (trendContent) {
            trendContent.innerHTML = renderHistoryTrend(state, viewModel.selectedSeriesRows, { hasHistoryContext: viewModel.hasHistoryContext });
        }

        const detailModalSlot = historyScreen.querySelector("[data-qc-history-detail-modal]");
        if (detailModalSlot) {
            detailModalSlot.innerHTML = renderHistoryDetailModal(state);
        }

        scheduleHistoryDetailChartRender(elements, state);

        persistQuoteCompareSession(state, elements);
    }

    function renderHistoryMobileCards(rows) {
        return `
            <div class="qc2-mobile-card-list qc2-mobile-history-list">
                ${rows.map((row) => `
                    <article class="qc2-mobile-data-card qc2-mobile-history-card" data-qc-history-row data-qc-history-series-key="${escapeHtml(getHistorySeriesKey(row.productName, row.unit))}" data-qc-history-row-id="${escapeHtml(row.historyId)}" tabindex="0" role="button" aria-label="${escapeHtml(`${row.productName} ${row.unit || ""}. Tap to inspect movement.`)}">
                        <div class="qc2-mobile-data-row">
                            <span class="qc2-mobile-data-label">Product</span>
                            <span class="qc2-mobile-data-value">${escapeHtml(row.productName)}</span>
                        </div>
                        <div class="qc2-mobile-data-row">
                            <span class="qc2-mobile-data-label">Best price</span>
                            <span class="qc2-mobile-data-value">${escapeHtml(formatCurrency(row.unitPrice, row.currency))}</span>
                        </div>
                        <div class="qc2-mobile-data-row">
                            <span class="qc2-mobile-data-label">Change %</span>
                            <span class="qc2-mobile-data-value ${row.changePercent > 0 ? "qc2-mobile-data-value--negative" : row.changePercent < 0 ? "qc2-mobile-data-value--positive" : ""}">${row.changePercent == null ? "--" : escapeHtml(formatPercent(row.changePercent))}</span>
                        </div>
                    </article>
                `).join("")}
            </div>
        `;
    }

    function renderHistoryTable(state, rows, { hasHistoryContext = false } = {}) {
        if (!rows.length) {
            if (hasHistoryContext) {
                return '<div class="decision-list-empty">No saved price records match the selected filters.</div>';
            }
            return '<div class="decision-list-empty">Save supplier price records to start building product history.</div>';
        }
        const visibleColumns = getVisibleHistoryColumns(state);
        return `
            <div class="qc2-history-responsive-shell">
                ${renderHistoryMobileCards(rows)}
                <div class="qc2-history-table-shell">
                <div class="qc2-history-table-scroll" data-qc-history-table-scroll>
                    <table class="quote-compare-table qc2-history-table">
                    <thead>
                        <tr>
                            ${visibleColumns.map((column) => `
                                ${(() => {
                                    const sortDirection = getHistoryHeaderSortDirection(state, column.key);
                                    const sortHint = getHistoryHeaderSortHint(state, column.key);
                                    const sortIndicator = getHistoryHeaderSortIndicator(state, column.key);
                                    const ariaSort = getHistoryHeaderAriaSort(state, column.key);
                                    const headerClasses = [
                                        column.headerClassName || "",
                                        "qc2-history-sortable-header",
                                        sortDirection ? "is-sort-active" : "",
                                        sortDirection === "asc" ? "is-sort-asc" : "",
                                        sortDirection === "desc" ? "is-sort-desc" : ""
                                    ].filter(Boolean).join(" ");
                                    return `
                                <th
                                    class="${headerClasses}"
                                    data-qc-history-sort-key="${column.key}"
                                    data-qc-history-column-key="${column.key}"
                                    draggable="true"
                                    role="button"
                                    tabindex="0"
                                    aria-sort="${ariaSort}"
                                    title="${escapeHtml(sortHint)}"
                                    aria-label="${escapeHtml(`${column.label}. ${sortHint}`)}"
                                ><span class="qc2-history-sortable-head-copy"><span class="qc2-history-sortable-label">${escapeHtml(column.label)}</span><span class="qc2-history-sortable-indicator" aria-hidden="true">${escapeHtml(sortIndicator)}</span></span></th>`;
                                })()}
                            `).join("")}
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map((row) => `
                            <tr
                                class="${state.historySelectedRowId === row.historyId ? "is-history-row-selected" : ""}"
                                data-qc-history-row
                                data-qc-history-series-key="${escapeHtml(getHistorySeriesKey(row.productName, row.unit))}"
                                data-qc-history-row-id="${escapeHtml(row.historyId)}"
                                tabindex="0"
                                role="button"
                                aria-label="${escapeHtml(`${row.productName} ${row.unit || ""}. Click to inspect movement. Double click for details.`)}"
                            >
                                ${visibleColumns.map((column) => {
                                    const toneClassName = typeof column.toneClassName === "function" ? column.toneClassName(row) : "";
                                    const cellClassName = [column.cellClassName || "", toneClassName].filter(Boolean).join(" ");
                                    return `<td class="${cellClassName}">${column.render(row)}</td>`;
                                }).join("")}
                            </tr>
                        `).join("")}
                    </tbody>
                    </table>
                </div>
                </div>
            </div>
        `;
    }

    function renderHistoryDetailModal(state) {
        if (!state.historyDetailModalOpen || !state.historyDetailModalSeries?.rows?.length) return "";
        const { productName, unit, rows, usesFullSeries } = state.historyDetailModalSeries;
        const summary = buildHistorySeriesSummary(rows);
        const insights = buildHistorySeriesInsights(rows);
        const supplierRows = summary.supplierNames.map((supplierName) => {
            const matchingRows = rows.filter((row) => row.supplier === supplierName);
            const avgPrice = matchingRows.length
                ? matchingRows.reduce((sum, row) => sum + Number(row.unitPrice || 0), 0) / matchingRows.length
                : null;
            return {
                supplierName,
                avgPrice
            };
        });
        const supplierAvgPrices = supplierRows.map((entry) => Number(entry.avgPrice)).filter(Number.isFinite);
        const lowestSupplierAvg = supplierAvgPrices.length ? Math.min(...supplierAvgPrices) : null;
        const highestSupplierAvg = supplierAvgPrices.length ? Math.max(...supplierAvgPrices) : null;
        return `
            <div class="qc2-history-detail-backdrop" data-qc-history-detail-close></div>
            <aside class="qc2-history-detail-drawer" role="dialog" aria-modal="true" aria-label="${escapeHtml(`${productName} ${unit} detail view`)}">
                <div class="qc2-history-detail-head">
                    <div>
                        <div class="mapping-section-title">${escapeHtml(productName)}</div>
                    <div class="mapping-section-copy">Unit: ${escapeHtml(unit || "Unit missing")} • ${rows.length} movements</div>
                    </div>
                    <button type="button" class="secondary-btn" data-qc-history-detail-close="true" aria-label="Close history detail">Close</button>
                </div>
                <div class="qc2-history-detail-meta">
                    <span>${escapeHtml(summary.firstDate || "--")} → ${escapeHtml(summary.latestDate || "--")}</span>
                    ${usesFullSeries ? "<span>Full history</span>" : ""}
                </div>
                ${renderHistorySeriesChart(rows)}
                <div class="qc2-history-detail-kpis">
                    <article class="summary-card qc2-history-detail-kpi"><div class="summary-card-title">Lowest Unit Price</div><div class="summary-card-value compact">${summary.lowestUnitPrice == null ? "--" : escapeHtml(formatCurrency(summary.lowestUnitPrice, rows[rows.length - 1]?.currency || "USD"))}</div><div class="summary-card-insight">${escapeHtml(summary.lowestUnitPriceSupplier || "Supplier missing")}${summary.lowestUnitPriceDate ? ` | ${escapeHtml(summary.lowestUnitPriceDate)}` : ""}</div></article>
                    <article class="summary-card qc2-history-detail-kpi"><div class="summary-card-title">Highest Unit Price</div><div class="summary-card-value compact">${summary.highestUnitPrice == null ? "--" : escapeHtml(formatCurrency(summary.highestUnitPrice, rows[0]?.currency || "USD"))}</div><div class="summary-card-insight">${escapeHtml(summary.highestUnitPriceSupplier || "Supplier missing")}${summary.highestUnitPriceDate ? ` | ${escapeHtml(summary.highestUnitPriceDate)}` : ""}</div></article>
                    <article class="summary-card qc2-history-detail-kpi qc2-history-detail-kpi-current-supplier"><div class="summary-card-title">Current Supplier</div><div class="summary-card-value compact">${escapeHtml(summary.latestUnitPriceSupplier || "Supplier missing")}</div><div class="summary-card-insight">${summary.latestUnitPriceDate ? escapeHtml(summary.latestUnitPriceDate) : "Latest visible price context"}</div></article>
                    <article class="summary-card qc2-history-detail-kpi"><div class="summary-card-title">Net Change</div><div class="summary-card-value compact">${summary.netChange == null ? "--" : escapeHtml(formatCurrency(summary.netChange, rows[rows.length - 1]?.currency || "USD"))}</div><div class="summary-card-insight">First -> Latest</div></article>
                    <article class="summary-card qc2-history-detail-kpi"><div class="summary-card-title">Net Change %</div><div class="summary-card-value compact">${summary.netChangePercent == null ? "--" : escapeHtml(formatPercent(summary.netChangePercent))}</div><div class="summary-card-insight">${escapeHtml(summary.firstDate || "--")} -> ${escapeHtml(summary.latestDate || "--")}</div></article>
                    <article class="summary-card qc2-history-detail-kpi"><div class="summary-card-title">Average Unit Price</div><div class="summary-card-value compact">${summary.averageUnitPrice == null ? "--" : escapeHtml(formatCurrency(summary.averageUnitPrice, rows[0]?.currency || "USD"))}</div><div class="summary-card-insight">Across ${escapeHtml(String(summary.movementCount || 0))} records</div></article>
                    <article class="summary-card qc2-history-detail-kpi"><div class="summary-card-title">Movement Count</div><div class="summary-card-value compact">${summary.movementCount}</div><div class="summary-card-insight">First -> Latest</div></article>
                    <article class="summary-card qc2-history-detail-kpi"><div class="summary-card-title">Supplier Count</div><div class="summary-card-value compact">${summary.supplierCount}</div><div class="summary-card-insight"><button type="button" class="secondary-btn qc2-history-suppliers-toggle" data-qc-history-suppliers-toggle="true">${state.historyDetailSuppliersExpanded ? "Hide Suppliers" : "See Suppliers"}</button></div></article>
                </div>
                ${state.historyDetailSuppliersExpanded ? `
                    <section class="qc2-history-detail-section qc2-history-detail-section-suppliers">
                        <div class="qc2-history-detail-section-head">
                            <div class="qc2-history-detail-section-title">Suppliers</div>
                        </div>
                        <div class="qc2-history-detail-suppliers">
                            ${supplierRows.map((entry) => {
                                const isLowest = lowestSupplierAvg != null && Number(entry.avgPrice) === lowestSupplierAvg;
                                const isHighest = highestSupplierAvg != null && Number(entry.avgPrice) === highestSupplierAvg;
                                return `<div class="qc2-history-detail-supplier-card ${isLowest ? "is-lowest" : ""} ${isHighest ? "is-highest" : ""}">
                                    <div class="qc2-history-detail-supplier-head">
                                        <div class="qc2-history-detail-supplier-name">${escapeHtml(entry.supplierName)}</div>
                                        <div class="qc2-history-detail-supplier-badges">
                                            ${isLowest ? '<span class="qc2-history-detail-supplier-badge is-lowest">Lowest</span>' : ""}
                                            ${isHighest ? '<span class="qc2-history-detail-supplier-badge is-highest">Highest</span>' : ""}
                                        </div>
                                    </div>
                                    <div class="qc2-history-detail-supplier-meta">Average unit price</div>
                                    <div class="qc2-history-detail-supplier-price">${escapeHtml(formatCurrency(entry.avgPrice, rows[0]?.currency || "USD"))}</div>
                                </div>`;
                            }).join("")}
                        </div>
                    </section>
                ` : ""}
                <section class="qc2-history-detail-section qc2-history-detail-section-insights">
                    <div class="qc2-history-detail-section-head">
                        <div class="qc2-history-detail-section-title">Analysis Insights</div>
                    </div>
                    <div class="qc2-history-detail-insights">
                        ${insights.map((insight) => `<div class="qc2-history-detail-insight">${escapeHtml(insight)}</div>`).join("")}
                    </div>
                </section>
                <div class="qc2-history-detail-timeline">
                    ${rows.map((row) => `
                        <div class="qc2-history-detail-item">
                            <div class="qc2-history-detail-item-date">${escapeHtml(formatDate(row.quoteDate || row.createdAt))}</div>
                            <div class="qc2-history-detail-item-supplier">${escapeHtml(row.supplier || "Supplier missing")}</div>
                            <div class="qc2-history-detail-item-copy">Qty ${escapeHtml(String(row.quantity || 0))} • Unit ${escapeHtml(formatCurrency(row.unitPrice, row.currency))} • Total ${escapeHtml(formatCurrency(row.totalPrice, row.currency))}</div>
                        </div>
                    `).join("")}
                </div>
            </aside>
        `;
    }

    function renderQcHistory(state) {
        const viewModel = getHistoryViewModel(state);

        return `
            <section class="qc2-screen qc2-screen-history" data-qc-anchor="history-top">
                <div class="qc2-card qc2-history-card">
                    <div class="qc2-head qc2-head-compact">
                        <div class="qc2-head-shell">
                            <div class="qc2-head-copy">
                                <div class="upload-step">Step 4</div>
                                <h2 class="qc2-title">Product history</h2>
                                <p class="qc2-copy">Filter saved supplier price records by product, supplier, and date to review how visible prices changed over time.</p>
                            </div>
                        </div>
                    </div>
                    <div class="qc2-history-controls">
                        ${renderHistoryFilters(state, viewModel.productOptions, viewModel.supplierOptions)}
                    </div>
                    <div class="qc2-summary-grid qc2-history-summary-grid">
                        ${renderHistorySummaryCards(viewModel.summary, viewModel.currency)}
                    </div>
                    <section class="qc2-history-block qc2-history-table-block qc2-history-section">
                        <div class="mapping-section-head">
                            <div>
                                <div class="mapping-section-title">Price history table</div>
                                <div class="mapping-section-copy">Review each saved supplier price record, including change versus the previous visible record.</div>
                            </div>
                        </div>
                        <div data-qc-history-table-content>${renderHistoryTable(state, viewModel.tableRows, { hasHistoryContext: viewModel.hasHistoryContext })}</div>
                    </section>
                    <section class="qc2-history-block qc2-history-trend-block">
                        <div class="mapping-section-head"><div><div class="mapping-section-title">Simple trend</div><div class="mapping-section-copy">Unit price over time for the currently visible history rows.</div></div></div>
                        <div data-qc-history-trend-content>${renderHistoryTrend(state, viewModel.selectedSeriesRows, { hasHistoryContext: viewModel.hasHistoryContext })}</div>
                    </section>
                    <div data-qc-history-detail-modal>${renderHistoryDetailModal(state)}</div>
                    ${renderStatus(state)}
                    <div class="qc2-actions qc2-analyze-actions">
                        <div class="qc2-analyze-actions-slot is-left">
                            <button type="button" id="qcStep4BackBtn" class="secondary-btn" data-qc-action="back-analyze">Back</button>
                            <button type="button" class="secondary-btn" data-qc-action="back-home">Back to Home</button>
                        </div>
                    </div>
                </div>
            </section>
        `;
    }

    function renderCurrentScreen(state) {
        switch (state.currentScreen) {
            case "upload":
                return renderQcUpload(state);
            case "manual":
                return renderQcManual(state);
            case "review":
                return renderQcReview(state);
            case "analyze":
                return renderQcAnalyze(state);
            case "history":
                return renderQcHistory(state);
            case "start":
            default:
                return renderQcStart(state);
        }
    }

    function renderApp(elements, state, options = {}) {
        const renderStartedAt = performance.now();
        state.renderPassCount = Number(state.renderPassCount || 0) + 1;
        if (!(state.currentScreen === "analyze" && state.isRestoringAnalyze)) {
            cancelRestoreAnalyzeDeferredRender(state);
        }
        if (state.isRestoringAnalyze) {
            state.restoreRenderPassCount = Number(state.restoreRenderPassCount || 0) + 1;
            logQuoteCompareRestore("quote_compare.restore.render_pass_count", {
                renderPassCount: state.renderPassCount,
                restoreRenderPassCount: Number(state.restoreRenderPassCount || 0)
            });
        }
        const preserveScrollTop = options.preserveScroll ? readScrollPosition(elements) : null;
        const anchorSelector = options.anchorSelector || "";
        const anchorOffset = anchorSelector ? getAnchorOffset(elements, anchorSelector) : null;
        if (!elements.app) return;
        sanitizeQuoteCompareStepState(state);
        updateLastQuoteCompareScreen(state);
        updateContinueAnalysisButton(elements, state);
        updateDemoStateBanner(elements, state);
        const tableDomStartedAt = performance.now();
        elements.app.innerHTML = renderCurrentScreen(state);
        const tableDomEndedAt = performance.now();
        bindCriticalQuoteCompareButtons(elements, state);
        if (preserveScrollTop != null) {
            writeScrollPosition(elements, preserveScrollTop);
        }
        restoreAnchorOffset(elements, anchorSelector, anchorOffset);
        if (state.currentScreen === "history") {
            scheduleHistoryDetailChartRender(elements, state);
        }
        updateCurrentFileSummary(elements, state);
        if (state.isRestoringAnalyze) {
            logQuoteCompareRestore("quote_compare.restore.render_block_time", {
                phase: state.restoreAnalyzeSettled ? "deferred_full" : "first_visible_batch",
                durationMs: Number((performance.now() - renderStartedAt).toFixed(1)),
                renderPassCount: state.renderPassCount,
                restoreRenderPassCount: Number(state.restoreRenderPassCount || 0)
            });
            logQuoteCompareRestore("quote_compare.restore.table_dom_ms", {
                durationMs: Number((tableDomEndedAt - tableDomStartedAt).toFixed(1))
            });
            logQuoteCompareRestore("quote_compare.restore.chart_data_ms", {
                durationMs: 0
            });
            logQuoteCompareRestore("quote_compare.restore.chart_render_ms", {
                durationMs: 0
            });
        }
        if ((state.deferPersistUntilStablePaint || state.deferPersistUntilPostConfirmPaint) && state.currentScreen === "analyze") {
            // Defer the first large snapshot rewrite until after stable paint on restore or post-confirm first paint.
        } else {
            scheduleQuoteCompareSessionPersist(state, elements);
        }
        console.info("[compare prices render timing]", {
            screen: state.currentScreen,
            renderPassCount: state.renderPassCount,
            restoreRenderPassCount: Number(state.restoreRenderPassCount || 0),
            durationMs: Number((performance.now() - renderStartedAt).toFixed(1))
        });
    }

    function scheduleAnalysisTableFilter(elements, state) {
        window.clearTimeout(state.analysisFilterTimer);
        state.analysisFilterTimer = window.setTimeout(() => {
            state.analysisFilterTimer = null;
            state.analysisViewport = { start: 0, end: 80, scrollTop: 0 };
            const scroller = elements.app?.querySelector(".qc2-analysis-table-scroll");
            if (scroller) {
                scroller.scrollTop = 0;
            }
            applyAnalysisTableFilter(elements, state);
            persistQuoteCompareSession(state, elements);
        }, 120);
    }

    function scheduleHistoryViewRefresh(elements, state) {
        if (state.historyRefreshFrame) {
            cancelAnimationFrame(state.historyRefreshFrame);
        }
        state.historyRefreshFrame = requestAnimationFrame(() => {
            state.historyRefreshFrame = 0;
            refreshHistoryView(elements, state);
        });
    }

    function applyAnalysisTableFilter(elements, state) {
        if (!elements.app) return;
        const activeFilter = normalizeAnalysisTableFilter(state.analysisTableFilter);
        elements.app.querySelectorAll("[data-qc-action=\"set-analysis-filter\"]").forEach((button) => {
            const isActive = button.dataset.filterValue === activeFilter;
            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-pressed", isActive ? "true" : "false");
        });
        const renderModel = getAnalyzeRenderModel(state);
        const summaryGrid = elements.app.querySelector("[data-qc-analyze-summary-grid]");
        const filterBar = elements.app.querySelector("[data-qc-analysis-filterbar]");
        const tableContent = elements.app.querySelector("[data-qc-analysis-table-content]");
        if (summaryGrid) {
            summaryGrid.innerHTML = renderAnalyzeSummaryGridMarkup(
                renderModel.visibleSummary,
                renderModel.activeAnalyzeTab,
                renderModel.comparisonCurrency
            );
        }
        if (filterBar && renderModel.shouldRenderFullComparison) {
            filterBar.outerHTML = renderAnalysisFilterBar(state, renderModel.decisionCards || []);
        }
        if (tableContent) {
            tableContent.innerHTML = renderAnalyzeRows(renderModel.summary.decisionCards || [], state);
        }
    }

    async function parseSelectedFile(state, file) {
        const parseSelectedStartedAt = performance.now();
        state.file = file || null;
        state.uploadReview = null;
        state.headers = [];
        state.rows = [];
        state.detectedMappings = {};
        state.selectedMappings = {};
        state.analysisResult = null;
        state.validation = { mappedCount: 0, missingFields: [...REQUIRED_FIELDS], duplicateColumns: [], ready: false };
        state.parseError = "";
        if (!file) {
            state.activeSessionId = "";
            sessionStorage.removeItem(QUOTE_COMPARE_ACTIVE_SESSION_KEY);
            setStatus(state, "File removed. Choose another supplier file to continue.", "info");
            return;
        }
        await inspectUpload(state);
        console.info("[compare prices file selection timing]", {
            fileName: file.name,
            totalFileSelectionMs: Number((performance.now() - parseSelectedStartedAt).toFixed(1))
        });
    }

    async function startDemoAnalysis(state) {
        const data = await fetchJson("/quote-compare/demo-data", {
            method: "POST"
        });
        const fieldReviews = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].map((field) => ({
            field,
            detected_column: data.mapping?.[field] || null,
            score: data.mapping?.[field] ? 100 : 0,
            match_quality: data.mapping?.[field] ? "exact" : "missing"
        }));
        state.demoMode = true;
        state.demoSessionId = data.session_id || state.demoSessionId || "";
        state.dataScope = "demo";
        state.mode = "upload";
        state.uploadReview = {
            session_id: data.session_id || "",
            filename: "Demo Data",
            required_fields: REQUIRED_FIELDS,
            optional_fields: OPTIONAL_FIELDS,
            message: data.message || "",
            review_message: "Demo data uses the same mapping contract as uploaded files.",
            mapping: { ...(data.mapping || {}) },
            field_reviews: fieldReviews,
            matched_fields: REQUIRED_FIELDS.length,
            missing_fields: [],
            optional_columns: [],
            headers: data.headers || []
        };
        state.headers = data.headers || [];
        state.detectedMappings = { ...(data.mapping || {}) };
        state.selectedMappings = { ...(data.mapping || {}) };
        computeValidation(state);
        state.analyzeMode = "compare";
        state.analysisResult = {
            comparison: { ...data.comparison, source_type: "demo" },
            evaluation: data.evaluation,
            summary: buildAnalyzeSummary({ comparison: { ...data.comparison, source_type: "demo" } })
        };
        state.rows = data.comparison?.bids || [];
        state.activeAnalyzeTab = "savings";
        state.showOpportunitySection = true;
        state.showFullComparison = false;
        state.opportunityRenderCount = OPPORTUNITY_CARD_BATCH_SIZE;
        clearActiveProductFilterState(state);
        state.collapsedDecisionCards = clearDecisionCardsForScope(state.collapsedDecisionCards, "spotlight");
        state.selectedAnalysisRowKey = "";
        state.lastFlowScreen = "review";
        state.currentScreen = "analyze";
        state.currentStep = 3;
        state.pendingPostConfirmScopePayload = buildClientAnalysisScopePayload(state);
        setStatus(state, data.message || "Demo analysis is ready.", "success");
        return true;
    }

    async function startUploadAnalysis(state, elements) {
        if (!state.file && !state.activeSessionId) {
            setStatus(state, "Choose a supplier file before starting analysis.", "error");
            return false;
        }
        computeValidation(state);
        if (!state.validation.ready) {
            setStatus(state, "Complete the required unique mappings before starting analysis.", "error");
            return false;
        }
        if (state.file) {
            console.info("[PERF] confirm_to_analyze.bootstrap_skipped", {
                skipped: true
            });
            console.info("[PERF] confirm_to_analyze.bootstrap_reason", {
                reason: "file_upload_confirm_response_used_directly"
            });
        }
        if (!state.file && state.activeSessionId) {
            try {
                const canReuseReviewContext = hasRestorableReviewContext(state)
                    && isValidSelectedMappingSet(state.selectedMappings, state.headers || []);
                let activeSession = null;
                if (canReuseReviewContext) {
                    console.info("[PERF] confirm_to_analyze.bootstrap_skipped", {
                        skipped: true
                    });
                    console.info("[PERF] confirm_to_analyze.bootstrap_reason", {
                        reason: "restored_review_context_reused"
                    });
                } else {
                    activeSession = await fetchActiveQuoteCompareSession(state.activeSessionId);
                    console.info("[PERF] confirm_to_analyze.bootstrap_skipped", {
                        skipped: false
                    });
                    console.info("[PERF] confirm_to_analyze.bootstrap_reason", {
                        reason: "restored_review_context_missing_or_invalid"
                    });
                }
                if (canReuseReviewContext) {
                    activeSession = {
                        session_id: state.uploadReview?.session_id || state.activeSessionId,
                        filename: state.uploadReview?.filename || "",
                        required_fields: state.uploadReview?.required_fields || REQUIRED_FIELDS,
                        optional_fields: state.uploadReview?.optional_fields || OPTIONAL_FIELDS,
                        message: state.uploadReview?.message || "",
                        review_message: state.uploadReview?.review_message || "",
                        mapping: state.uploadReview?.mapping || {},
                        field_reviews: state.uploadReview?.field_reviews || [],
                        matched_fields: state.uploadReview?.matched_fields || 0,
                        missing_fields: state.uploadReview?.missing_fields || [],
                        optional_columns: state.uploadReview?.optional_columns || [],
                        headers: state.headers || []
                    };
                }
                if (!activeSession || !isValidRestorableReviewSession(activeSession)) {
                    resetQuoteCompareUploadState(
                        state,
                        "Your upload session expired. Please upload the file again before starting analysis."
                    );
                    return false;
                }
                if (!isValidSelectedMappingSet(state.selectedMappings, activeSession.headers || [])) {
                    resetQuoteCompareUploadState(
                        state,
                        "Your restored mappings no longer match the uploaded file. Please upload the file again."
                    );
                    return false;
                }
                state.uploadReview = {
                    session_id: activeSession.session_id || "",
                    filename: activeSession.filename || "",
                    required_fields: activeSession.required_fields || REQUIRED_FIELDS,
                    optional_fields: activeSession.optional_fields || OPTIONAL_FIELDS,
                    message: activeSession.message || "",
                    review_message: activeSession.review_message || "",
                    mapping: activeSession.mapping || {},
                    field_reviews: activeSession.field_reviews || [],
                    matched_fields: activeSession.matched_fields || 0,
                    missing_fields: activeSession.missing_fields || [],
                    optional_columns: activeSession.optional_columns || [],
                    headers: activeSession.headers || []
                };
                state.headers = activeSession.headers || [];
                state.detectedMappings = { ...(activeSession.mapping || {}) };
            } catch (error) {
                resetQuoteCompareUploadState(
                    state,
                    "Your upload session could not be restored. Please upload the file again."
                );
                return false;
            }
        }
        state.isSubmitting = true;
        await setProgressPhase(state, "Validating");
        persistMappingMemory(state);
        const formData = new FormData();
        if (state.file) {
            formData.append("file", state.file);
        }
        formData.append("mappings", JSON.stringify(state.selectedMappings));
        if (state.activeSessionId) {
            formData.append("session_id", state.activeSessionId);
        }
        try {
            await setProgressPhase(state, "Mapping");
            let data;
            try {
                data = await fetchJson("/quote-compare/upload/confirm", {
                    method: "POST",
                    body: formData
                });
            } catch (error) {
                if (!state.file || !state.activeSessionId) {
                    throw error;
                }
                const retryFormData = new FormData();
                retryFormData.append("file", state.file);
                retryFormData.append("mappings", JSON.stringify(state.selectedMappings));
                data = await fetchJson("/quote-compare/upload/confirm", {
                    method: "POST",
                    body: retryFormData
                });
                state.activeSessionId = "";
                sessionStorage.removeItem(QUOTE_COMPARE_ACTIVE_SESSION_KEY);
            }
            state.confirmResponseReceivedAt = performance.now();
            await setProgressPhase(state, "Aggregating");
            state.activeSessionId = data.session_id || state.activeSessionId;
            if (state.activeSessionId) {
                sessionStorage.setItem(QUOTE_COMPARE_ACTIVE_SESSION_KEY, state.activeSessionId);
            }
            state.analyzeMode = "compare";
            await setProgressPhase(state, "Building analysis");
            state.analysisResult = {
                comparison: { ...data.comparison, source_type: "upload" },
                evaluation: data.evaluation,
                summary: buildAnalyzeSummary({ comparison: { ...data.comparison, source_type: "upload" } })
            };
            state.rows = data.comparison?.bids || [];
            state.activeAnalyzeTab = "savings";
            state.showOpportunitySection = true;
            state.showFullComparison = false;
            state.opportunityRenderCount = OPPORTUNITY_CARD_BATCH_SIZE;
            clearActiveProductFilterState(state);
            state.collapsedDecisionCards = clearDecisionCardsForScope(state.collapsedDecisionCards, "spotlight");
            state.selectedAnalysisRowKey = "";
            state.lastFlowScreen = "review";
            state.currentScreen = "analyze";
            state.currentStep = 3;
            state.isSubmitting = false;
            state.pendingPostConfirmScopePayload = buildClientAnalysisScopePayload(state);
            state.deferPersistUntilPostConfirmPaint = true;
            console.info("[PERF] confirm_to_analyze.session_persist_deferred", {
                deferred: true
            });
            setStatus(state, data.message || "Pricing analysis is ready.", "success");
            return true;
        } catch (error) {
            state.isSubmitting = false;
            if (!state.file && /no longer available|upload it again|session/i.test(error.message || "")) {
                resetQuoteCompareUploadState(
                    state,
                    "Your upload session expired. Please upload the file again."
                );
                return false;
            }
            setStatus(state, error.message, "error");
            return false;
        }
    }

    async function startManualAnalysis(state, elements) {
        try {
            computeValidation(state);
            if (!state.validation.ready) {
                setStatus(state, "Complete the required unique mappings before starting analysis.", "error");
                state.isSubmitting = false;
                return false;
            }
            await setProgressPhase(state, "Validating");
            const mappedRows = normalizeMappedManualRows(applySelectedMappingsToRows(state.rows, state.selectedMappings));
            state.normalizedRowsCache = mappedRows;
            const importResult = buildQuoteBidImportResultFromRows(mappedRows);
            if (!importResult.valid_row_count) {
                throw new Error("Add at least one complete pricing row before starting analysis.");
            }
            const payload = {
                upload_id: state.manualUploadId,
                name: `Manual Pricing Analysis ${new Date().toLocaleDateString("en-US")}`,
                sourcing_need: "",
                source_type: "manual",
                mode: "compare",
                bids: importResult.bids,
                weighting: null
            };
            await setProgressPhase(state, "Mapping");
            const data = await fetchJson("/quote-compare/evaluate", {
                method: "POST",
                body: JSON.stringify(payload)
            });
            await setProgressPhase(state, "Aggregating");
            state.analyzeMode = "compare";
            await setProgressPhase(state, "Building analysis");
            state.analysisResult = {
                comparison: { ...data.comparison, source_type: "manual" },
                evaluation: data.evaluation,
                summary: buildAnalyzeSummary({ comparison: { ...data.comparison, source_type: "manual" } })
            };
            state.manualUploadId = data.comparison?.upload_id || state.manualUploadId;
            state.rows = importResult.bids;
            state.activeAnalyzeTab = "savings";
            state.showOpportunitySection = true;
            state.showFullComparison = false;
            state.opportunityRenderCount = OPPORTUNITY_CARD_BATCH_SIZE;
            clearActiveProductFilterState(state);
            state.collapsedDecisionCards = clearDecisionCardsForScope(state.collapsedDecisionCards, "spotlight");
            state.selectedAnalysisRowKey = "";
            state.lastFlowScreen = "review";
            state.currentScreen = "analyze";
            state.currentStep = 3;
            await activateCurrentUploadScope(elements, state);
            const skippedMessage = importResult.skipped_row_count
                ? ` ${importResult.skipped_row_count} incomplete rows were skipped.`
                : "";
            setStatus(state, `Manual pricing analysis is ready.${skippedMessage}`, "success");
            state.isSubmitting = false;
            return true;
        } catch (error) {
            setStatus(state, error.message, "error");
            state.isSubmitting = false;
            return false;
        }
    }

    function openUploadFlow(elements, state) {
        resetQuoteCompareUploadState(state);
        state.mode = "upload";
        state.currentScreen = "upload";
        state.lastFlowScreen = "review";
        setStatus(state, "", "");
        renderApp(elements, state);
        writeScrollPosition(elements, 0);
    }

    function bindEvents(elements, state) {
        if (!elements.app || elements.app.dataset.bound === "true") return;
        elements.app.dataset.bound = "true";
        const analysisTableDrag = {
            scroller: null,
            pointerId: null,
            startX: 0,
            startY: 0,
            startScrollLeft: 0,
            didDrag: false,
            isDragging: false,
            suppressClick: false
        };

        function resetAnalysisTableDrag() {
            if (analysisTableDrag.scroller) {
                analysisTableDrag.scroller.classList.remove("is-dragging");
            }
            analysisTableDrag.scroller = null;
            analysisTableDrag.pointerId = null;
            analysisTableDrag.startX = 0;
            analysisTableDrag.startY = 0;
            analysisTableDrag.startScrollLeft = 0;
            analysisTableDrag.didDrag = false;
            analysisTableDrag.isDragging = false;
        }

        function canStartAnalysisTableDrag(event) {
            if (event.button !== 0 || event.pointerType === "touch") return false;
            const tableScroller = event.target.closest(".qc2-analysis-table-scroll");
            if (!tableScroller) return false;
            if (event.target.closest("button, input, textarea, select, a, [contenteditable='true']")) return false;
            return tableScroller.scrollWidth > tableScroller.clientWidth + 2;
        }

        elements.app.addEventListener("click", (event) => {
            if (!analysisTableDrag.suppressClick || !event.target.closest(".qc2-analysis-table-scroll")) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            analysisTableDrag.suppressClick = false;
        }, true);

        elements.app.addEventListener("pointerdown", (event) => {
            analysisTableDrag.suppressClick = false;
            if (!canStartAnalysisTableDrag(event)) return;
            const tableScroller = event.target.closest(".qc2-analysis-table-scroll");
            if (!tableScroller) return;
            analysisTableDrag.scroller = tableScroller;
            analysisTableDrag.pointerId = event.pointerId;
            analysisTableDrag.startX = event.clientX;
            analysisTableDrag.startY = event.clientY;
            analysisTableDrag.startScrollLeft = tableScroller.scrollLeft;
            analysisTableDrag.didDrag = false;
            analysisTableDrag.isDragging = false;
        });

        elements.app.addEventListener("pointermove", (event) => {
            if (!analysisTableDrag.scroller || analysisTableDrag.pointerId !== event.pointerId) return;
            const deltaX = event.clientX - analysisTableDrag.startX;
            const deltaY = event.clientY - analysisTableDrag.startY;
            if (!analysisTableDrag.isDragging) {
                if (Math.abs(deltaX) < 6 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
                analysisTableDrag.isDragging = true;
                analysisTableDrag.didDrag = true;
                analysisTableDrag.scroller.classList.add("is-dragging");
                if (!analysisTableDrag.scroller.hasPointerCapture(event.pointerId)) {
                    analysisTableDrag.scroller.setPointerCapture(event.pointerId);
                }
            }
            event.preventDefault();
            analysisTableDrag.scroller.scrollLeft = analysisTableDrag.startScrollLeft - deltaX;
        });

        elements.app.addEventListener("pointerup", (event) => {
            if (!analysisTableDrag.scroller || analysisTableDrag.pointerId !== event.pointerId) return;
            if (analysisTableDrag.scroller.hasPointerCapture(event.pointerId)) {
                analysisTableDrag.scroller.releasePointerCapture(event.pointerId);
            }
            analysisTableDrag.suppressClick = analysisTableDrag.didDrag;
            resetAnalysisTableDrag();
        });

        elements.app.addEventListener("pointercancel", (event) => {
            if (!analysisTableDrag.scroller || analysisTableDrag.pointerId !== event.pointerId) return;
            resetAnalysisTableDrag();
        });

        elements.workspace?.addEventListener("click", async (event) => {
            const actionTarget = event.target.closest("[data-qc-action]");
            if (!actionTarget || !elements.workspace?.contains(actionTarget)) return;
            const action = actionTarget.dataset.qcAction;
            const handled = await handleQuoteCompareAction(action, actionTarget, elements, state);
            if (handled != null) {
                event.preventDefault();
                return;
            }

            if (action === "start-upload") {
                if (state.demoMode) {
                    return;
                }
                closeProductSummary(state);
                state.mode = "upload";
                state.currentScreen = "upload";
                setStatus(state, "", "");
                renderApp(elements, state);
                refreshSharedScopeSummaryCached(elements, state, { force: true }).catch(() => null);
                return;
            }
            if (action === "start-manual") {
                if (state.demoMode) {
                    return;
                }
                closeProductSummary(state);
                state.mode = "manual";
                state.currentScreen = "manual";
                setStatus(state, "", "");
                renderApp(elements, state);
                refreshSharedScopeSummaryCached(elements, state, { force: true }).catch(() => null);
                return;
            }
            if (action === "start-demo") {
                closeProductSummary(state);
                state.demoMode = true;
                state.dataScope = "demo";
                state.mode = "upload";
                state.currentScreen = "review";
                state.isSubmitting = false;
                await triggerStep2StartAnalysis(elements, state);
                return;
            }
            if (action === "back-start") {
                if (state.demoMode) {
                    state.currentScreen = "analyze";
                    state.currentStep = 3;
                    renderApp(elements, state);
                    return;
                }
                closeProductSummary(state);
                state.currentScreen = "start";
                syncQuoteCompareStepState(state);
                setStatus(state, "", "");
                renderApp(elements, state);
                refreshSharedScopeSummaryCached(elements, state, { force: true }).catch(() => null);
                return;
            }
            if (action === "pick-file" || action === "replace-file") {
                if (state.demoMode) return;
                elements.app.querySelector("#qc2FileInput")?.click();
                return;
            }
            if (action === "remove-file") {
                if (state.demoMode) return;
                await parseSelectedFile(state, null);
                renderApp(elements, state);
                return;
            }
            if (action === "go-review") {
                if (state.demoMode) return;
                closeProductSummary(state);
                state.currentScreen = "review";
                renderApp(elements, state);
                return;
            }
            if (action === "back-upload") {
                if (state.demoMode) return;
                closeProductSummary(state);
                state.currentScreen = "upload";
                syncQuoteCompareStepState(state);
                renderApp(elements, state);
                return;
            }
            if (action === "clear-mappings") {
                clearMappings(state);
                setStatus(state, "All mapping selections were cleared.", "info");
                renderApp(elements, state, { preserveScroll: true });
                return;
            }
            if (action === "apply-saved-mappings-partial") {
                if (applySavedMappingsToState(state, state.mappingReuseCandidate, { partial: true })) {
                    state.mappingReuseNotice = {
                        tone: "warning",
                        message: "Matching saved fields were applied. Please verify before continuing."
                    };
                }
                renderApp(elements, state, { preserveScroll: true });
                return;
            }
            if (action === "start-analysis" || action === "manual-analyze") {
                if (state.demoMode) return;
                await triggerStep2StartAnalysis(elements, state);
                return;
            }
            if (action === "back-review") {
                if (state.demoMode) {
                    state.currentScreen = "analyze";
                    state.currentStep = 3;
                    renderApp(elements, state);
                    return;
                }
                closeProductSummary(state);
                if (state.currentScreen === "review" && state.mode === "manual") {
                    state.currentScreen = "manual";
                } else {
                    state.currentScreen = "review";
                }
                syncQuoteCompareStepState(state);
                renderApp(elements, state);
                return;
            }
            if (action === "add-manual-row") {
                if (state.demoMode) return;
                state.manualRows.push(createEmptyManualRow());
                renderApp(elements, state);
                return;
            }
            if (action === "remove-manual-row") {
                if (state.demoMode) return;
                const manualEntryScrollLeft = getManualEntryScroller(elements)?.scrollLeft || 0;
                const index = Number(actionTarget.dataset.index || -1);
                if (index > 0) state.manualRows.splice(index, 1);
                renderApp(elements, state, { preserveScroll: true });
                restoreManualEntryScrollLeft(elements, manualEntryScrollLeft);
                return;
            }
            if (action === "go-manual-review") {
                if (state.demoMode) return;
                try {
                    prepareManualDraftForReview(state);
                    state.lastFlowScreen = "manual";
                    state.currentScreen = "review";
                    setStatus(state, "Manual rows are ready for review.", "info");
                } catch (error) {
                    setStatus(state, error.message, "error");
                }
                renderApp(elements, state);
                return;
            }
            if (action === "open-product-summary") {
                const productName = actionTarget.dataset.productName || "";
                const productUnit = actionTarget.dataset.productUnit || "";
                const scopedCardKey = actionTarget.dataset.cardKey || actionTarget.closest("[data-qc-card-key]")?.dataset.qcCardKey || "";
                rememberFullComparisonTablePosition(elements, state);
                const spotlightCard = scopedCardKey
                    ? getAnalyzeRenderModel(state).opportunityCards.find((card) => getScopedDecisionCardKey("spotlight", getDecisionCardKey(card)) === scopedCardKey)
                    : null;
                if (spotlightCard?.productSummary) {
                    state.productSummaryModalOpen = true;
                    state.productSummaryModalData = {
                        productName: spotlightCard.productName,
                        unit: spotlightCard.unit || "",
                        currentOffer: spotlightCard.currentOffer || null,
                        productSummary: spotlightCard.productSummary
                    };
                } else if (!openProductSummary(state, productName, productUnit)) {
                    return;
                }
                renderApp(elements, state, { preserveScroll: true });
                requestAnimationFrame(() => {
                    restoreFullComparisonTablePosition(elements, state);
                });
                return;
            }
            if (action === "toggle-decision-card") {
                const cardKey = actionTarget.dataset.cardKey || "";
                if (cardKey) {
                    const cardScope = getDecisionCardScope(cardKey);
                    if (cardScope === "spotlight") {
                        const spotlightCard = getAnalyzeRenderModel(state).opportunityCards.find(
                            (card) => getScopedDecisionCardKey("spotlight", getDecisionCardKey(card)) === cardKey
                        );
                        if (!spotlightCard) {
                            return;
                        }
                        const spotlightGroupKey = getNormalizedProductUnitKey(spotlightCard.productName, spotlightCard.unit);
                        const nextProductFilter = String(state.activeProductFilter || "").trim().toLowerCase() === String(spotlightCard.productName || "").trim().toLowerCase()
                            ? null
                            : spotlightCard.productName;
                        state.spotlightTableFilterKey = nextProductFilter ? spotlightGroupKey : "";
                        state.activeProductFilter = nextProductFilter;
                        state.analysisTableSearch = nextProductFilter || "";
                        state.showFullComparison = true;
                        state.activeAnalyzeTab = "full-table";
                        state.selectedAnalysisRowKey = "";
                        renderApp(elements, state, {
                            preserveScroll: true,
                            anchorSelector: '[data-qc-anchor="full-comparison-section"]'
                        });
                        requestAnimationFrame(() => {
                            const tableScroller = getFullComparisonTableScroller(elements);
                            if (tableScroller) {
                                tableScroller.scrollTop = 0;
                            }
                        });
                        return;
                    }
                    const shouldRestoreAnalysisPosition = cardScope === "analysis";
                    if (shouldRestoreAnalysisPosition) {
                        rememberFullComparisonTablePosition(elements, state);
                    }
                    state.collapsedDecisionCards = toggleDecisionCardState(state.collapsedDecisionCards, cardKey);
                    if (cardScope === "analysis") {
                        selectFullComparisonRow(elements, state, cardKey, { persist: false });
                    }
                    const anchorSelector = cardScope === "analysis"
                        ? `[data-qc-analysis-card-key="${cssEscape(cardKey)}"]`
                        : `[data-qc-card-key="${cssEscape(cardKey)}"], [data-card-key="${cssEscape(cardKey)}"]`;
                    renderApp(elements, state, { preserveScroll: true, anchorSelector });
                    if (shouldRestoreAnalysisPosition) {
                        requestAnimationFrame(() => {
                            restoreFullComparisonTablePosition(elements, state);
                        });
                    }
                }
                return;
            }
            if (action === "set-analyze-tab") {
                const nextTab = actionTarget.dataset.tab === "full-table" ? "full-table" : "savings";
                state.activeAnalyzeTab = nextTab;
                if (nextTab === "full-table") {
                    state.showFullComparison = true;
                } else {
                    clearActiveProductFilterState(state);
                }
                renderApp(elements, state, { preserveScroll: true, anchorSelector: '[data-qc-anchor="opportunity-section"], [data-qc-anchor="full-comparison-section"]' });
                return;
            }
            if (action === "collapse-all-opportunity-tables") {
                state.collapsedDecisionCards = clearDecisionCardsForScope(state.collapsedDecisionCards, "spotlight");
                clearActiveProductFilterState(state);
                renderApp(elements, state, { preserveScroll: true, anchorSelector: '[data-qc-anchor="opportunity-section"]' });
                return;
            }
            if (action === "hide-opportunity-section") {
                state.showOpportunitySection = false;
                state.collapsedDecisionCards = clearDecisionCardsForScope(state.collapsedDecisionCards, "spotlight");
                clearActiveProductFilterState(state);
                renderApp(elements, state, { preserveScroll: true, anchorSelector: '[data-qc-anchor="opportunity-section"]' });
                return;
            }
            if (action === "toggle-opportunity-section") {
                state.showOpportunitySection = !state.showOpportunitySection;
                if (!state.showOpportunitySection) {
                    state.collapsedDecisionCards = clearDecisionCardsForScope(state.collapsedDecisionCards, "spotlight");
                    clearActiveProductFilterState(state);
                }
                renderApp(elements, state, { preserveScroll: true, anchorSelector: '[data-qc-anchor="opportunity-section"]' });
                return;
            }
            if (action === "hide-all-details") {
                clearActiveProductFilterState(state);
                state.collapsedDecisionCards = clearFullComparisonDetails(state.collapsedDecisionCards);
                renderApp(elements, state, { preserveScroll: true, anchorSelector: '[data-qc-anchor="full-comparison-section"]' });
                return;
            }
            if (action === "clear-analysis-search") {
                clearActiveProductFilterState(state);
                state.analysisViewport = { start: 0, end: 80, scrollTop: 0 };
                applyAnalysisTableFilter(elements, state);
                persistQuoteCompareSession(state, elements);
                return;
            }
            if (action === "toggle-full-comparison") {
                state.showFullComparison = !state.showFullComparison;
                state.activeAnalyzeTab = "full-table";
                renderApp(elements, state, { preserveScroll: true, anchorSelector: '[data-qc-anchor="full-comparison-section"]' });
                return;
            }
            if (action === "export-analysis-csv") {
                exportCurrentVisibleData(state, actionTarget.dataset.exportScope || "full-table");
                return;
            }
            if (action === "set-analysis-filter") {
                state.analysisTableFilter = actionTarget.dataset.filterValue || "all";
                if (state.analysisTableFilter === "all") {
                    clearActiveProductFilterState(state);
                }
                state.analysisViewport = { start: 0, end: 80, scrollTop: 0 };
                const scroller = elements.app?.querySelector(".qc2-analysis-table-scroll");
                if (scroller) scroller.scrollTop = 0;
                applyAnalysisTableFilter(elements, state);
                persistQuoteCompareSession(state, elements);
                return;
            }
            if (action === "sort-analysis-savings") {
                if (state.analysisTableSort?.key !== "savings") {
                    state.analysisTableSort = { key: "savings", direction: "desc" };
                } else if (state.analysisTableSort.direction === "desc") {
                    state.analysisTableSort = { key: "savings", direction: "asc" };
                } else {
                    state.analysisTableSort = { key: "", direction: "" };
                }
                state.analysisViewport = { start: 0, end: 80, scrollTop: 0 };
                const scroller = elements.app?.querySelector(".qc2-analysis-table-scroll");
                if (scroller) scroller.scrollTop = 0;
                applyAnalysisTableFilter(elements, state);
                persistQuoteCompareSession(state, elements);
                return;
            }
            if (action === "toggle-optimized-summary") {
                state.showOptimizedSummary = !state.showOptimizedSummary;
                renderApp(elements, state, { preserveScroll: true });
                return;
            }
            if (action === "load-more-opportunities") {
                state.opportunityRenderCount = Math.max(state.opportunityRenderCount || OPPORTUNITY_CARD_BATCH_SIZE, OPPORTUNITY_CARD_BATCH_SIZE) + OPPORTUNITY_CARD_BATCH_SIZE;
                renderApp(elements, state, { preserveScroll: true, anchorSelector: '[data-qc-anchor="opportunity-section"]' });
                return;
            }
            if (action === "go-history") {
                closeProductSummary(state);
                const targetCard = getAnalyzeHistoryTargetCard(state);
                rememberFullComparisonTablePosition(elements, state);
                state.previousAnalyzeTab = state.activeAnalyzeTab || "savings";
                initializeHistoryFilters(state);
                setStatus(
                    state,
                    targetCard?.productName
                        ? `Opening price history for ${targetCard.productName}.`
                        : "Opening price history for all products.",
                    "info"
                );
                await ensureHistoryComparisonsLoaded(state);
                if (targetCard?.productName) {
                    focusHistoryOnProductSeries(state, targetCard.productName, targetCard.unit || "");
                }
                state.currentScreen = "history";
                state.currentStep = 4;
                renderApp(elements, state);
                requestAnimationFrame(() => {
                    scrollHistorySectionIntoView(elements);
                });
                return;
            }
            if (action === "see-history-offers") {
                const productName = actionTarget.dataset.productName || "";
                const productUnit = actionTarget.dataset.productUnit || "";
                selectFullComparisonRow(
                    elements,
                    state,
                    actionTarget.closest("[data-qc-analysis-row]")?.dataset.qcAnalysisCardKey || state.selectedAnalysisRowKey
                );
                rememberFullComparisonTablePosition(elements, state);
                state.previousAnalyzeTab = state.activeAnalyzeTab || "full-table";
                initializeHistoryFilters(state);
                setStatus(state, `Opening price history for ${productName}.`, "info");
                await ensureHistoryComparisonsLoaded(state);
                focusHistoryOnProductSeries(state, productName, productUnit);
                state.currentScreen = "history";
                state.currentStep = 4;
                renderApp(elements, state);
                requestAnimationFrame(() => {
                    scrollHistorySectionIntoView(elements);
                });
                return;
            }
            if (action === "back-analyze") {
                state.currentScreen = "analyze";
                state.currentStep = 3;
                state.activeAnalyzeTab = state.previousAnalyzeTab || state.activeAnalyzeTab || "savings";
                const anchorSelector = state.activeAnalyzeTab === "full-table"
                    ? '[data-qc-anchor="full-comparison-section"]'
                    : '[data-qc-anchor="opportunity-section"]';
                renderApp(elements, state, { preserveScroll: true, anchorSelector });
                requestAnimationFrame(() => {
                    restoreFullComparisonTablePosition(elements, state);
                });
                return;
            }
        });

        elements.app.addEventListener("click", (event) => {
            setFullComparisonTableActiveState(elements, Boolean(event.target.closest(".qc2-analysis-table-frame")));
            const productSummaryClose = event.target.closest("[data-qc-product-summary-close]");
            if (productSummaryClose) {
                closeProductSummary(state);
                renderApp(elements, state, { preserveScroll: true });
                requestAnimationFrame(() => {
                    restoreFullComparisonTablePosition(elements, state);
                });
                return;
            }
            const selectedAnalysisRow = event.target.closest("[data-qc-analysis-card-key]");
            if (selectedAnalysisRow) {
                if (event.target.closest("[data-qc-action], button, a, input, select, textarea")) {
                    return;
                }
                selectFullComparisonRow(elements, state, selectedAnalysisRow.dataset.qcAnalysisCardKey || "", { toggle: true });
            }

            const historyDateClear = event.target.closest("[data-qc-history-date-clear]");
            if (historyDateClear) {
                const key = historyDateClear.dataset.qcHistoryDateClear;
                if (key === "dateFrom" || key === "dateTo") {
                    state.historyFilters[key] = "";
                    state.historyViewport = { start: 0, end: 120, scrollTop: 0 };
                    syncHistoryFilterDefaults(state);
                    clearHistorySelectedSeries(state);
                    closeHistoryDetailModal(state);
                    scheduleHistoryViewRefresh(elements, state);
                }
                return;
            }

            const historyComboboxToggle = event.target.closest("[data-qc-history-combobox-toggle]");
            if (historyComboboxToggle) {
                const key = historyComboboxToggle.dataset.qcHistoryComboboxToggle;
                const combobox = historyComboboxToggle.closest("[data-qc-history-combobox]");
                const isOpen = combobox?.classList.contains("is-open");
                if (isOpen) {
                    closeHistoryComboboxes(elements);
                } else {
                    openHistoryCombobox(elements, state, key);
                }
                return;
            }

            const historyOption = event.target.closest("[data-qc-history-filter-option]");
            if (historyOption) {
                const key = historyOption.dataset.qcHistoryFilterOption;
                if (key === "product") {
                    state.historyFocusedSeriesKey = "";
                }
                if ((historyOption.dataset.value || "") === "") {
                    state.historyFilters[key] = "";
                    state.historyFilterUi.selectedDisplayValues[key] = "";
                    state.historyFilterUi.queries[key] = "";
                    state.historyViewport = { start: 0, end: 120, scrollTop: 0 };
                    syncHistoryFilterDefaults(state);
                } else {
                    applyHistoryFilterValue(state, key, historyOption.dataset.value || "");
                }
                clearHistorySelectedSeries(state);
                closeHistoryDetailModal(state);
                scheduleHistoryViewRefresh(elements, state);
                return;
            }

            const historySortHeader = event.target.closest("[data-qc-history-sort-key]");
            if (historySortHeader) {
                if (state.historyDrag?.suppressClick) {
                    state.historyDrag.suppressClick = false;
                    return;
                }
                cycleHistorySort(state, historySortHeader.dataset.qcHistorySortKey || "");
                scheduleHistoryViewRefresh(elements, state);
                return;
            }

            const historyRow = event.target.closest("[data-qc-history-row]");
            if (historyRow) {
                const seriesKey = historyRow.dataset.qcHistorySeriesKey || "";
                const rowId = historyRow.dataset.qcHistoryRowId || "";
                if (isCompactTouchViewport()) {
                    const previousScrollTop = readScrollPosition(elements);
                    const previousTableScrollTop = getHistoryTableScroller(elements)?.scrollTop || 0;
                    const viewModel = getHistoryViewModel(state);
                    setHistorySelectedSeries(state, viewModel.filteredRows, seriesKey, rowId);
                    const fullSeriesRows = getHistoryFullSeriesRows(state, seriesKey);
                    openHistoryDetailModal(state, fullSeriesRows, true);
                    refreshHistoryView(elements, state);
                    restoreHistoryTablePosition(elements, previousScrollTop, previousTableScrollTop);
                    return;
                }
                if (state.historyRowClickTimer) {
                    clearTimeout(state.historyRowClickTimer);
                }
                state.historyRowClickTimer = setTimeout(() => {
                    const previousScrollTop = readScrollPosition(elements);
                    const previousTableScrollTop = getHistoryTableScroller(elements)?.scrollTop || 0;
                    const viewModel = getHistoryViewModel(state);
                    setHistorySelectedSeries(state, viewModel.filteredRows, seriesKey, rowId);
                    refreshHistoryView(elements, state);
                    requestAnimationFrame(() => {
                        writeScrollPosition(elements, previousScrollTop);
                        const nextTableScroller = getHistoryTableScroller(elements);
                        if (nextTableScroller) nextTableScroller.scrollTop = previousTableScrollTop;
                        if (shouldScrollToHistoryTrend(elements)) {
                            elements.app?.querySelector("[data-qc-history-trend-content]")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
                        }
                    });
                    state.historyRowClickTimer = null;
                }, 180);
                return;
            }

            const dateShell = event.target.closest("[data-date-shell]");
            if (dateShell && elements.app.contains(dateShell)) {
                const input = dateShell.querySelector('.date-input[type="date"]');
                if (!input) return;

                if (event.target === input) {
                    input.focus({ preventScroll: true });
                    return;
                }

                if (event.target.closest(".qc2-history-date-trigger")) {
                    event.preventDefault();
                    event.stopPropagation();
                    openDateInputPicker(input);
                    return;
                }

                openDateInputPicker(input);
                return;
            }

            if (!event.target.closest("[data-qc-history-combobox]")) {
                closeHistoryComboboxes(elements);
            }

            if (event.target.closest("[data-qc-history-detail-close]")) {
                const previousScrollTop = readScrollPosition(elements);
                const previousTableScrollTop = getHistoryTableScroller(elements)?.scrollTop || 0;
                closeHistoryDetailModal(state);
                refreshHistoryView(elements, state);
                restoreHistoryTablePosition(elements, previousScrollTop, previousTableScrollTop);
                return;
            }

            if (event.target.closest("[data-qc-history-suppliers-toggle]")) {
                state.historyDetailSuppliersExpanded = !state.historyDetailSuppliersExpanded;
                refreshHistoryView(elements, state);
            }
        });

        elements.app.addEventListener("change", async (event) => {
            const fileInput = event.target.closest("#qc2FileInput");
            if (fileInput) {
                const renderStartedAt = performance.now();
                const file = fileInput.files?.[0] || null;
                await parseSelectedFile(state, file);
                renderApp(elements, state);
                console.info("[compare prices upload render timing]", {
                    fileName: file?.name || "",
                    renderAfterInspectMs: Number((performance.now() - renderStartedAt).toFixed(1))
                });
                return;
            }

            const mappingSelect = event.target.closest("[data-qc-mapping-field]");
            if (mappingSelect) {
                state.selectedMappings[mappingSelect.dataset.qcMappingField] = mappingSelect.value || "";
                if (state.mappingReuseNotice) {
                    state.mappingReuseNotice = {
                        tone: "info",
                        message: "Column mappings updated. Review them before continuing."
                    };
                }
                computeValidation(state);
                renderApp(elements, state, { preserveScroll: true });
                return;
            }

            const historyFilter = event.target.closest("[data-qc-history-filter]");
            if (historyFilter) {
                const key = historyFilter.dataset.qcHistoryFilter;
                state.historyFilters[key] = historyFilter.value || "";
                state.historyViewport = { start: 0, end: 120, scrollTop: 0 };
                syncHistoryFilterDefaults(state);
                clearHistorySelectedSeries(state);
                closeHistoryDetailModal(state);
                scheduleHistoryViewRefresh(elements, state);
                return;
            }

            const historyColumnCheckbox = event.target.closest("[data-qc-history-column-toggle]");
            if (historyColumnCheckbox) {
                setHistoryColumnVisibility(
                    state,
                    historyColumnCheckbox.dataset.qcHistoryColumnToggle,
                    historyColumnCheckbox.checked
                );
                scheduleHistoryViewRefresh(elements, state);
                return;
            }

            const manualField = event.target.closest("[data-manual-field]");
            if (manualField) {
                const index = Number(manualField.dataset.index || -1);
                const field = manualField.dataset.manualField || "";
                if (index >= 0 && state.manualRows[index] && field) {
                    state.manualRows[index][field] = manualField.value;
                }
                persistQuoteCompareSession(state, elements);
                refreshManualDraftUi(elements, state, index);
            }
        });

        elements.app.addEventListener("input", (event) => {
            const historySearchInput = event.target.closest("[data-qc-history-filter-search]");
            if (historySearchInput) {
                const key = historySearchInput.dataset.qcHistoryFilterSearch;
                const combobox = historySearchInput.closest("[data-qc-history-combobox]");
                if (key && state.historyFilterUi?.queries) {
                    state.historyFilterUi.queries[key] = historySearchInput.value || "";
                }
                filterHistoryComboboxOptions(combobox, historySearchInput.value || "");
                return;
            }

            const searchInput = event.target.closest("[data-qc-analysis-search]");
            if (searchInput) {
                state.analysisTableSearch = searchInput.value || "";
                if (!String(state.analysisTableSearch || "").trim()) {
                    clearActiveProductFilterState(state);
                } else if (
                    state.activeProductFilter
                    && String(state.analysisTableSearch || "").trim().toLowerCase() !== String(state.activeProductFilter || "").trim().toLowerCase()
                ) {
                    state.activeProductFilter = null;
                    state.spotlightTableFilterKey = "";
                }
                scheduleAnalysisTableFilter(elements, state);
                return;
            }
            const manualField = event.target.closest("[data-manual-field]");
            if (!manualField) return;
            const index = Number(manualField.dataset.index || -1);
            const field = manualField.dataset.manualField || "";
            if (index >= 0 && state.manualRows[index] && field) {
                state.manualRows[index][field] = manualField.value;
            }
            persistQuoteCompareSession(state, elements);
            refreshManualDraftUi(elements, state, index);
        });

        elements.app.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && state.productSummaryModalOpen) {
                closeProductSummary(state);
                renderApp(elements, state, { preserveScroll: true });
                requestAnimationFrame(() => {
                    restoreFullComparisonTablePosition(elements, state);
                });
                return;
            }
            if (event.key === "Escape" && state.historyDetailModalOpen) {
                const previousScrollTop = readScrollPosition(elements);
                const previousTableScrollTop = getHistoryTableScroller(elements)?.scrollTop || 0;
                closeHistoryDetailModal(state);
                refreshHistoryView(elements, state);
                restoreHistoryTablePosition(elements, previousScrollTop, previousTableScrollTop);
                return;
            }

            const historySortHeader = event.target.closest("[data-qc-history-sort-key]");
            if (historySortHeader && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                cycleHistorySort(state, historySortHeader.dataset.qcHistorySortKey || "");
                scheduleHistoryViewRefresh(elements, state);
                return;
            }

            const historyRow = event.target.closest("[data-qc-history-row]");
            if (historyRow && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                const seriesKey = historyRow.dataset.qcHistorySeriesKey || "";
                const rowId = historyRow.dataset.qcHistoryRowId || "";
                const previousScrollTop = readScrollPosition(elements);
                const previousTableScrollTop = getHistoryTableScroller(elements)?.scrollTop || 0;
                const viewModel = getHistoryViewModel(state);
                if (event.key === "Enter" && state.historySelectedSeriesKey === seriesKey) {
                    const fullSeriesRows = getHistoryFullSeriesRows(state, seriesKey);
                    openHistoryDetailModal(state, fullSeriesRows, true);
                } else {
                    setHistorySelectedSeries(state, viewModel.filteredRows, seriesKey, rowId);
                }
                refreshHistoryView(elements, state);
                restoreHistoryTablePosition(elements, previousScrollTop, previousTableScrollTop);
                return;
            }

            const historySearchInput = event.target.closest("[data-qc-history-filter-search]");
            if (!historySearchInput) return;
            const combobox = historySearchInput.closest("[data-qc-history-combobox]");
            if (!combobox) return;

            if (event.key === "Escape") {
                closeHistoryComboboxes(elements);
                combobox.querySelector("[data-qc-history-combobox-toggle]")?.focus({ preventScroll: true });
                return;
            }

            if (event.key === "Enter") {
                event.preventDefault();
                const visibleOptions = Array.from(combobox.querySelectorAll("[data-qc-history-filter-option]"))
                    .filter((option) => option.style.display !== "none");
                const selectedOption = visibleOptions.find((option) => option.classList.contains("is-selected") && (option.dataset.value || ""));
                const firstValueOption = visibleOptions.find((option) => (option.dataset.value || ""));
                const firstVisibleOption = selectedOption || firstValueOption || visibleOptions[0];
                if (!firstVisibleOption) return;
                const optionKey = firstVisibleOption.dataset.qcHistoryFilterOption;
                const optionValue = firstVisibleOption.dataset.value || "";
                if (optionValue === "") {
                    state.historyFilters[optionKey] = "";
                    state.historyFilterUi.selectedDisplayValues[optionKey] = "";
                    state.historyFilterUi.queries[optionKey] = "";
                    state.historyViewport = { start: 0, end: 120, scrollTop: 0 };
                    syncHistoryFilterDefaults(state);
                } else {
                    applyHistoryFilterValue(state, optionKey, optionValue);
                }
                clearHistorySelectedSeries(state);
                closeHistoryDetailModal(state);
                scheduleHistoryViewRefresh(elements, state);
            }
        });

        elements.app.addEventListener("dragstart", (event) => {
            const historyHeader = event.target.closest("[data-qc-history-column-key]");
            if (!historyHeader) return;
            state.historyDrag = { key: historyHeader.dataset.qcHistoryColumnKey || "", suppressClick: false };
            if (event.dataTransfer) {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", state.historyDrag.key);
            }
        });

        elements.app.addEventListener("dragover", (event) => {
            const historyHeader = event.target.closest("[data-qc-history-column-key]");
            if (!historyHeader) return;
            event.preventDefault();
            if (event.dataTransfer) {
                event.dataTransfer.dropEffect = "move";
            }
        });

        elements.app.addEventListener("drop", (event) => {
            const historyHeader = event.target.closest("[data-qc-history-column-key]");
            if (!historyHeader) return;
            event.preventDefault();
            const draggedKey = state.historyDrag?.key || event.dataTransfer?.getData("text/plain") || "";
            const targetKey = historyHeader.dataset.qcHistoryColumnKey || "";
            if (moveHistoryColumn(state, draggedKey, targetKey)) {
                state.historyDrag = { key: "", suppressClick: true };
                scheduleHistoryViewRefresh(elements, state);
                return;
            }
            state.historyDrag = { key: "", suppressClick: false };
        });

        elements.app.addEventListener("dragend", () => {
            if (!state.historyDrag) return;
            state.historyDrag.key = "";
        });

        elements.app.addEventListener("dblclick", (event) => {
            if (isCompactTouchViewport()) return;
            const historyRow = event.target.closest("[data-qc-history-row]");
            if (!historyRow) return;
            if (state.historyRowClickTimer) {
                clearTimeout(state.historyRowClickTimer);
                state.historyRowClickTimer = null;
            }
            const seriesKey = historyRow.dataset.qcHistorySeriesKey || "";
            const rowId = historyRow.dataset.qcHistoryRowId || "";
            const previousScrollTop = readScrollPosition(elements);
            const previousTableScrollTop = getHistoryTableScroller(elements)?.scrollTop || 0;
            const viewModel = getHistoryViewModel(state);
            setHistorySelectedSeries(state, viewModel.filteredRows, seriesKey, rowId);
            const fullSeriesRows = getHistoryFullSeriesRows(state, seriesKey);
            openHistoryDetailModal(state, fullSeriesRows, true);
            refreshHistoryView(elements, state);
            restoreHistoryTablePosition(elements, previousScrollTop, previousTableScrollTop);
        });
    }

    function exposeApi(elements, state) {
        window.resetQuoteCompareToStep1 = function resetQuoteCompareToStep1() {
            setQuoteCompareReady(elements, false);
            resetQuoteCompareFrontendState(elements, state);
            setQuoteCompareReady(elements, true);
        };

        window.PriceAnalyzerQuoteCompare = {
            openStartAction(action) {
                state.currentScreen = action === "manual" ? "manual" : "upload";
                state.mode = action === "manual" ? "manual" : "upload";
                syncQuoteCompareStepState(state);
                renderApp(elements, state);
            },
            openUploadFilePicker() {
                state.currentScreen = "upload";
                syncQuoteCompareStepState(state);
                renderApp(elements, state);
                elements.app.querySelector("#qc2FileInput")?.click();
            },
            syncUploadFileName() {},
            continueUploadReview() {
                state.currentScreen = "review";
                state.currentStep = 2;
                renderApp(elements, state);
            },
            clearUploadFile() {
                parseSelectedFile(state, null).then(() => renderApp(elements, state));
            },
            addManualSupplier() {
                state.currentScreen = "manual";
                state.manualRows.push(createEmptyManualRow());
                syncQuoteCompareStepState(state);
                renderApp(elements, state);
            },
            saveManualProduct() {},
            addAnotherManualProduct() {
                state.currentScreen = "manual";
                state.manualRows.push(createEmptyManualRow());
                renderApp(elements, state);
            },
            continueManualReview() {
                try {
                    prepareManualDraftForReview(state);
                    state.lastFlowScreen = "manual";
                    state.currentScreen = "review";
                    renderApp(elements, state);
                } catch (error) {
                    setStatus(state, error.message, "error");
                    renderApp(elements, state);
                }
            },
            goToStart() {
                state.currentScreen = "start";
                state.currentStep = 1;
                renderApp(elements, state);
            }
        };
    }

    async function initQuoteCompare() {
        const initStartedAt = performance.now();
        const elements = getElements();
        if (!elements.shell || !elements.app) return;
        console.info("[compare prices init start]");
        setQuoteCompareReady(elements, false);
        const state = createState();
        let hardResetRequested = false;
        let initialScopePayload = null;
        let scopeBootstrapRequired = false;
        let scopeBootstrapDeferred = false;
        let bootstrapDependencyReason = "quote_compare_bootstrap_required";
        let firstVisibleLogged = false;
        let readyMarked = false;
        const forceStartHome = shouldForceQuoteCompareStart();
        const autoStartDemo = shouldAutoStartDemo();
        const demoEntryRequested = shouldOpenDemoEntry();
        const resumeRequested = shouldResumeQuoteCompareSession();
        const hasPersistedActiveSession = hasPersistedQuoteCompareActiveSession();
        const markFirstVisibleWithoutScope = () => {
            if (firstVisibleLogged) {
                return;
            }
            firstVisibleLogged = true;
            console.info("[PERF] quote_compare.init.first_visible_without_scope_ms", {
                durationMs: Number((performance.now() - initStartedAt).toFixed(1)),
                deferred: scopeBootstrapDeferred
            });
        };
        const renderVisibleState = () => {
            const renderStartedAt = performance.now();
            renderApp(elements, state);
            console.info("[compare prices initial render timing]", {
                currentScreen: state.currentScreen,
                durationMs: Number((performance.now() - renderStartedAt).toFixed(1))
            });
            requestAnimationFrame(() => {
                markFirstVisibleWithoutScope();
            });
        };
        try {
            hardResetRequested = Boolean(window.PriceAnalyzerBootGuard?.didHardReset?.());
            if (hardResetRequested || autoStartDemo || demoEntryRequested) {
                resetQuoteCompareUploadState(state);
            } else {
                restoreQuoteCompareSession(state);
                restoreHistoryUiPreferences(state);
                if (!hasRestorableQuoteCompareContext(state) && !resumeRequested && !hasPersistedActiveSession) {
                    clearPersistedQuoteCompareState();
                    resetQuoteCompareUploadState(state);
                }
            }
            bindEvents(elements, state);
            exposeApi(elements, state);
            elements.exitDemoButton?.addEventListener("click", () => {
                resetQuoteCompareUploadState(state);
                renderApp(elements, state);
                refreshSharedScopeSummaryCached(elements, state, { force: true }).catch(() => null);
            });

            if (hasRestorableAnalyzeContext(state)) {
                initialScopePayload = buildClientAnalysisScopePayload(state);
                writeSharedDataScope(state.demoMode ? "demo" : "current_upload", state.demoMode ? state.demoSessionId : state.activeSessionId);
                setCachedAnalysisScopeBootstrap(state.demoMode ? "demo" : "current_upload", initialScopePayload, state.demoMode ? state.demoSessionId : state.activeSessionId);
                applySharedScopeSummaryPayload(elements, state, initialScopePayload);
                scopeBootstrapDeferred = true;
                bootstrapDependencyReason = "restored_analyze_context";
            } else {
                scopeBootstrapDeferred = true;
                bootstrapDependencyReason = hasPersistedActiveSession
                    ? "awaiting_quote_compare_bootstrap"
                    : "deferred_scope_summary";
                updateCurrentFileSummary(elements, state);
                updateContinueAnalysisButton(elements, state);
            }

            console.info("[PERF] quote_compare.init.scope_bootstrap_required", {
                required: scopeBootstrapRequired,
                reason: scopeBootstrapDeferred ? "local_restore_scope_payload" : "no_restored_analyze_scope"
            });

            const canFastRenderRestoredState = !forceStartHome && hasRestorableQuoteCompareContext(state);
            if (canFastRenderRestoredState) {
                renderVisibleState();
                setQuoteCompareReady(elements, true);
                readyMarked = true;
            }

            const networkChainStartedAt = performance.now();
            await loadSavedComparisons(state, { includeComparisons: false });
            if (state.currentScreen === "history") {
                await ensureHistoryComparisonsLoaded(state);
            }
            console.info("[PERF] quote_compare.init.network_chain_ms", {
                durationMs: Number((performance.now() - networkChainStartedAt).toFixed(1)),
                currentScreen: state.currentScreen
            });

            if (state.currentScreen === "analyze" && hasRestorableAnalyzeContext(state)) {
                initialScopePayload = buildClientAnalysisScopePayload(state);
                setCachedAnalysisScopeBootstrap(state.demoMode ? "demo" : "current_upload", initialScopePayload, state.demoMode ? state.demoSessionId : state.activeSessionId);
                applySharedScopeSummaryPayload(elements, state, initialScopePayload);
                scopeBootstrapDeferred = true;
                bootstrapDependencyReason = "bootstrap_active_session_contains_step3";
            }
            console.info("[PERF] quote_compare.init.bootstrap_dependency_reason", {
                reason: bootstrapDependencyReason
            });
            if (forceStartHome) {
                closeProductSummary(state);
                closeHistoryDetailModal(state);
                state.currentScreen = "start";
                state.currentStep = 1;
                setStatus(state, "", "");
            }
            renderVisibleState();

            if (autoStartDemo && !hasRestorableAnalyzeContext(state)) {
                clearAutoStartDemoFlag();
                state.demoMode = true;
                state.dataScope = "demo";
                state.currentScreen = "review";
                state.mode = "upload";
                renderApp(elements, state);
                await triggerStep2StartAnalysis(elements, state);
            }

            if (demoEntryRequested && !autoStartDemo && !hasRestorableAnalyzeContext(state)) {
                clearDemoEntryFlag();
                enterDemoSafeStartState(state);
                renderApp(elements, state);
            }

            if (!forceStartHome && scopeBootstrapDeferred) {
                const shouldFetchDeferredScopeBootstrap = !(
                    initialScopePayload
                    && (state.currentScreen === "analyze" || state.currentScreen === "history")
                );
                if (shouldFetchDeferredScopeBootstrap) {
                    scheduleDeferredSharedScopeSummaryRefresh(elements, state, {
                        force: false,
                        reason: bootstrapDependencyReason
                    });
                } else {
                    console.info("[PERF] quote_compare.init.scope_bootstrap_deferred", {
                        reason: "skipped_after_local_scope_payload",
                        durationMs: 0,
                        hasActiveSessionId: Boolean(state.activeSessionId)
                    });
                }
            }

            if (state.currentScreen === "analyze" && state.isRestoringAnalyze) {
                requestAnimationFrame(() => {
                    logQuoteCompareRestore("quote_compare.restore.first_visible_paint", {
                        totalInitMs: Number((performance.now() - initStartedAt).toFixed(1)),
                        renderPassCount: state.renderPassCount,
                        restoreRenderPassCount: Number(state.restoreRenderPassCount || 0)
                    });
                    console.info("[compare prices step3 visible]", {
                        totalInitMs: Number((performance.now() - initStartedAt).toFixed(1)),
                        restoreRenderPassCount: Number(state.restoreRenderPassCount || 0)
                    });
                    requestAnimationFrame(() => {
                        scheduleRestoreAnalyzeDeferredRender(elements, state, initStartedAt);
                    });
                });
            }
            if (forceStartHome) {
                clearForcedQuoteCompareStartFlag();
            }
            if (resumeRequested) {
                clearQuoteCompareResumeFlag();
            }
            if (hardResetRequested) {
                writeScrollPosition(elements, 0);
            } else {
                restoreQuoteCompareScroll(elements);
            }
        } catch (error) {
            console.error("[compare prices init failed]", error);
            state.currentScreen = "start";
            state.lastFlowScreen = "review";
            state.status = {
                message: "Compare Prices could not restore the previous session. Starting a fresh workflow.",
                tone: "info"
            };
            renderApp(elements, state);
        } finally {
            if (!readyMarked) {
                setQuoteCompareReady(elements, true);
            }
            const totalInitMs = Number((performance.now() - initStartedAt).toFixed(1));
            console.info("[compare prices init end]", {
                currentScreen: state.currentScreen,
                totalInitMs
            });
            console.info("[PERF] quote_compare.init.total_init_ms", {
                durationMs: totalInitMs,
                currentScreen: state.currentScreen,
                scopeBootstrapDeferred
            });
        }

        const scrollContext = getScrollContext(elements);
        const scrollTarget = scrollContext.type === "element" ? scrollContext.target : window;
        scrollTarget.addEventListener("scroll", () => {
            scheduleQuoteCompareSessionPersist(state, elements);
        }, { passive: true });
        window.addEventListener("beforeunload", () => {
            window.clearTimeout(state.persistSessionTimer);
            clearQuoteComparePersistIdleHandle(state);
            persistQuoteCompareSession(state, elements);
        });

        window.addEventListener("shared-analysis-context-updated", async (event) => {
            if (event.detail?.scope && event.detail.scope !== (state.demoMode ? "demo" : "current_upload")) {
                return;
            }
            await refreshSharedScopeSummaryCached(elements, state, { scopePayload: event.detail?.scopePayload || null });
        });

        elements.app.addEventListener("focusin", (event) => {
            setFullComparisonTableActiveState(elements, Boolean(event.target.closest(".qc2-analysis-table-frame")));
        });

        elements.app.addEventListener("focusout", (event) => {
            if (!event.relatedTarget || !event.relatedTarget.closest?.(".qc2-analysis-table-frame")) {
                setFullComparisonTableActiveState(elements, false);
            }
        });

        document.addEventListener("mousedown", (event) => {
            if (!event.target.closest(".qc2-analysis-table-frame")) {
                setFullComparisonTableActiveState(elements, false);
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            initQuoteCompare();
        });
    } else {
        initQuoteCompare();
    }
})();

