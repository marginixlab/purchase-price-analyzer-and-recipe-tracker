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

    function getElements() {
        return {
            shell: document.getElementById("quoteCompareShell"),
            app: document.getElementById("quoteCompareApp")
        };
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
            parseError: "",
            status: { message: "", tone: "" },
            isParsing: false,
            isSubmitting: false,
            isSaving: false,
            manualRows: [createEmptyManualRow()],
            savedComparisons: [],
            collapsedDecisionCards: {},
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

    function initializeReviewState(state, payload) {
        state.uploadReview = payload;
        state.headers = payload.available_columns || payload.headers || [];
        state.detectedMappings = { ...(payload.mapping || {}) };
        state.selectedMappings = {};
        [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].forEach((fieldName) => {
            state.selectedMappings[fieldName] = payload.mapping?.[fieldName] || "";
        });
        computeValidation(state);
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
        const reviewMap = new Map(
            (state.uploadReview?.field_reviews || [])
                .map((item) => [item.field_name || item.field || "", item])
                .filter(([fieldName]) => Boolean(fieldName))
        );
        return [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].map((fieldName) => {
            const review = reviewMap.get(fieldName) || {};
            const detectedColumn = review.detected_column || state.detectedMappings[fieldName] || "";
            const selectedColumn = state.selectedMappings[fieldName] || detectedColumn || "";
            return {
                fieldName,
                helpText: FIELD_HELP[fieldName] || "Choose the matching column from the uploaded file.",
                detectedColumn,
                selectedColumn,
                detectedQuality: review.match_quality || (detectedColumn ? "possible" : "missing"),
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
            const data = await fetchJson("/quote-compare/bootstrap");
            hydrateComparisons(state, data.comparisons || []);
        } catch (error) {
            setStatus(state, error.message, "error");
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
                        ${row.detectedColumn ? '<span class="qc2-detected-badge">Auto-detected</span>' : ""}
                    </div>
                    <div class="mapping-field-help">${escapeHtml(FIELD_HELP[row.fieldName] || "")}</div>
                    ${duplicateNote ? `<div class="qc2-inline-error">${escapeHtml(duplicateNote)}</div>` : ""}
                </div>
                <div>
                    <select class="mapping-select" data-qc-mapping-field="${escapeHtml(row.fieldName)}">
                        <option value="">Choose a column</option>
                        ${row.options.map((columnName) => `<option value="${escapeHtml(columnName)}" ${columnName === row.selectedColumn ? "selected" : ""}>${escapeHtml(columnName)}</option>`).join("")}
                    </select>
                </div>
                <span class="mapping-status ${statusClass}">${escapeHtml(statusText)}</span>
            </div>
        `;
    }

    function renderQcReview(state) {
        const rows = getReviewRows(state).map((row) => ({ ...row, options: state.headers }));
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
        const isOptimizeMode = state.analyzeMode === "optimize";
        return `
            <section class="qc2-screen qc2-screen-analyze">
                <div class="qc2-card qc2-analyze-card">
                    <div class="qc2-head qc2-head-compact qc2-analyze-head">
                        <div class="upload-step">Step 3</div>
                        <h2 class="qc2-title">Quote analysis</h2>
                        <p class="qc2-copy">Scan current supplier offers against the best visible price for each product, then save the quotes or move into product history.</p>
                    </div>
                    <div class="qc2-analyze-toolbar">
                        <div class="qc2-mode-switch" role="tablist" aria-label="Analyze mode">
                            <button type="button" class="qc2-mode-switch-btn ${!isOptimizeMode ? "is-active" : ""}" data-qc-action="set-analyze-mode" data-mode="compare">Compare Mode</button>
                            <button type="button" class="qc2-mode-switch-btn ${isOptimizeMode ? "is-active" : ""}" data-qc-action="set-analyze-mode" data-mode="optimize">Optimize Mode</button>
                        </div>
                    </div>
                    <div class="qc2-summary-grid qc2-summary-grid-compact">
                        ${isOptimizeMode ? `
                            <article class="summary-card qc2-summary-card-compact"><div class="summary-card-title">Total Products</div><div class="summary-card-value compact">${summary.productCount}</div><div class="summary-card-insight">Products included in the optimized plan.</div></article>
                            <article class="summary-card qc2-summary-card-compact"><div class="summary-card-title">Current Spend</div><div class="summary-card-value compact">${escapeHtml(formatCurrency(summary.currentSpend || 0, result.comparison?.bids?.[0]?.currency || "USD"))}</div><div class="summary-card-insight">Visible spend from the current basket view.</div></article>
                            <article class="summary-card qc2-summary-card-compact"><div class="summary-card-title">Optimized Spend</div><div class="summary-card-value compact">${escapeHtml(formatCurrency(summary.optimizedSpend || 0, result.comparison?.bids?.[0]?.currency || "USD"))}</div><div class="summary-card-insight">Spend after selecting the best supplier per product.</div></article>
                            <article class="summary-card qc2-summary-card-compact"><div class="summary-card-title">Total Savings</div><div class="summary-card-value compact">${escapeHtml(formatCurrency(summary.optimizedSavings || 0, result.comparison?.bids?.[0]?.currency || "USD"))}</div><div class="summary-card-insight">${escapeHtml(formatPercent(summary.optimizedSavingsPercent || 0))} savings potential.</div></article>
                        ` : `
                            <article class="summary-card qc2-summary-card-compact"><div class="summary-card-title">Products Compared</div><div class="summary-card-value compact">${summary.productCount}</div><div class="summary-card-insight">Visible product groups in this analysis.</div></article>
                            <article class="summary-card qc2-summary-card-compact"><div class="summary-card-title">Suppliers Found</div><div class="summary-card-value compact">${summary.supplierCount}</div><div class="summary-card-insight">Unique suppliers in the imported quotes.</div></article>
                            <article class="summary-card qc2-summary-card-compact"><div class="summary-card-title">Savings Opportunities</div><div class="summary-card-value compact">${summary.productsWithSavings}</div><div class="summary-card-insight">Products where a better offer is visible.</div></article>
                            <article class="summary-card qc2-summary-card-compact"><div class="summary-card-title">Visible Savings</div><div class="summary-card-value compact">${escapeHtml(formatCurrency(summary.totalVisibleSavings || 0, result.comparison?.bids?.[0]?.currency || "USD"))}</div><div class="summary-card-insight">Total savings potential across visible products.</div></article>
                        `}
                    </div>
                    <section class="qc2-analysis-block">
                        <div class="mapping-section-head"><div><div class="mapping-section-title">${isOptimizeMode ? "Optimized purchase plan" : "Comparison view"}</div><div class="mapping-section-copy">${isOptimizeMode ? "Use the best supplier per product to build a decision-ready optimized basket." : "Review which products are already best-priced and where savings are available."}</div></div></div>
                        ${isOptimizeMode ? renderOptimizeRows(summary.optimizedRows, state) : renderAnalyzeRows(summary.decisionCards, state)}
                    </section>
                    ${renderStatus(state)}
                    <div class="qc2-actions qc2-analyze-actions">
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
                    <div class="date-input-inline ${state.historyFilters.dateFrom ? "has-value" : ""}">
                        <span class="date-input-empty">Start date</span>
                        <input class="date-input" type="date" data-qc-history-filter="dateFrom" value="${escapeHtml(state.historyFilters.dateFrom)}" aria-label="History start date">
                    </div>
                </div>
                <div class="recipe-field">
                    <span class="recipe-field-label">End Date</span>
                    <div class="date-input-inline ${state.historyFilters.dateTo ? "has-value" : ""}">
                        <span class="date-input-empty">End date</span>
                        <input class="date-input" type="date" data-qc-history-filter="dateTo" value="${escapeHtml(state.historyFilters.dateTo)}" aria-label="History end date">
                    </div>
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
                        <div class="upload-step">Step 4</div>
                        <h2 class="qc2-title">Product history</h2>
                        <p class="qc2-copy">Pick a product, filter the saved supplier offers, and review how the price has changed over time.</p>
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
            setStatus(state, "File removed. Choose another supplier file to continue.", "info");
            return;
        }
        await inspectUpload(state);
    }

    async function startUploadAnalysis(state) {
        if (!state.file) {
            setStatus(state, "Choose a supplier file before starting analysis.", "error");
            return false;
        }
        computeValidation(state);
        if (!state.validation.ready) {
            setStatus(state, "Complete the required unique mappings before starting analysis.", "error");
            return false;
        }
        state.isSubmitting = true;
        setStatus(state, "Building quote analysis from the confirmed mappings.", "info");
        const formData = new FormData();
        formData.append("file", state.file);
        formData.append("mappings", JSON.stringify(state.selectedMappings));
        try {
            const data = await fetchJson("/quote-compare/upload/confirm", {
                method: "POST",
                body: formData
            });
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
            if (action === "start-analysis") {
                await startUploadAnalysis(state);
                renderApp(elements, state);
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
            if (action === "set-analyze-mode") {
                state.analyzeMode = actionTarget.dataset.mode === "optimize" ? "optimize" : "compare";
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
        const state = createState();
        bindEvents(elements, state);
        exposeApi(elements, state);
        await loadSavedComparisons(state);
        renderApp(elements, state);
    }

    document.addEventListener("DOMContentLoaded", () => {
        initQuoteCompare();
    });
})();
