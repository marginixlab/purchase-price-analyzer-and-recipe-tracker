(function () {
    const REQUIRED_FIELDS = ["Product Name", "Supplier", "Unit", "Quantity", "Unit Price", "Date"];
    const OPTIONAL_FIELDS = ["Total Price", "Currency", "Delivery Time", "Payment Terms", "Valid Until", "Notes"];
    const FIELD_HELP = {
        "Product Name": "Choose the product, item, material, or description column.",
        "Supplier": "Choose the supplier, vendor, company, or seller column.",
        "Unit": "Choose the purchase unit, UOM, pack, or package column.",
        "Quantity": "Choose the quoted quantity, qty, amount, or ordered quantity column.",
        "Unit Price": "Choose the unit price, price, cost, or rate column.",
        "Date": "Choose the quote, purchase, invoice, or transaction date column.",
        "Total Price": "Optional. Use this when the file already includes a line total.",
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

    function getElements() {
        return {
            workspace: document.getElementById("quoteCompareWorkspaceView"),
            shell: document.getElementById("quoteCompareShell"),
            app: document.getElementById("quoteCompareApp")
        };
    }

    function setQuoteCompareReady(elements, isReady) {
        if (!elements.workspace) return;
        elements.workspace.setAttribute("data-qc-ready", isReady ? "true" : "false");
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

    function buildPersistedState(state) {
        return {
            currentScreen: state.currentScreen,
            lastFlowScreen: state.lastFlowScreen,
            mode: state.mode,
            analyzeMode: state.analyzeMode,
            analysisResult: state.analysisResult,
            uploadReview: state.uploadReview,
            headers: state.headers,
            rows: state.rows,
            detectedMappings: state.detectedMappings,
            selectedMappings: state.selectedMappings,
            activeSessionId: state.activeSessionId,
            historyFilters: state.historyFilters,
            savedComparisons: state.savedComparisons,
            collapsedDecisionCards: state.collapsedDecisionCards,
            showFullComparison: state.showFullComparison,
            showOptimizedSummary: state.showOptimizedSummary,
            manualRows: state.manualRows,
            status: state.status
        };
    }

    function persistQuoteCompareSession(state, elements) {
        try {
            sessionStorage.setItem(QUOTE_COMPARE_STATE_KEY, JSON.stringify(buildPersistedState(state)));
            sessionStorage.setItem(QUOTE_COMPARE_SCROLL_KEY, JSON.stringify({ top: readScrollPosition(elements) }));
        } catch (error) {
            // Ignore storage failures.
        }
    }

    function clearPersistedQuoteCompareState() {
        try {
            sessionStorage.removeItem(QUOTE_COMPARE_ACTIVE_SESSION_KEY);
            sessionStorage.removeItem(QUOTE_COMPARE_STATE_KEY);
            sessionStorage.removeItem(QUOTE_COMPARE_SCROLL_KEY);
        } catch (error) {
            // Ignore storage failures.
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
        state.parseError = "";
        state.isParsing = false;
        state.isSubmitting = false;
        state.currentScreen = "start";
        state.lastFlowScreen = "review";
        clearPersistedQuoteCompareState();
        if (message) {
            setStatus(state, message, "info");
        }
    }

    function hydratePersistedState(state, snapshot) {
        if (!snapshot || typeof snapshot !== "object") return;
        state.currentScreen = snapshot.currentScreen || state.currentScreen;
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
        state.historyFilters = { ...state.historyFilters, ...(snapshot.historyFilters || {}) };
        state.savedComparisons = Array.isArray(snapshot.savedComparisons) ? snapshot.savedComparisons : state.savedComparisons;
        state.collapsedDecisionCards = snapshot.collapsedDecisionCards || state.collapsedDecisionCards;
        state.showFullComparison = Boolean(snapshot.showFullComparison);
        state.showOptimizedSummary = Boolean(snapshot.showOptimizedSummary);
        state.manualRows = Array.isArray(snapshot.manualRows) && snapshot.manualRows.length ? snapshot.manualRows : state.manualRows;
        state.status = snapshot.status || state.status;
    }

    function restoreQuoteCompareSession(state) {
        try {
            const snapshot = JSON.parse(sessionStorage.getItem(QUOTE_COMPARE_STATE_KEY) || "null");
            hydratePersistedState(state, snapshot);
        } catch (error) {
            // Ignore invalid session payloads.
        }
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
        return Boolean(
            activeSession
            && Array.isArray(activeSession.headers)
            && activeSession.headers.length
            && activeSession.dataframe
            && Array.isArray(activeSession.dataframe.columns)
            && activeSession.dataframe.columns.length
            && Array.isArray(activeSession.dataframe.records)
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
        try {
            return new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: currency || "USD",
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(numericValue);
        } catch (error) {
            return `$${numericValue.toFixed(2)}`;
        }
    }

    function formatPercent(value) {
        return `${Number(value || 0).toFixed(1)}%`;
    }

    function parseDateValue(value) {
        if (!value) return null;
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
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
            currentScreen: "start",
            lastFlowScreen: "review",
            mode: "upload",
            analyzeMode: "compare",
            file: null,
            headers: [],
            rows: [],
            detectedMappings: {},
            selectedMappings: {},
            validation: { mappedCount: 0, missingFields: [...REQUIRED_FIELDS], duplicateColumns: [], ready: false },
            analysisResult: null,
            uploadReview: null,
            activeSessionId: "",
            parseError: "",
            status: { message: "", tone: "" },
            isParsing: false,
            isSubmitting: false,
            isSaving: false,
            manualRows: [createEmptyManualRow()],
            savedComparisons: [],
            collapsedDecisionCards: {},
            showFullComparison: false,
            showOptimizedSummary: false,
            historyFilters: {
                product: "",
                supplier: "",
                dateFrom: "",
                dateTo: ""
            }
        };
    }

    async function fetchJson(url, options = {}) {
        const response = await fetch(url, {
            method: options.method || "GET",
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
        return data;
    }

    function setStatus(state, message = "", tone = "") {
        state.status = { message, tone };
    }

    function renderStatus(state) {
        if (!state.status.message) return "";
        return `<div class="recipe-status${state.status.tone ? ` is-${escapeHtml(state.status.tone)}` : ""}">${escapeHtml(state.status.message)}</div>`;
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
        computeValidation(state);
    }

    function initializeReviewState(state, payload) {
        state.uploadReview = payload;
        state.headers = payload.available_columns || payload.headers || [];
        state.detectedMappings = { ...(payload.mapping || {}) };
        applyAutoMappings(state);
    }

    async function inspectUpload(state) {
        if (!state.file) {
            setStatus(state, "Choose a supplier file before reviewing mappings.", "error");
            return false;
        }
        state.isParsing = true;
        state.parseError = "";
        setStatus(state, "Parsing uploaded headers and detecting likely matches.", "info");
        const formData = new FormData();
        formData.append("file", state.file);
        try {
            const data = await fetchJson("/quote-compare/upload/inspect", {
                method: "POST",
                body: formData
            });
            initializeReviewState(state, data);
            state.activeSessionId = data.session_id || "";
            if (state.activeSessionId) {
                sessionStorage.setItem(QUOTE_COMPARE_ACTIVE_SESSION_KEY, state.activeSessionId);
            }
            state.isParsing = false;
            setStatus(state, `Headers detected for ${state.file.name}.`, "success");
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
                helpText: FIELD_HELP[fieldName] || "Choose the matching column from the uploaded file.",
                detectedColumn,
                selectedColumn,
                detectedQuality: review.match_quality || (detectedColumn ? "possible" : "missing"),
                autoDetected: Boolean(selectedColumn && detectedColumn && selectedColumn === detectedColumn && isHighConfidenceReview(review)),
                required: REQUIRED_FIELDS.includes(fieldName)
            };
        });
    }

    function buildManualPayload(state) {
        const bids = state.manualRows
            .map((row) => ({
                supplier_name: String(row.supplier_name || "").trim(),
                product_name: String(row.product_name || "").trim(),
                unit: String(row.unit || "").trim(),
                quantity: Number(row.quantity || 0),
                unit_price: Number(row.unit_price || 0),
                total_price: row.total_price ? Number(row.total_price || 0) : null,
                quote_date: String(row.quote_date || "").trim() || null,
                currency: String(row.currency || "USD").trim() || "USD",
                delivery_time: String(row.delivery_time || "").trim(),
                payment_term: String(row.payment_term || "").trim(),
                valid_until: String(row.valid_until || "").trim() || null,
                notes: String(row.notes || "").trim() || null
            }))
            .filter((row) => row.product_name && row.supplier_name && row.unit && row.quantity > 0 && row.unit_price > 0);

        if (!bids.length) {
            throw new Error("Add at least one complete supplier offer before starting analysis.");
        }

        return {
            name: `Manual Quote Compare ${new Date().toLocaleDateString("en-US")}`,
            sourcing_need: "",
            source_type: "manual",
            bids,
            weighting: null
        };
    }

    function buildDecisionCards(comparison) {
        const bids = comparison?.bids || [];
        const grouped = new Map();

        bids.forEach((bid, index) => {
            const product = String(bid.product_name || "").trim();
            const unit = String(bid.unit || "").trim();
            if (!product) return;
            const key = `${product}__${unit}`;
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key).push({
                ...bid,
                _sourceIndex: index,
                quantity: Number(bid.quantity || 0),
                unit_price: Number(bid.unit_price || 0),
                total_price: Number(bid.total_price || 0) || Number(bid.quantity || 0) * Number(bid.unit_price || 0)
            });
        });

        return Array.from(grouped.values())
            .map((offers) => {
                const sortedOffers = [...offers].sort((left, right) => {
                    if (left.total_price !== right.total_price) return left.total_price - right.total_price;
                    if (left.unit_price !== right.unit_price) return left.unit_price - right.unit_price;
                    return String(left.supplier_name || "").localeCompare(String(right.supplier_name || ""));
                });
                const bestOffer = sortedOffers[0];

                const currentOffer = [...offers].sort((left, right) => {
                    const leftDate = parseDateValue(left.quote_date);
                    const rightDate = parseDateValue(right.quote_date);
                    if (leftDate && rightDate) return rightDate - leftDate;
                    if (leftDate) return -1;
                    if (rightDate) return 1;
                    return left._sourceIndex - right._sourceIndex;
                })[0];

                const savingsAmount = Math.max((currentOffer?.total_price || 0) - (bestOffer?.total_price || 0), 0);
                const savingsPercent = currentOffer?.total_price ? (savingsAmount / currentOffer.total_price) * 100 : 0;
                const isCurrentBest = Boolean(currentOffer && bestOffer) && (
                    currentOffer.supplier_name === bestOffer.supplier_name &&
                    currentOffer.total_price === bestOffer.total_price &&
                    currentOffer.unit_price === bestOffer.unit_price
                );

                return {
                    productName: currentOffer?.product_name || bestOffer?.product_name || "",
                    unit: currentOffer?.unit || bestOffer?.unit || "",
                    quantity: currentOffer?.quantity || bestOffer?.quantity || 0,
                    quoteDate: currentOffer?.quote_date || bestOffer?.quote_date || "",
                    currency: currentOffer?.currency || bestOffer?.currency || "USD",
                    currentOffer,
                    bestOffer,
                    offers: sortedOffers,
                    savingsAmount,
                    savingsPercent,
                    isCurrentBest,
                    decisionSentence: isCurrentBest
                        ? `Best current offer. ${currentOffer?.supplier_name || "Current supplier"} is already the strongest offer for this product.`
                        : `You were quoted by ${currentOffer?.supplier_name || "the current supplier"} at ${formatCurrency(currentOffer?.total_price || 0, currentOffer?.currency)}, but the best offer is ${bestOffer?.supplier_name || "the best supplier"} at ${formatCurrency(bestOffer?.total_price || 0, bestOffer?.currency)}. Potential savings: ${formatCurrency(savingsAmount, currentOffer?.currency)} (${formatPercent(savingsPercent)}).`
                };
            })
            .sort((left, right) => left.productName.localeCompare(right.productName));
    }

    function buildAnalyzeSummary(result) {
        const comparison = result?.comparison || { bids: [] };
        const bids = comparison.bids || [];
        const suppliers = new Set();
        const products = new Set();
        const decisionCards = buildDecisionCards(comparison);
        const productsWithSavings = decisionCards.filter((card) => !card.isCurrentBest && card.savingsAmount > 0).length;
        const totalVisibleSavings = decisionCards.reduce((sum, card) => sum + (card.isCurrentBest ? 0 : card.savingsAmount), 0);
        const currentSpend = decisionCards.reduce((sum, card) => sum + Number(card.currentOffer?.total_price || 0), 0);
        const optimizedSpend = decisionCards.reduce((sum, card) => sum + Number(card.bestOffer?.total_price || 0), 0);
        const optimizedSavings = Math.max(currentSpend - optimizedSpend, 0);
        const optimizedSavingsPercent = currentSpend ? (optimizedSavings / currentSpend) * 100 : 0;
        const optimizedRows = decisionCards.map((card) => ({
            productName: card.productName,
            selectedSupplier: card.bestOffer?.supplier_name || "",
            unitPrice: Number(card.bestOffer?.unit_price || 0),
            quantity: Number(card.bestOffer?.quantity || card.quantity || 0),
            totalPrice: Number(card.bestOffer?.total_price || 0),
            sourceType: comparison.source_type || "manual",
            quoteDate: card.bestOffer?.quote_date || card.quoteDate || "",
            currency: card.bestOffer?.currency || card.currency || "USD",
            chosenOffer: card.bestOffer,
            offers: card.offers || [],
            unit: card.unit || ""
        }));

        bids.forEach((bid) => {
            if (bid.supplier_name) suppliers.add(String(bid.supplier_name).trim());
            if (bid.product_name) products.add(`${String(bid.product_name).trim()}__${String(bid.unit || "").trim()}`);
        });

        return {
            rowCount: bids.length,
            supplierCount: suppliers.size,
            productCount: products.size,
            productsWithSavings,
            totalVisibleSavings,
            currentSpend,
            optimizedSpend,
            optimizedSavings,
            optimizedSavingsPercent,
            optimizedRows,
            decisionCards
        };
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

    function flattenHistoryRows(state) {
        return getHistoryComparisons(state).flatMap((comparison) => {
            const comparisonCreatedAt = comparison.created_at || comparison.updated_at || "";
            const comparisonSourceType = comparison.source_type || "manual";
            return (comparison.bids || []).map((bid, index) => {
                const quoteDate = bid.quote_date || bid.date || "";
                const effectiveDate = parseDateValue(quoteDate) || parseDateValue(comparisonCreatedAt);
                return {
                    historyId: `${comparison.comparison_id || "comparison"}-${index}`,
                    comparisonId: comparison.comparison_id || "",
                    comparisonName: comparison.name || "Saved quotes",
                    productName: String(bid.product_name || "").trim(),
                    supplier: String(bid.supplier_name || "").trim(),
                    unit: String(bid.unit || "").trim(),
                    quantity: Number(bid.quantity || 0),
                    unitPrice: Number(bid.unit_price || 0),
                    totalPrice: Number(bid.total_price || 0),
                    quoteDate,
                    currency: String(bid.currency || "USD").trim() || "USD",
                    sourceType: comparisonSourceType,
                    createdAt: comparisonCreatedAt,
                    effectiveDate,
                    effectiveTimestamp: effectiveDate ? effectiveDate.getTime() : 0
                };
            });
        }).filter((row) => row.productName);
    }

    function syncHistoryFilterDefaults(state) {
        const historyRows = flattenHistoryRows(state);
        const productOptions = Array.from(new Set(historyRows.map((row) => row.productName))).sort((left, right) => left.localeCompare(right));
        if (!state.historyFilters.product && productOptions.length) {
            state.historyFilters.product = productOptions[0];
        }
        const selectedProductRows = historyRows.filter((row) => !state.historyFilters.product || row.productName === state.historyFilters.product);
        const supplierOptions = Array.from(new Set(selectedProductRows.map((row) => row.supplier).filter(Boolean))).sort((left, right) => left.localeCompare(right));
        if (state.historyFilters.supplier && !supplierOptions.includes(state.historyFilters.supplier)) {
            state.historyFilters.supplier = "";
        }
    }

    function getFilteredHistoryRows(state) {
        syncHistoryFilterDefaults(state);
        const { product, supplier, dateFrom, dateTo } = state.historyFilters;
        const startDate = parseDateValue(dateFrom);
        const endDate = parseDateValue(dateTo);

        return flattenHistoryRows(state)
            .filter((row) => !product || row.productName === product)
            .filter((row) => !supplier || row.supplier === supplier)
            .filter((row) => {
                if (!startDate || !row.effectiveDate) return true;
                return row.effectiveDate >= startDate;
            })
            .filter((row) => {
                if (!endDate || !row.effectiveDate) return true;
                const inclusiveEnd = new Date(endDate);
                inclusiveEnd.setHours(23, 59, 59, 999);
                return row.effectiveDate <= inclusiveEnd;
            })
            .sort((left, right) => {
                if (left.effectiveTimestamp !== right.effectiveTimestamp) return left.effectiveTimestamp - right.effectiveTimestamp;
                return left.supplier.localeCompare(right.supplier);
            })
            .map((row, index, rows) => {
                const previous = rows[index - 1];
                const changeValue = previous ? row.unitPrice - previous.unitPrice : null;
                const changePercent = previous && previous.unitPrice ? (changeValue / previous.unitPrice) * 100 : null;
                return {
                    ...row,
                    changeValue,
                    changePercent
                };
            });
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

        const oldest = rows[0];
        const latest = rows[rows.length - 1];
        const prices = rows.map((row) => row.unitPrice).filter((value) => Number.isFinite(value));
        const minPrice = prices.length ? Math.min(...prices) : null;
        const maxPrice = prices.length ? Math.max(...prices) : null;
        const totalChange = latest.unitPrice - oldest.unitPrice;
        const totalChangePercent = oldest.unitPrice ? (totalChange / oldest.unitPrice) * 100 : null;

        return {
            latestPrice: latest.unitPrice,
            oldestPrice: oldest.unitPrice,
            minPrice,
            maxPrice,
            totalChange,
            totalChangePercent
        };
    }

    function initializeHistoryFilters(state) {
        syncHistoryFilterDefaults(state);
    }

    function hydrateComparisons(state, comparisons) {
        state.savedComparisons = Array.isArray(comparisons) ? comparisons : [];
        initializeHistoryFilters(state);
    }

    async function loadSavedComparisons(state) {
        try {
            const activeSessionId = state.activeSessionId || sessionStorage.getItem(QUOTE_COMPARE_ACTIVE_SESSION_KEY) || "";
            const persistedSelectedMappings = { ...(state.selectedMappings || {}) };
            const persistedCurrentScreen = state.currentScreen;
            if (activeSessionId) {
                state.activeSessionId = activeSessionId;
            }
            const query = activeSessionId ? `?session_id=${encodeURIComponent(activeSessionId)}` : "";
            const data = await fetchJson(`/quote-compare/bootstrap${query}`);
            hydrateComparisons(state, data.comparisons || []);
            if (activeSessionId && !data.active_session) {
                resetQuoteCompareUploadState(
                    state,
                    "Your last upload session could not be recovered. Please upload the file again."
                );
                return;
            }
            if (!data.active_session) {
                if (["review", "analyze", "history"].includes(persistedCurrentScreen)) {
                    resetQuoteCompareUploadState(state);
                }
                return;
            }

            const activeSession = data.active_session;
            const canRestoreAnalyze = isValidRestorableAnalyzeSession(activeSession);
            const canRestoreReview = activeSession.step === "review" && isValidRestorableReviewSession(activeSession);
            if (!canRestoreReview && !canRestoreAnalyze) {
                resetQuoteCompareUploadState(
                    state,
                    "Your last upload session is incomplete. Please upload the file again."
                );
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
                state.analysisResult = {
                    comparison: activeSession.comparison,
                    evaluation: activeSession.evaluation,
                    summary: buildAnalyzeSummary({ comparison: activeSession.comparison })
                };
                state.rows = activeSession.comparison?.bids || [];
                state.currentScreen = persistedCurrentScreen === "history" ? "history" : "analyze";
                return;
            }

            state.analysisResult = null;
            state.rows = [];
            state.currentScreen = "review";
        } catch (error) {
            resetQuoteCompareUploadState(
                state,
                "Your last upload session could not be restored. Please upload the file again."
            );
        }
    }

    function renderQcStart() {
        return `
            <section class="qc2-screen qc2-screen-start">
                <div class="qc2-head">
                    <div class="panel-label">Quote Compare</div>
                    <h2 class="qc2-title">Choose how you want to begin</h2>
                    <p class="qc2-copy">Upload a supplier file for column review or enter supplier offers manually when you need a quick buying decision.</p>
                </div>
                <div class="qc2-choice-grid">
                    <button type="button" class="qc2-choice-card" data-qc-action="start-upload">
                        <span class="qc2-choice-title">Upload Supplier File</span>
                        <span class="qc2-choice-copy">Parse one CSV or Excel file, review the detected mappings, and move straight into analysis.</span>
                    </button>
                    <button type="button" class="qc2-choice-card qc2-choice-card-secondary" data-qc-action="start-manual">
                        <span class="qc2-choice-title">Enter Supplier Offers Manually</span>
                        <span class="qc2-choice-copy">Add supplier offers row by row when quotes arrive outside a spreadsheet.</span>
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
                        <h2 class="qc2-title">Upload supplier file</h2>
                        <p class="qc2-copy">Upload one supplier quote file, check the detected columns, and move into quote review with a clean structured file.</p>
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

    function renderManualDateInput(index, value) {
        return `
            <div class="recipe-field">
                <span class="recipe-field-label">Quote Date</span>
                <div class="date-input-inline ${value ? "has-value" : ""}">
                    <span class="date-input-empty">Select quote date</span>
                    <input class="date-input" type="date" data-manual-field="quote_date" data-index="${index}" value="${escapeHtml(value)}" aria-label="Quote Date">
                </div>
            </div>
        `;
    }

    function renderManualRow(row, index) {
        return `
            <div class="qc2-manual-row" data-manual-row="${index}">
                <label class="recipe-field"><span class="recipe-field-label">Product Name</span><input class="recipe-input" data-manual-field="product_name" data-index="${index}" value="${escapeHtml(row.product_name)}"></label>
                <label class="recipe-field"><span class="recipe-field-label">Supplier</span><input class="recipe-input" data-manual-field="supplier_name" data-index="${index}" value="${escapeHtml(row.supplier_name)}"></label>
                <label class="recipe-field"><span class="recipe-field-label">Unit</span><input class="recipe-input" data-manual-field="unit" data-index="${index}" value="${escapeHtml(row.unit)}"></label>
                <label class="recipe-field"><span class="recipe-field-label">Quantity</span><input class="recipe-input" type="number" min="0" step="0.01" data-manual-field="quantity" data-index="${index}" value="${escapeHtml(row.quantity)}"></label>
                <label class="recipe-field"><span class="recipe-field-label">Unit Price</span><input class="recipe-input" type="number" min="0" step="0.01" data-manual-field="unit_price" data-index="${index}" value="${escapeHtml(row.unit_price)}"></label>
                ${renderManualDateInput(index, row.quote_date)}
                <button type="button" class="secondary-btn qc2-remove-row" data-qc-action="remove-manual-row" data-index="${index}" ${index === 0 ? "disabled" : ""}>Remove</button>
            </div>
        `;
    }

    function renderQcManual(state) {
        return `
            <section class="qc2-screen qc2-screen-manual">
                <div class="qc2-card">
                    <div class="qc2-head qc2-head-compact">
                        <div class="upload-step">Manual Entry</div>
                        <h2 class="qc2-title">Enter supplier offers manually</h2>
                        <p class="qc2-copy">Capture supplier rows directly when quotes arrive by email, message, or a non-standard format.</p>
                    </div>
                    <div class="qc2-manual-list">
                        ${state.manualRows.map(renderManualRow).join("")}
                    </div>
                    ${renderStatus(state)}
                    <div class="qc2-actions">
                        <button type="button" class="secondary-btn" data-qc-action="back-start">Back</button>
                        <button type="button" class="secondary-btn" data-qc-action="add-manual-row">Add Row</button>
                        <button type="button" class="action-btn" data-qc-action="manual-analyze">Start Analysis</button>
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
                <div class="mapping-field-label">
                    <div class="qc2-review-field-head">
                        <div class="mapping-field-title">${escapeHtml(row.fieldName)}</div>
                        ${!row.required ? '<span class="qc2-optional-badge">Optional</span>' : ""}
                        ${row.autoDetected ? '<span class="qc2-detected-badge">Auto-detected</span>' : ""}
                    </div>
                    <div class="mapping-field-help">${escapeHtml(FIELD_HELP[row.fieldName] || "")}</div>
                    ${duplicateNote ? `<div class="qc2-inline-error">${escapeHtml(duplicateNote)}</div>` : ""}
                    ${row.required && !row.selectedColumn ? '<div class="qc2-inline-error">This required field still needs a unique column.</div>' : ""}
                </div>
                <div class="mapping-select-shell">
                    <select class="mapping-select" data-qc-mapping-field="${escapeHtml(row.fieldName)}">
                        <option value="">Choose a column</option>
                        ${row.options.map((option) => `<option value="${escapeHtml(option.value)}" ${option.value === row.selectedColumn ? "selected" : ""} ${option.disabled ? "disabled" : ""}>${escapeHtml(option.value)}${option.disabled ? " (Already used)" : ""}</option>`).join("")}
                    </select>
                </div>
                <span class="mapping-status ${statusClass}">${escapeHtml(statusText)}</span>
            </div>
        `;
    }

    function renderQcReview(state) {
        const rows = getReviewRows(state).map((row) => ({ ...row, options: buildMappingOptions(state, row) }));
        const requiredRows = rows.filter((row) => row.required);
        const optionalRows = rows.filter((row) => !row.required);
        const duplicateColumns = state.validation.duplicateColumns.map((item) => item.columnName);
        const duplicateText = state.validation.duplicateColumns.map((item) => `"${item.columnName}" is assigned to ${item.fieldNames.join(", ")}.`).join(" ");
        const missingText = state.validation.missingFields.length ? `Map the remaining required fields: ${state.validation.missingFields.join(", ")}.` : "";

        return `
            <section class="qc2-screen qc2-screen-review">
                <div class="mapping-review-panel qc2-review-panel">
                    <div class="mapping-review-head">
                        <div>
                            <div class="upload-step">Step 2</div>
                            <h2 class="mapping-review-title">Review your column matches</h2>
                            <p class="mapping-review-copy">Confirm each required field, adjust anything that was matched incorrectly, and start analysis only when the mapping is complete.</p>
                        </div>
                        <div class="mapping-summary-chips">
                            <span class="mapping-summary-chip">${state.validation.mappedCount} of ${REQUIRED_FIELDS.length} required fields mapped</span>
                            <span class="mapping-summary-chip ${state.validation.ready ? "" : "is-warning"}">${state.validation.ready ? "Ready for analysis" : "Incomplete mapping"}</span>
                        </div>
                    </div>
                    <div class="mapping-alert mapping-alert-info">${escapeHtml(state.file?.name || state.uploadReview?.filename || "Uploaded file")}</div>
                    <div class="mapping-toolbar">
                        <div class="mapping-toolbar-copy">Required fields come first. Each uploaded column can be assigned only once.</div>
                        <div class="mapping-toolbar-actions">
                            <button type="button" class="secondary-btn mapping-toolbar-btn" data-qc-action="auto-map">Auto-map detected columns</button>
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
                                <div class="mapping-section-copy">Use these only when totals, payment terms, delivery timing, or notes should influence the sourcing decision.</div>
                            </div>
                        </div>
                        <div class="mapping-grid">
                            ${optionalRows.map((row) => renderMappingRow(row, duplicateColumns)).join("") || '<div class="decision-list-empty">No optional fields were detected for this upload.</div>'}
                        </div>
                    </section>
                    ${missingText || duplicateText ? `<div class="mapping-alert mapping-alert-error">${escapeHtml(`${missingText} ${duplicateText}`.trim())}</div>` : ""}
                    ${renderStatus(state)}
                    <div class="qc2-actions">
                        <button type="button" class="secondary-btn" data-qc-action="back-upload">Back</button>
                        <button type="button" class="action-btn" data-qc-action="start-analysis" ${state.validation.ready ? "" : "disabled"}>Start Analysis</button>
                    </div>
                </div>
            </section>
        `;
    }

    function getDecisionCardKey(card) {
        return `${card.productName}__${card.unit}__${card.currentOffer?.supplier_name || ""}__${card.bestOffer?.supplier_name || ""}`;
    }

    function getOpportunityCardTheme(index) {
        return OPPORTUNITY_CARD_PALETTE[index % OPPORTUNITY_CARD_PALETTE.length];
    }

    function renderDecisionSpotlightCards(cards, state) {
        if (!cards.length) {
            return '<div class="decision-list-empty">No savings opportunities are visible in the current quote set.</div>';
        }
        return `
            <div class="qc2-spotlight-panel">
                <div class="qc2-spotlight-panel-scroll">
                    <div class="qc2-spotlight-grid">
                ${cards.map((card, index) => {
                    const theme = getOpportunityCardTheme(index);
                    const cardKey = getDecisionCardKey(card);
                    const isExpanded = Boolean(state.collapsedDecisionCards[cardKey]);
                    return `
                        <article
                            class="qc2-spotlight-card ${isExpanded ? "is-expanded" : ""}"
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
                                    <div class="qc2-spotlight-meta">${escapeHtml(card.unit || "Unit not provided")} | Qty ${escapeHtml(String(card.quantity || 0))}</div>
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
                                    <div class="qc2-spotlight-savings-copy">${escapeHtml(formatPercent(card.savingsPercent))} lower total</div>
                                </div>
                                <button type="button" class="secondary-btn qc2-collapse-btn" data-qc-action="toggle-decision-card" data-card-key="${escapeHtml(cardKey)}" aria-expanded="${isExpanded ? "true" : "false"}">
                                    ${isExpanded ? "Hide details" : "View details"}
                                </button>
                            </div>
                            <div class="qc2-spotlight-decision">Switch from ${escapeHtml(card.currentOffer?.supplier_name || "the current supplier")} to ${escapeHtml(card.bestOffer?.supplier_name || "the recommended supplier")} to save ${escapeHtml(formatCurrency(card.savingsAmount, card.currency))}.</div>
                            <div class="qc2-spotlight-detail">
                                <div class="qc2-analysis-detail-grid">
                                    <div class="qc2-analysis-detail-item">
                                        <span class="qc2-analysis-detail-label">Current Offer</span>
                                        <span class="qc2-analysis-detail-value">${escapeHtml(card.currentOffer?.supplier_name || "Supplier missing")} | ${escapeHtml(formatCurrency(card.currentOffer?.unit_price || 0, card.currency))} unit | ${escapeHtml(formatDate(card.quoteDate))}</span>
                                    </div>
                                    <div class="qc2-analysis-detail-item is-highlighted">
                                        <span class="qc2-analysis-detail-label">Recommended Offer</span>
                                        <span class="qc2-analysis-detail-value">${escapeHtml(card.bestOffer?.supplier_name || "Supplier missing")} | ${escapeHtml(formatCurrency(card.bestOffer?.unit_price || 0, card.currency))} unit | ${escapeHtml(formatDate(card.bestOffer?.quote_date || card.quoteDate))}</span>
                                    </div>
                                    <div class="qc2-analysis-detail-item">
                                        <span class="qc2-analysis-detail-label">Decision Guidance</span>
                                        <span class="qc2-analysis-detail-value">${escapeHtml(card.decisionSentence)}</span>
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

    function renderAnalyzeRows(cards, state) {
        if (!cards.length) {
            return '<div class="decision-list-empty">No supplier rows were available for comparison.</div>';
        }
        return `
            <div class="qc2-analysis-table">
                <div class="qc2-analysis-table-head">
                    <span>Product</span>
                    <span>Current Supplier</span>
                    <span>Current Price</span>
                    <span>Best Supplier</span>
                    <span>Best Price</span>
                    <span>Savings</span>
                    <span>Result</span>
                    <span class="qc2-analysis-expand-col">Details</span>
                </div>
                ${cards.map((card) => {
                    const cardKey = getDecisionCardKey(card);
                    const isExpanded = Boolean(state.collapsedDecisionCards[cardKey]);
                    return `
                    <article class="qc2-analysis-row ${isExpanded ? "is-expanded" : ""}">
                        <div class="qc2-analysis-row-main">
                            <div class="qc2-analysis-cell">
                                <div class="qc2-analysis-product">${escapeHtml(card.productName)}</div>
                                <div class="qc2-analysis-sub">${escapeHtml(card.unit || "Unit not provided")} | Qty ${escapeHtml(String(card.quantity || 0))}</div>
                            </div>
                            <div class="qc2-analysis-cell">
                                <div class="qc2-analysis-value">${escapeHtml(card.currentOffer?.supplier_name || "Supplier missing")}</div>
                                <div class="qc2-analysis-sub">${escapeHtml(formatDate(card.quoteDate))}</div>
                            </div>
                            <div class="qc2-analysis-cell">
                                <div class="qc2-analysis-value">${escapeHtml(formatCurrency(card.currentOffer?.total_price || 0, card.currency))}</div>
                                <div class="qc2-analysis-sub">${escapeHtml(formatCurrency(card.currentOffer?.unit_price || 0, card.currency))} unit</div>
                            </div>
                            <div class="qc2-analysis-cell">
                                <div class="qc2-analysis-value">${escapeHtml(card.bestOffer?.supplier_name || "Supplier missing")}</div>
                                <div class="qc2-analysis-sub">${escapeHtml(card.bestOffer?.payment_term || "Best price reference")}</div>
                            </div>
                            <div class="qc2-analysis-cell">
                                <div class="qc2-analysis-value">${escapeHtml(formatCurrency(card.bestOffer?.total_price || 0, card.currency))}</div>
                                <div class="qc2-analysis-sub">${escapeHtml(formatCurrency(card.bestOffer?.unit_price || 0, card.currency))} unit</div>
                            </div>
                            <div class="qc2-analysis-cell">
                                <div class="qc2-analysis-savings ${card.isCurrentBest ? "is-neutral" : ""}">${card.isCurrentBest ? "Best current offer" : escapeHtml(formatCurrency(card.savingsAmount, card.currency))}</div>
                                <div class="qc2-analysis-sub">${card.isCurrentBest ? "No lower offer visible" : escapeHtml(formatPercent(card.savingsPercent))}</div>
                            </div>
                            <div class="qc2-analysis-cell">
                                <span class="qc2-analysis-result ${card.isCurrentBest ? "is-best" : "is-opportunity"}">${card.isCurrentBest ? "Already best" : "Savings available"}</span>
                            </div>
                            <div class="qc2-analysis-cell qc2-analysis-cell-expand">
                                <button type="button" class="secondary-btn qc2-collapse-btn" data-qc-action="toggle-decision-card" data-card-key="${escapeHtml(cardKey)}" aria-expanded="${isExpanded ? "true" : "false"}">
                                    ${isExpanded ? "Hide" : "View"}
                                </button>
                            </div>
                        </div>
                        <div class="qc2-analysis-row-detail">
                            <div class="qc2-analysis-detail-grid">
                                <div class="qc2-analysis-detail-item">
                                    <span class="qc2-analysis-detail-label">Quote Date</span>
                                    <span class="qc2-analysis-detail-value">${escapeHtml(formatDate(card.quoteDate))}</span>
                                </div>
                                <div class="qc2-analysis-detail-item">
                                    <span class="qc2-analysis-detail-label">Current Offer</span>
                                    <span class="qc2-analysis-detail-value">${escapeHtml(card.currentOffer?.supplier_name || "Supplier missing")} | ${escapeHtml(formatCurrency(card.currentOffer?.unit_price || 0, card.currency))} unit</span>
                                </div>
                                <div class="qc2-analysis-detail-item">
                                    <span class="qc2-analysis-detail-label">Best Offer</span>
                                    <span class="qc2-analysis-detail-value">${escapeHtml(card.bestOffer?.supplier_name || "Supplier missing")} | ${escapeHtml(formatCurrency(card.bestOffer?.unit_price || 0, card.currency))} unit</span>
                                </div>
                            </div>
                            <div class="qc2-analysis-detail-note">${escapeHtml(card.decisionSentence)}</div>
                        </div>
                    </article>
                `;
                }).join("")}
            </div>
        `;
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
                    <span>Quote Date</span>
                    <span class="qc2-analysis-expand-col">Details</span>
                </div>
                ${rows.map((row) => {
                    const rowKey = `${row.productName}__${row.unit}__${row.selectedSupplier}`;
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
                                <div class="qc2-analysis-sub">Best visible offer</div>
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
                                    ${isExpanded ? "Hide" : "View"}
                                </button>
                            </div>
                        </div>
                        <div class="qc2-analysis-row-detail">
                            <div class="qc2-analysis-detail-grid">
                                ${(row.offers || []).map((offer) => `
                                    <div class="qc2-analysis-detail-item ${offer.supplier_name === row.selectedSupplier && Number(offer.total_price || 0) === Number(row.totalPrice || 0) ? "is-highlighted" : ""}">
                                        <span class="qc2-analysis-detail-label">${escapeHtml(offer.supplier_name || "Supplier missing")}</span>
                                        <span class="qc2-analysis-detail-value">${escapeHtml(formatCurrency(offer.total_price || 0, offer.currency || row.currency))} | ${escapeHtml(formatCurrency(offer.unit_price || 0, offer.currency || row.currency))} unit | ${escapeHtml(formatDate(offer.quote_date))}</span>
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
        const result = state.analysisResult || { comparison: { bids: [] }, evaluation: null, summary: { rowCount: 0, supplierCount: 0, productCount: 0, productsWithSavings: 0, totalVisibleSavings: 0, currentSpend: 0, optimizedSpend: 0, optimizedSavings: 0, optimizedSavingsPercent: 0, optimizedRows: [], decisionCards: [] } };
        const summary = result.summary || buildAnalyzeSummary(result);
        const decisionCards = summary.decisionCards || [];
        const opportunityCards = decisionCards
            .filter((card) => !card.isCurrentBest && card.savingsAmount > 0)
            .sort((left, right) => right.savingsAmount - left.savingsAmount)
            .slice(0, 12);
        const alreadyBestCards = decisionCards.filter((card) => card.isCurrentBest || card.savingsAmount <= 0);
        const comparisonCurrency = result.comparison?.bids?.[0]?.currency || "USD";
        return `
            <section class="qc2-screen qc2-screen-analyze" id="qc2AnalysisTop">
                <div class="qc2-card qc2-analyze-card">
                    <div class="qc2-head qc2-head-compact qc2-analyze-head">
                        <div class="qc2-head-shell">
                            <div class="qc2-head-copy">
                                <div class="upload-step">Step 3</div>
                                <h2 class="qc2-title">Procurement decision screen</h2>
                                <p class="qc2-copy">See where action is required first, quantify the savings, and only dive into the full comparison when you need more detail.</p>
                            </div>
                        </div>
                    </div>
                    <div class="qc2-analyze-toolbar">
                        <div class="qc2-mode-pill" aria-label="Analyze mode">Compare Mode</div>
                    </div>
                    <div class="qc2-summary-grid qc2-summary-grid-compact qc2-summary-grid-hero">
                        <article class="summary-card qc2-summary-card-compact"><div class="summary-card-title">Products analyzed</div><div class="summary-card-value compact">${summary.productCount}</div><div class="summary-card-insight">Visible product groups in this analysis.</div></article>
                        <article class="summary-card qc2-summary-card-compact"><div class="summary-card-title">Suppliers compared</div><div class="summary-card-value compact">${summary.supplierCount}</div><div class="summary-card-insight">Unique suppliers in the imported quotes.</div></article>
                        <article class="summary-card qc2-summary-card-compact"><div class="summary-card-title">Savings opportunities</div><div class="summary-card-value compact">${summary.productsWithSavings}</div><div class="summary-card-insight">Products where a better supplier is visible.</div></article>
                        <article class="summary-card qc2-summary-card-compact is-savings"><div class="summary-card-title">Total potential savings</div><div class="summary-card-value compact">${escapeHtml(formatCurrency(summary.totalVisibleSavings || 0, comparisonCurrency))}</div><div class="summary-card-insight">Immediate savings visible in the imported quotes.</div></article>
                    </div>
                    <section class="qc2-analysis-block qc2-analysis-block-primary">
                        <div class="mapping-section-head">
                            <div>
                                <div class="mapping-section-title">Top savings opportunities</div>
                                <div class="mapping-section-copy">Review the supplier switches with the biggest savings impact first.</div>
                            </div>
                        </div>
                        ${renderDecisionSpotlightCards(opportunityCards, state)}
                    </section>
                    <section class="qc2-analysis-block qc2-analysis-block-secondary">
                        <button type="button" class="qc2-collapsible-summary" data-qc-action="toggle-optimized-summary" aria-expanded="${state.showOptimizedSummary ? "true" : "false"}">
                            <span class="qc2-collapsible-summary-copy">${alreadyBestCards.length} products already best-priced</span>
                            <span class="qc2-collapsible-summary-action">${state.showOptimizedSummary ? "Hide" : "View"}</span>
                        </button>
                        ${state.showOptimizedSummary ? `
                            <div class="qc2-best-panel">
                                <div class="qc2-best-panel-scroll">
                                    <div class="qc2-best-grid">
                                ${alreadyBestCards.slice(0, 24).map((card, index) => {
                                    const theme = getOpportunityCardTheme(index);
                                    return `
                                    <article
                                        class="qc2-best-card"
                                        style="
                                            --qc2-best-card-border:${theme.border};
                                            --qc2-best-card-glow:${theme.glow};
                                            --qc2-best-card-accent:${theme.badgeBg};
                                            --qc2-best-card-text:${theme.badgeText};
                                        "
                                    >
                                        <div class="qc2-best-title">${escapeHtml(card.productName)}</div>
                                        <div class="qc2-best-copy">${escapeHtml(card.currentOffer?.supplier_name || "Supplier missing")} is already the best visible offer at ${escapeHtml(formatCurrency(card.currentOffer?.total_price || 0, card.currency))}.</div>
                                    </article>
                                `;
                                }).join("")}
                                    </div>
                                </div>
                            </div>
                        ` : ""}
                    </section>
                    <section class="qc2-analysis-block qc2-analysis-block-advanced">
                        <button type="button" class="qc2-collapsible-summary" data-qc-action="toggle-full-comparison" aria-expanded="${state.showFullComparison ? "true" : "false"}">
                            <span class="qc2-collapsible-summary-copy">View full comparison</span>
                            <span class="qc2-collapsible-summary-action">${state.showFullComparison ? "Hide table" : "Open table"}</span>
                        </button>
                        ${state.showFullComparison ? `
                            <div class="mapping-section-head"><div><div class="mapping-section-title">Full comparison table</div><div class="mapping-section-copy">Complete product comparison with all visible rows and detail toggles.</div></div></div>
                            <div class="qc2-analysis-table-frame">
                                <div class="qc2-analysis-table-scroll">
                                    ${renderAnalyzeRows(summary.decisionCards, state)}
                                </div>
                            </div>
                        ` : ""}
                    </section>
                    ${renderStatus(state)}
                    <div class="qc2-actions qc2-analyze-actions" id="qc2AnalysisLower">
                        <div class="qc2-analyze-actions-slot is-left">
                            <button type="button" class="secondary-btn" data-qc-action="back-review">Back to Review</button>
                        </div>
                        <div class="qc2-analyze-actions-slot is-center">
                            <button type="button" class="secondary-btn" data-qc-action="save-quotes" ${state.isSaving ? "disabled" : ""}>${state.isSaving ? "Saving Quotes..." : "Save Quotes"}</button>
                        </div>
                        <div class="qc2-analyze-actions-slot is-right">
                            <button type="button" class="action-btn" data-qc-action="go-history">Product History</button>
                        </div>
                    </div>
                </div>
            </section>
        `;
    }

    function renderHistoryTrend(rows) {
        if (!rows.length) {
            return '<div class="decision-list-empty">Save supplier quotes to start building product history.</div>';
        }
        const prices = rows.map((row) => row.unitPrice);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const range = maxPrice - minPrice;
        const minBarWidth = 18;
        const equalBarWidth = 70;
        return `
            <div class="qc2-trend-list">
                ${rows.map((row) => {
                    const normalizedWidth = range === 0
                        ? equalBarWidth
                        : minBarWidth + (((row.unitPrice - minPrice) / range) * (100 - minBarWidth));
                    const directionClass = row.changeValue == null ? "neutral" : row.changeValue > 0 ? "negative" : row.changeValue < 0 ? "positive" : "neutral";
                    return `
                        <div class="qc2-trend-row">
                            <div class="qc2-trend-meta">
                                <span>${escapeHtml(formatDate(row.quoteDate || row.createdAt))}</span>
                                <span>${escapeHtml(row.supplier || "Supplier missing")}</span>
                            </div>
                            <div class="qc2-trend-bar-shell">
                                <div class="qc2-trend-bar-track">
                                    <div class="qc2-trend-bar is-${directionClass}" style="width:${normalizedWidth}%"></div>
                                </div>
                            </div>
                            <div class="qc2-trend-value">${escapeHtml(formatCurrency(row.unitPrice, row.currency))}</div>
                        </div>
                    `;
                }).join("")}
            </div>
        `;
    }

    function renderHistoryFilters(state, productOptions, supplierOptions) {
        return `
            <div class="qc2-history-filters">
                <label class="recipe-field">
                    <span class="recipe-field-label">Product</span>
                    <select class="mapping-select" data-qc-history-filter="product">
                        <option value="">Choose a product</option>
                        ${productOptions.map((product) => `<option value="${escapeHtml(product)}" ${product === state.historyFilters.product ? "selected" : ""}>${escapeHtml(product)}</option>`).join("")}
                    </select>
                </label>
                <label class="recipe-field">
                    <span class="recipe-field-label">Supplier</span>
                    <select class="mapping-select" data-qc-history-filter="supplier">
                        <option value="">All suppliers</option>
                        ${supplierOptions.map((supplier) => `<option value="${escapeHtml(supplier)}" ${supplier === state.historyFilters.supplier ? "selected" : ""}>${escapeHtml(supplier)}</option>`).join("")}
                    </select>
                </label>
                <div class="recipe-field">
                    <span class="recipe-field-label">Start Date</span>
                    <label class="date-input-inline qc2-history-date-shell ${state.historyFilters.dateFrom ? "has-value" : ""}" data-date-shell>
                        <input class="date-input qc2-history-date-input" type="date" data-qc-history-filter="dateFrom" value="${escapeHtml(state.historyFilters.dateFrom)}" aria-label="History start date">
                        <span class="qc2-history-date-value ${state.historyFilters.dateFrom ? "" : "is-placeholder"}">${escapeHtml(state.historyFilters.dateFrom || "Start date")}</span>
                        <button type="button" class="qc2-history-date-trigger" aria-label="Open start date picker"></button>
                    </label>
                </div>
                <div class="recipe-field">
                    <span class="recipe-field-label">End Date</span>
                    <label class="date-input-inline qc2-history-date-shell ${state.historyFilters.dateTo ? "has-value" : ""}" data-date-shell>
                        <input class="date-input qc2-history-date-input" type="date" data-qc-history-filter="dateTo" value="${escapeHtml(state.historyFilters.dateTo)}" aria-label="History end date">
                        <span class="qc2-history-date-value ${state.historyFilters.dateTo ? "" : "is-placeholder"}">${escapeHtml(state.historyFilters.dateTo || "End date")}</span>
                        <button type="button" class="qc2-history-date-trigger" aria-label="Open end date picker"></button>
                    </label>
                </div>
            </div>
        `;
    }

    function renderHistoryTable(rows) {
        if (!rows.length) {
            return '<div class="decision-list-empty">No saved quotes match the selected product and filters.</div>';
        }
        return `
            <div class="quote-compare-table-scroll">
                <table class="quote-compare-table qc2-history-table">
                    <thead>
                        <tr>
                            <th>Quote Date</th>
                            <th>Product</th>
                            <th>Supplier</th>
                            <th>Unit</th>
                            <th>Quantity</th>
                            <th>Unit Price</th>
                            <th>Total Price</th>
                            <th>Change vs previous</th>
                            <th>Change %</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map((row) => `
                            <tr>
                                <td>${escapeHtml(formatDate(row.quoteDate || row.createdAt))}</td>
                                <td>${escapeHtml(row.productName)}</td>
                                <td>${escapeHtml(row.supplier)}</td>
                                <td>${escapeHtml(row.unit || "Not provided")}</td>
                                <td>${escapeHtml(String(row.quantity || 0))}</td>
                                <td>${escapeHtml(formatCurrency(row.unitPrice, row.currency))}</td>
                                <td>${escapeHtml(formatCurrency(row.totalPrice, row.currency))}</td>
                                <td class="${row.changeValue == null ? "" : row.changeValue > 0 ? "qc2-change-negative" : row.changeValue < 0 ? "qc2-change-positive" : ""}">
                                    ${row.changeValue == null ? "--" : escapeHtml(formatCurrency(row.changeValue, row.currency))}
                                </td>
                                <td class="${row.changePercent == null ? "" : row.changePercent > 0 ? "qc2-change-negative" : row.changePercent < 0 ? "qc2-change-positive" : ""}">
                                    ${row.changePercent == null ? "--" : escapeHtml(formatPercent(row.changePercent))}
                                </td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        `;
    }

    function renderQcHistory(state) {
        const historyRows = flattenHistoryRows(state);
        const productOptions = Array.from(new Set(historyRows.map((row) => row.productName))).sort((left, right) => left.localeCompare(right));
        const supplierOptions = Array.from(new Set(
            historyRows
                .filter((row) => !state.historyFilters.product || row.productName === state.historyFilters.product)
                .map((row) => row.supplier)
                .filter(Boolean)
        )).sort((left, right) => left.localeCompare(right));
        const filteredRows = getFilteredHistoryRows(state);
        const summary = getHistorySummary(filteredRows);
        const currency = filteredRows[filteredRows.length - 1]?.currency || "USD";

        return `
            <section class="qc2-screen qc2-screen-history">
                <div class="qc2-card qc2-history-card">
                    <div class="qc2-head qc2-head-compact">
                        <div class="qc2-head-shell">
                            <div class="qc2-head-copy">
                                <div class="upload-step">Step 4</div>
                                <h2 class="qc2-title">Product history</h2>
                                <p class="qc2-copy">Pick a product, filter the saved supplier offers, and review how the price has changed over time.</p>
                            </div>
                        </div>
                    </div>
                    <div class="qc2-history-controls">
                        ${renderHistoryFilters(state, productOptions, supplierOptions)}
                    </div>
                    <div class="qc2-summary-grid qc2-history-summary-grid">
                        <article class="summary-card"><div class="summary-card-title">Latest price</div><div class="summary-card-value compact">${summary.latestPrice == null ? "--" : escapeHtml(formatCurrency(summary.latestPrice, currency))}</div><div class="summary-card-insight">Most recent unit price in the selected range.</div></article>
                        <article class="summary-card"><div class="summary-card-title">Oldest price</div><div class="summary-card-value compact">${summary.oldestPrice == null ? "--" : escapeHtml(formatCurrency(summary.oldestPrice, currency))}</div><div class="summary-card-insight">Starting unit price in the selected range.</div></article>
                        <article class="summary-card"><div class="summary-card-title">Min / Max</div><div class="summary-card-value compact">${summary.minPrice == null ? "--" : `${escapeHtml(formatCurrency(summary.minPrice, currency))} / ${escapeHtml(formatCurrency(summary.maxPrice, currency))}`}</div><div class="summary-card-insight">Lowest and highest unit price in the visible history.</div></article>
                        <article class="summary-card"><div class="summary-card-title">Total change</div><div class="summary-card-value compact">${summary.totalChange == null ? "--" : escapeHtml(formatCurrency(summary.totalChange, currency))}</div><div class="summary-card-insight">${summary.totalChangePercent == null ? "No change percentage available yet." : `${escapeHtml(formatPercent(summary.totalChangePercent))} vs oldest visible quote.`}</div></article>
                    </div>
                    <section class="qc2-history-block qc2-history-table-block">
                        <div class="mapping-section-head"><div><div class="mapping-section-title">Price history table</div><div class="mapping-section-copy">Review each saved supplier quote, including change versus the previous visible quote.</div></div></div>
                        ${renderHistoryTable(filteredRows)}
                    </section>
                    <section class="qc2-history-block qc2-history-trend-block">
                        <div class="mapping-section-head"><div><div class="mapping-section-title">Simple trend</div><div class="mapping-section-copy">Unit price over time for the currently selected product and filters.</div></div></div>
                        ${renderHistoryTrend(filteredRows)}
                    </section>
                    ${renderStatus(state)}
                    <div class="qc2-actions">
                        <button type="button" class="secondary-btn" data-qc-action="back-analyze">Back to Analyze</button>
                    </div>
                </div>
            </section>
        `;
    }

    function renderApp(elements, state) {
        if (!elements.app) return;
        const screenMap = {
            start: renderQcStart(state),
            upload: renderQcUpload(state),
            manual: renderQcManual(state),
            review: renderQcReview(state),
            analyze: renderQcAnalyze(state),
            history: renderQcHistory(state)
        };
        elements.app.innerHTML = screenMap[state.currentScreen] || renderQcStart(state);
        persistQuoteCompareSession(state, elements);
    }

    async function parseSelectedFile(state, file) {
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
    }

    async function startUploadAnalysis(state) {
        if (!state.file && !state.activeSessionId) {
            setStatus(state, "Choose a supplier file before starting analysis.", "error");
            return false;
        }
        computeValidation(state);
        if (!state.validation.ready) {
            setStatus(state, "Complete the required unique mappings before starting analysis.", "error");
            return false;
        }
        if (!state.file && state.activeSessionId) {
            try {
                const activeSession = await fetchActiveQuoteCompareSession(state.activeSessionId);
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
        setStatus(state, "Building quote analysis from the confirmed mappings.", "info");
        const formData = new FormData();
        if (state.file) {
            formData.append("file", state.file);
        }
        formData.append("mappings", JSON.stringify(state.selectedMappings));
        if (state.activeSessionId) {
            formData.append("session_id", state.activeSessionId);
        }
        try {
            const data = await fetchJson("/quote-compare/upload/confirm", {
                method: "POST",
                body: formData
            });
            state.activeSessionId = data.session_id || state.activeSessionId;
            if (state.activeSessionId) {
                sessionStorage.setItem(QUOTE_COMPARE_ACTIVE_SESSION_KEY, state.activeSessionId);
            }
            state.analyzeMode = "compare";
            state.analysisResult = {
                comparison: { ...data.comparison, source_type: "upload" },
                evaluation: data.evaluation,
                summary: buildAnalyzeSummary({ comparison: { ...data.comparison, source_type: "upload" } })
            };
            state.rows = data.comparison?.bids || [];
            state.lastFlowScreen = "review";
            state.currentScreen = "analyze";
            state.isSubmitting = false;
            setStatus(state, data.message || "Quote analysis is ready.", "success");
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

    async function startManualAnalysis(state) {
        try {
            const payload = buildManualPayload(state);
            setStatus(state, "Calculating quote analysis from the manual supplier rows.", "info");
            const data = await fetchJson("/quote-compare/evaluate", {
                method: "POST",
                body: JSON.stringify(payload)
            });
            state.analyzeMode = "compare";
            state.analysisResult = {
                comparison: { ...data.comparison, source_type: "manual" },
                evaluation: data.evaluation,
                summary: buildAnalyzeSummary({ comparison: { ...data.comparison, source_type: "manual" } })
            };
            state.selectedMappings = {
                "Product Name": "Manual Entry",
                "Supplier": "Manual Entry",
                "Unit": "Manual Entry",
                "Quantity": "Manual Entry",
                "Unit Price": "Manual Entry",
                "Date": "Manual Entry"
            };
            state.lastFlowScreen = "manual";
            state.currentScreen = "analyze";
            setStatus(state, "Manual quote analysis is ready.", "success");
            return true;
        } catch (error) {
            setStatus(state, error.message, "error");
            return false;
        }
    }

    function buildSavePayload(state) {
        const comparison = state.analysisResult?.comparison;
        const summary = state.analysisResult?.summary || buildAnalyzeSummary(state.analysisResult || { comparison });
        if (!comparison) {
            throw new Error("Run quote analysis before saving quotes.");
        }
        const bids = state.analyzeMode === "optimize"
            ? (summary.optimizedRows || []).map((row) => ({
                supplier_name: row.selectedSupplier || "",
                product_name: row.productName || "",
                unit: row.unit || "",
                quantity: Number(row.quantity || 0),
                unit_price: Number(row.unitPrice || 0),
                total_price: Number(row.totalPrice || 0),
                quote_date: row.quoteDate || "",
                currency: row.currency || "USD",
                delivery_time: row.chosenOffer?.delivery_time || "",
                payment_term: row.chosenOffer?.payment_term || "",
                valid_until: row.chosenOffer?.valid_until || null,
                notes: row.chosenOffer?.notes || null
            }))
            : (comparison.bids || []).map((bid) => ({
                supplier_name: bid.supplier_name || "",
                product_name: bid.product_name || "",
                unit: bid.unit || "",
                quantity: Number(bid.quantity || 0),
                unit_price: Number(bid.unit_price || 0),
                total_price: Number(bid.total_price || 0),
                quote_date: bid.quote_date || bid.date || "",
                currency: bid.currency || "USD",
                delivery_time: bid.delivery_time || "",
                payment_term: bid.payment_term || "",
                valid_until: bid.valid_until || null,
                notes: bid.notes || null
            }));
        return {
            comparison_id: comparison.comparison_id || null,
            name: comparison.name || (state.file ? state.file.name.replace(/\.[^.]+$/, "") : `Quote Compare ${new Date().toLocaleDateString("en-US")}`),
            sourcing_need: comparison.sourcing_need || "",
            source_type: comparison.source_type || (state.mode === "manual" ? "manual" : "upload"),
            mode: state.analyzeMode === "optimize" ? "optimized" : "compare",
            weighting: comparison.weighting || null,
            bids
        };
    }

    async function saveQuotes(state) {
        const payload = buildSavePayload(state);
        state.isSaving = true;
        setStatus(state, "Saving quote records to product history.", "info");
        try {
            const data = await fetchJson("/quote-compare/save", {
                method: "POST",
                body: JSON.stringify(payload)
            });
            hydrateComparisons(state, data.comparisons || []);
            state.analysisResult = {
                comparison: data.comparison,
                evaluation: data.evaluation,
                summary: buildAnalyzeSummary({ comparison: data.comparison })
            };
            state.isSaving = false;
            setStatus(state, data.message || "Quotes saved.", "success");
            return true;
        } catch (error) {
            state.isSaving = false;
            setStatus(state, error.message, "error");
            return false;
        }
    }

    function bindEvents(elements, state) {
        if (!elements.app || elements.app.dataset.bound === "true") return;
        elements.app.dataset.bound = "true";

        elements.app.addEventListener("click", async (event) => {
            const actionTarget = event.target.closest("[data-qc-action]");
            if (!actionTarget) return;
            const action = actionTarget.dataset.qcAction;

            if (action === "start-upload") {
                state.mode = "upload";
                state.currentScreen = "upload";
                setStatus(state, "", "");
                renderApp(elements, state);
                return;
            }
            if (action === "start-manual") {
                state.mode = "manual";
                state.currentScreen = "manual";
                setStatus(state, "", "");
                renderApp(elements, state);
                return;
            }
            if (action === "back-start") {
                state.currentScreen = "start";
                setStatus(state, "", "");
                renderApp(elements, state);
                return;
            }
            if (action === "pick-file" || action === "replace-file") {
                elements.app.querySelector("#qc2FileInput")?.click();
                return;
            }
            if (action === "remove-file") {
                await parseSelectedFile(state, null);
                renderApp(elements, state);
                return;
            }
            if (action === "go-review") {
                state.currentScreen = "review";
                renderApp(elements, state);
                return;
            }
            if (action === "back-upload") {
                state.currentScreen = "upload";
                renderApp(elements, state);
                return;
            }
            if (action === "auto-map") {
                applyAutoMappings(state);
                setStatus(state, "Confident detected columns were applied automatically.", "info");
                renderApp(elements, state);
                return;
            }
            if (action === "clear-mappings") {
                clearMappings(state);
                setStatus(state, "All mapping selections were cleared.", "info");
                renderApp(elements, state);
                return;
            }
            if (action === "start-analysis") {
                const started = await startUploadAnalysis(state);
                renderApp(elements, state);
                if (started) {
                    document.getElementById("qc2AnalysisTop")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }
                return;
            }
            if (action === "back-review") {
                state.currentScreen = state.lastFlowScreen === "manual" ? "manual" : "review";
                renderApp(elements, state);
                return;
            }
            if (action === "add-manual-row") {
                state.manualRows.push(createEmptyManualRow());
                renderApp(elements, state);
                return;
            }
            if (action === "remove-manual-row") {
                const index = Number(actionTarget.dataset.index || -1);
                if (index > 0) state.manualRows.splice(index, 1);
                renderApp(elements, state);
                return;
            }
            if (action === "manual-analyze") {
                await startManualAnalysis(state);
                renderApp(elements, state);
                return;
            }
            if (action === "save-quotes") {
                await saveQuotes(state);
                renderApp(elements, state);
                return;
            }
            if (action === "toggle-decision-card") {
                const cardKey = actionTarget.dataset.cardKey || "";
                if (cardKey) {
                    state.collapsedDecisionCards[cardKey] = !state.collapsedDecisionCards[cardKey];
                    renderApp(elements, state);
                }
                return;
            }
            if (action === "toggle-full-comparison") {
                state.showFullComparison = !state.showFullComparison;
                renderApp(elements, state);
                return;
            }
            if (action === "toggle-optimized-summary") {
                state.showOptimizedSummary = !state.showOptimizedSummary;
                renderApp(elements, state);
                return;
            }
            if (action === "go-history") {
                initializeHistoryFilters(state);
                state.currentScreen = "history";
                renderApp(elements, state);
                return;
            }
            if (action === "back-analyze") {
                state.currentScreen = "analyze";
                renderApp(elements, state);
            }
        });

        elements.app.addEventListener("click", (event) => {
            const dateShell = event.target.closest("[data-date-shell]");
            if (!dateShell || !elements.app.contains(dateShell)) return;

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
        });

        elements.app.addEventListener("change", async (event) => {
            const fileInput = event.target.closest("#qc2FileInput");
            if (fileInput) {
                const file = fileInput.files?.[0] || null;
                await parseSelectedFile(state, file);
                renderApp(elements, state);
                return;
            }

            const mappingSelect = event.target.closest("[data-qc-mapping-field]");
            if (mappingSelect) {
                state.selectedMappings[mappingSelect.dataset.qcMappingField] = mappingSelect.value || "";
                computeValidation(state);
                renderApp(elements, state);
                return;
            }

            const historyFilter = event.target.closest("[data-qc-history-filter]");
            if (historyFilter) {
                const key = historyFilter.dataset.qcHistoryFilter;
                state.historyFilters[key] = historyFilter.value || "";
                if (key === "product") state.historyFilters.supplier = "";
                renderApp(elements, state);
                return;
            }

            const manualField = event.target.closest("[data-manual-field]");
            if (manualField) {
                const index = Number(manualField.dataset.index || -1);
                const field = manualField.dataset.manualField || "";
                if (index >= 0 && state.manualRows[index] && field) {
                    state.manualRows[index][field] = manualField.value;
                }
                renderApp(elements, state);
            }
        });

        elements.app.addEventListener("input", (event) => {
            const manualField = event.target.closest("[data-manual-field]");
            if (!manualField) return;
            const index = Number(manualField.dataset.index || -1);
            const field = manualField.dataset.manualField || "";
            if (index >= 0 && state.manualRows[index] && field) {
                state.manualRows[index][field] = manualField.value;
            }
        });
    }

    function exposeApi(elements, state) {
        window.resetQuoteCompareToStep1 = function resetQuoteCompareToStep1() {
            setQuoteCompareReady(elements, false);
            resetQuoteCompareUploadState(state);
            state.currentScreen = "start";
            state.lastFlowScreen = "review";
            renderApp(elements, state);
            writeScrollPosition(elements, 0);
            setQuoteCompareReady(elements, true);
        };

        window.PriceAnalyzerQuoteCompare = {
            openStartAction(action) {
                state.currentScreen = action === "manual" ? "manual" : "upload";
                state.mode = action === "manual" ? "manual" : "upload";
                renderApp(elements, state);
            },
            openUploadFilePicker() {
                state.currentScreen = "upload";
                renderApp(elements, state);
                elements.app.querySelector("#qc2FileInput")?.click();
            },
            syncUploadFileName() {},
            continueUploadReview() {
                state.currentScreen = "review";
                renderApp(elements, state);
            },
            clearUploadFile() {
                parseSelectedFile(state, null).then(() => renderApp(elements, state));
            },
            addManualSupplier() {
                state.currentScreen = "manual";
                state.manualRows.push(createEmptyManualRow());
                renderApp(elements, state);
            },
            saveManualProduct() {},
            addAnotherManualProduct() {
                state.currentScreen = "manual";
                state.manualRows.push(createEmptyManualRow());
                renderApp(elements, state);
            },
            continueManualReview() {
                startManualAnalysis(state).then(() => renderApp(elements, state));
            },
            goToStart() {
                state.currentScreen = "start";
                renderApp(elements, state);
            }
        };
    }

    async function initQuoteCompare() {
        const elements = getElements();
        if (!elements.shell || !elements.app) return;
        setQuoteCompareReady(elements, false);
        const hardResetRequested = Boolean(window.PriceAnalyzerBootGuard?.didHardReset?.());
        const state = createState();
        if (hardResetRequested) {
            resetQuoteCompareUploadState(state);
        } else {
            restoreQuoteCompareSession(state);
        }
        bindEvents(elements, state);
        exposeApi(elements, state);
        await loadSavedComparisons(state);
        renderApp(elements, state);
        if (hardResetRequested) {
            writeScrollPosition(elements, 0);
        } else {
            restoreQuoteCompareScroll(elements);
        }
        setQuoteCompareReady(elements, true);

        const scrollContext = getScrollContext(elements);
        const scrollTarget = scrollContext.type === "element" ? scrollContext.target : window;
        scrollTarget.addEventListener("scroll", () => {
            persistQuoteCompareSession(state, elements);
        }, { passive: true });
        window.addEventListener("beforeunload", () => {
            persistQuoteCompareSession(state, elements);
        });
    }

    document.addEventListener("DOMContentLoaded", () => {
        initQuoteCompare();
    });
})();
