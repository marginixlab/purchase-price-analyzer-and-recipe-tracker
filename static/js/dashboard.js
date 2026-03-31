(function () {
    const Table = window.PriceAnalyzerTable;
    const { renderCharts } = window.PriceAnalyzerCharts;
    const REQUIRED_UPLOAD_FIELDS = ["Product Name", "Supplier", "Unit", "Quantity", "Unit Price", "Date"];
    const REQUIRED_FIELD_HINTS = {
        "Product Name": "Choose the column that identifies the purchased item or description.",
        "Supplier": "Choose the supplier, vendor, or company column.",
        "Unit": "Choose the unit, UOM, or pack size column.",
        "Quantity": "Choose the purchased quantity or ordered amount column.",
        "Unit Price": "Choose the price or cost column used for each unit.",
        "Date": "Choose the transaction, purchase, or invoice date column."
    };
    const defaultFilters = { product: "", supplier: "all", status: "all", search: "", dateFrom: "", dateTo: "" };
    const collapsibleDefaults = {
        guidedEntryCollapsed: true,
        uploadAnalyzeCollapsed: true,
        topInsightsCollapsed: true,
        advancedFiltersCollapsed: true,
        visualInsightsCollapsed: true,
        analystWorkspaceCollapsed: true,
        recipesCollapsed: true,
        askDataCollapsed: true
    };
    const workspaceDefaults = {
        guidePanelOpen: false,
        notesPanelOpen: false,
        workspaceNotes: ""
    };
    let dashboardInitialized = false;
    let isInitializing = false;
    let isSyncingUrl = false;

    function ensureFilterPopoverRoot() {
        let root = document.getElementById("filterPopoverRoot");
        if (!root) {
            root = document.createElement("div");
            root.id = "filterPopoverRoot";
            root.className = "filter-popover-root";
            root.hidden = true;
            document.body.appendChild(root);
            return root;
        }

        if (root.parentElement !== document.body) {
            document.body.appendChild(root);
        }

        return root;
    }

    function signedPercent(value) {
        const n = Number(value || 0);
        return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
    }

    function readWorkspacePreference(key) {
        try {
            const stored = window.localStorage.getItem(key);
            return stored === null ? workspaceDefaults[key] : stored;
        } catch (error) {
            return workspaceDefaults[key];
        }
    }

    function writeWorkspacePreference(key, value) {
        try {
            window.localStorage.setItem(key, value);
        } catch (error) {
            return;
        }
    }

    function readCollapsedPreference(key) {
        try {
            const stored = window.localStorage.getItem(key);
            if (stored === null) {
                return Boolean(collapsibleDefaults[key]);
            }
            return stored === "true";
        } catch (error) {
            return Boolean(collapsibleDefaults[key]);
        }
    }

    function writeCollapsedPreference(key, value) {
        try {
            window.localStorage.setItem(key, value ? "true" : "false");
        } catch (error) {
            return;
        }
    }

    function setCollapsibleState(panel, collapsed) {
        if (!panel) return;
        const toggle = panel.querySelector("[data-collapsible-toggle]");
        panel.classList.toggle("is-collapsed", collapsed);
        panel.classList.toggle("is-expanded", !collapsed);
        if (toggle) {
            toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
        }
    }

    function initCollapsiblePanels() {
        const panels = document.querySelectorAll("[data-collapsible]");
        panels.forEach((panel) => {
            const key = panel.dataset.storageKey;
            const toggle = panel.querySelector("[data-collapsible-toggle]");
            if (!key || !toggle) return;

            setCollapsibleState(panel, readCollapsedPreference(key));

            if (toggle.dataset.bound === "true") {
                return;
            }

            toggle.dataset.bound = "true";
            toggle.addEventListener("click", () => {
                const nextCollapsed = !panel.classList.contains("is-collapsed");
                setCollapsibleState(panel, nextCollapsed);
                writeCollapsedPreference(key, nextCollapsed);
            });
        });
    }

    function setStoredCollapsibleState(storageKey, collapsed) {
        const panel = document.querySelector(`[data-collapsible][data-storage-key="${storageKey}"]`);
        if (!panel) return;
        setCollapsibleState(panel, collapsed);
        writeCollapsedPreference(storageKey, collapsed);
    }

    function revealSectionFromHash() {
        const hash = window.location.hash || "";
        const target = hash ? document.querySelector(hash) : null;
        if (!target) return;

        const storageKeyByHash = {
            "#guidedEntryPanel": "guidedEntryCollapsed",
            "#uploadPanel": "uploadAnalyzeCollapsed",
            "#topInsightsPanel": "topInsightsCollapsed",
            "#workspacePanel": "analystWorkspaceCollapsed",
            "#askDataPanel": "askDataCollapsed"
        };
        const storageKey = storageKeyByHash[hash];
        if (storageKey) {
            setStoredCollapsibleState(storageKey, false);
        }

        window.requestAnimationFrame(() => {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    }

    function updateStepHeader(panel, step, kicker, title) {
        if (!panel) return;
        const badge = panel.querySelector(".collapsible-step-badge");
        const kickerNode = panel.querySelector(".collapsible-toggle-kicker");
        const titleNode = panel.querySelector(".collapsible-toggle-title");
        if (badge && step) badge.textContent = step;
        if (kickerNode && kicker) kickerNode.textContent = kicker;
        if (titleNode && title) titleNode.textContent = title;
    }

    function createDecisionTabShell(elements) {
        if (!elements.topInsightsPanel) return;
        const bodyInner = elements.topInsightsPanel.querySelector("#topInsightsPanelBody .collapsible-body-inner");
        const executiveSummary = bodyInner?.querySelector(".executive-summary");
        const decisionGrid = bodyInner?.querySelector(".decision-grid");
        const summaryGrid = bodyInner?.querySelector(".summary-grid");
        const executiveSummaryBody = executiveSummary?.querySelector(".executive-summary-body");
        const chartsBodyInner = elements.chartsPanel?.querySelector("#chartsPanelBody .collapsible-body-inner");

        if (!bodyInner || !executiveSummary || !decisionGrid || !summaryGrid || !executiveSummaryBody || !chartsBodyInner) {
            return;
        }
        if (bodyInner.querySelector("#decisionViewTabs")) {
            return;
        }

        executiveSummary.classList.add("decision-view-shell");
        const topGrid = executiveSummaryBody.querySelector("#executiveSummaryGrid");
        if (!topGrid) {
            return;
        }
        executiveSummaryBody.appendChild(topGrid);

        const tabStrip = document.createElement("div");
        tabStrip.className = "decision-tab-strip";
        tabStrip.id = "decisionViewTabs";
        tabStrip.setAttribute("role", "tablist");
        tabStrip.setAttribute("aria-label", "Decision View sections");
        tabStrip.innerHTML = `
            <button type="button" class="decision-tab is-active" id="decisionTabOverview" data-decision-tab="overview" aria-selected="true" role="tab">Overview</button>
            <button type="button" class="decision-tab" id="decisionTabOpportunities" data-decision-tab="opportunities" aria-selected="false" role="tab">Opportunities</button>
        `;

        const panels = document.createElement("div");
        panels.className = "decision-tab-panels";

        const overviewPanel = document.createElement("section");
        overviewPanel.className = "decision-tab-panel is-active";
        overviewPanel.id = "decisionPanelOverview";
        overviewPanel.dataset.decisionPanel = "overview";
        overviewPanel.setAttribute("role", "tabpanel");
        overviewPanel.setAttribute("aria-labelledby", "decisionTabOverview");
        overviewPanel.appendChild(executiveSummary);
        summaryGrid.classList.add("decision-summary-grid");
        overviewPanel.appendChild(summaryGrid);
        overviewPanel.appendChild(decisionGrid);
        decisionGrid.classList.add("decision-grid-tight");

        const opportunitiesPanel = document.createElement("section");
        opportunitiesPanel.className = "decision-tab-panel";
        opportunitiesPanel.id = "decisionPanelOpportunities";
        opportunitiesPanel.dataset.decisionPanel = "opportunities";
        opportunitiesPanel.hidden = true;
        opportunitiesPanel.setAttribute("role", "tabpanel");
        opportunitiesPanel.setAttribute("aria-labelledby", "decisionTabOpportunities");
        while (chartsBodyInner.firstChild) {
            opportunitiesPanel.appendChild(chartsBodyInner.firstChild);
        }

        panels.appendChild(overviewPanel);
        panels.appendChild(opportunitiesPanel);
        bodyInner.appendChild(tabStrip);
        bodyInner.appendChild(panels);

        elements.chartsPanel?.remove();
    }

    function moveFiltersIntoWorkspace(elements) {
        if (!elements.workspacePanel || !elements.filtersPanel) return;
        const tableShell = elements.workspacePanel.querySelector(".table-shell");
        const tableHeader = tableShell?.querySelector(".table-header");
        if (!tableShell || !tableHeader) return;
        if (elements.filtersPanel.parentElement === tableShell) return;

        elements.filtersPanel.classList.add("workspace-filter-block");
        elements.filtersPanel.querySelector(".collapsible-step-badge")?.remove();
        elements.filtersPanel.querySelector(".collapsible-toggle")?.classList.add("collapsible-toggle-subpanel");
        tableHeader.insertAdjacentElement("afterend", elements.filtersPanel);

        const popoverRoot = document.getElementById("filterPopoverRoot");
        if (popoverRoot && popoverRoot.parentElement !== tableShell) {
            tableShell.insertAdjacentElement("afterbegin", popoverRoot);
        }
    }

    function initWorkspaceStructure(elements) {
        updateStepHeader(elements.topInsightsPanel, "Step 3", "Decision View", "Private advisor guidance, next actions, and savings opportunities for the current slice");
        updateStepHeader(elements.workspacePanel, "Step 4", "Analyst Workspace", "Use filters, sort evidence, and inspect the full row-level pricing workspace");
        updateStepHeader(elements.askDataPanel, "Step 5", "Ask Your Data", "Open the AI purchasing copilot for executive questions and guided answers");
        updateStepHeader(elements.filtersPanel, "", "Advanced Filters", "Refine the current dataset view when you need deeper control");
        moveFiltersIntoWorkspace(elements);
        createDecisionTabShell(elements);
    }

    function syncRecipesAvailability(elements, hasAnalysis) {
        if (elements.recipesPanel) {
            elements.recipesPanel.hidden = !hasAnalysis;
        }
        if (elements.recipesNeedsAnalysis) {
            elements.recipesNeedsAnalysis.hidden = hasAnalysis;
        }
    }

    function getElements() {
        return {
            accessShell: document.getElementById("accessShell"),
            appShell: document.getElementById("appShell"),
            mainDashboardView: document.getElementById("mainDashboardView"),
            topInsightsPanel: document.getElementById("topInsightsPanel"),
            workspacePanel: document.getElementById("workspacePanel"),
            recipesPanel: document.getElementById("recipesPanel"),
            recipesNeedsAnalysis: document.getElementById("recipesNeedsAnalysis"),
            filtersPanel: document.getElementById("filtersPanel"),
            chartsPanel: document.getElementById("chartsPanel"),
            askDataPanel: document.getElementById("askDataPanel"),
            guidePanelToggle: document.getElementById("guidePanelToggle"),
            notesPanelToggle: document.getElementById("notesPanelToggle"),
            guidePanel: document.getElementById("guidePanel"),
            notesPanel: document.getElementById("notesPanel"),
            closeGuidePanelButton: document.getElementById("closeGuidePanelButton"),
            closeNotesPanelButton: document.getElementById("closeNotesPanelButton"),
            notesTextarea: document.getElementById("notesTextarea"),
            notesSavedIndicator: document.getElementById("notesSavedIndicator"),
            clearNotesButton: document.getElementById("clearNotesButton"),
            resultsTable: document.getElementById("resultsTable"),
            tableHead: document.getElementById("resultsTableHead"),
            tableBody: document.getElementById("resultsTableBody"),
            uploadForm: document.getElementById("uploadForm"),
            fileInput: document.getElementById("file-upload"),
            fileName: document.getElementById("file-name"),
            goToAnalysisButton: document.getElementById("goToAnalysisButton"),
            uploadBox: document.getElementById("uploadBox"),
            uploadSubmitButton: document.querySelector("#uploadForm .upload-submit"),
            uploadError: document.getElementById("uploadError"),
            uploadStatusHost: document.getElementById("uploadStatusHost"),
            clearAnalysisForm: document.getElementById("clearAnalysisForm"),
            previousAnalysisBadge: document.getElementById("previousAnalysisBadge"),
            demoDatasetBadge: document.getElementById("demoDatasetBadge"),
            mappingReviewPanel: document.getElementById("mappingReviewPanel"),
            mappingReviewIntro: document.getElementById("mappingReviewIntro"),
            mappingSummaryChips: document.getElementById("mappingSummaryChips"),
            mappingGrid: document.getElementById("mappingGrid"),
            mappingMissingAlert: document.getElementById("mappingMissingAlert"),
            mappingOptionalAlert: document.getElementById("mappingOptionalAlert"),
            confirmMappingButton: document.getElementById("confirmMappingButton"),
            changeUploadFileButton: document.getElementById("changeUploadFileButton"),
            searchInput: document.getElementById("searchInput"),
            dateFilterGroup: document.getElementById("dateFilterGroup"),
            dateFromInput: document.getElementById("dateFromInput"),
            dateToInput: document.getElementById("dateToInput"),
            resetFiltersButton: document.getElementById("resetFiltersButton"),
            resetColumnsButton: document.getElementById("resetColumnsButton"),
            activeFilterChips: document.getElementById("activeFilterChips"),
            activeFilterSummary: document.getElementById("activeFilterSummary"),
            resultCountChip: document.getElementById("resultCountChip"),
            emptyState: document.getElementById("emptyState"),
            executiveSummaryChip: document.getElementById("executiveSummaryChip"),
            executiveSummarySmartline: document.getElementById("executiveSummarySmartline"),
            executiveSummaryGrid: document.getElementById("executiveSummaryGrid"),
            heroInsightTitle: document.getElementById("heroInsightTitle"),
            heroInsightValue: document.getElementById("heroInsightValue"),
            heroInsightCopy: document.getElementById("heroInsightCopy"),
            recommendedActionsList: document.getElementById("recommendedActionsList"),
            lossDriversList: document.getElementById("lossDriversList"),
            lossDriversChip: document.getElementById("lossDriversChip"),
            chartTakeaways: {
                topOverpay: document.getElementById("topOverpayTakeaway"),
                savings: document.getElementById("savingsTakeaway"),
                status: document.getElementById("statusTakeaway")
            },
            statusMixRecoverableSpend: document.getElementById("statusMixRecoverableSpend"),
            statusMixOverpayRate: document.getElementById("statusMixOverpayRate"),
            statusMixBreakdown: document.getElementById("statusMixBreakdown"),
            topOverpayChart: document.getElementById("topOverpayChart"),
            savingsChart: document.getElementById("savingsChart"),
            statusChart: document.getElementById("statusChart"),
            supplierIntelligence: {
                mostExpensive: document.getElementById("intel-most-expensive-supplier"),
                mostExpensiveInsight: document.getElementById("intel-most-expensive-supplier-insight"),
                mostExpensiveNote: document.getElementById("intel-most-expensive-supplier-note"),
                mostExpensiveTrend: document.getElementById("intel-most-expensive-supplier-trend"),
                bestValue: document.getElementById("intel-best-value-supplier"),
                bestValueInsight: document.getElementById("intel-best-value-supplier-insight"),
                bestValueNote: document.getElementById("intel-best-value-supplier-note"),
                bestValueTrend: document.getElementById("intel-best-value-supplier-trend"),
                highestRisk: document.getElementById("intel-highest-risk-supplier"),
                highestRiskInsight: document.getElementById("intel-highest-risk-supplier-insight"),
                highestRiskNote: document.getElementById("intel-highest-risk-supplier-note"),
                highestRiskTrend: document.getElementById("intel-highest-risk-supplier-trend")
            },
            filterControls: {
                product: {
                    shell: document.querySelector('.searchable-select[data-filter-key="product"]'),
                    trigger: document.getElementById("productFilterTrigger"),
                    value: document.getElementById("productFilterValue")
                },
                supplier: {
                    shell: document.querySelector('.searchable-select[data-filter-key="supplier"]'),
                    trigger: document.getElementById("supplierFilterTrigger"),
                    value: document.getElementById("supplierFilterValue")
                },
                status: {
                    shell: document.querySelector('.searchable-select[data-filter-key="status"]'),
                    trigger: document.getElementById("statusFilterTrigger"),
                    value: document.getElementById("statusFilterValue")
                }
            },
            filterPopoverRoot: ensureFilterPopoverRoot()
        };
    }

    function setSidePanelState(panel, toggle, isOpen, storageKey) {
        if (!panel || !toggle) return;
        panel.hidden = false;
        panel.classList.toggle("is-open", isOpen);
        panel.setAttribute("aria-hidden", isOpen ? "false" : "true");
        toggle.setAttribute("aria-pressed", isOpen ? "true" : "false");
        toggle.classList.toggle("is-active", isOpen);
        writeWorkspacePreference(storageKey, isOpen ? "true" : "false");
    }

    function syncSideRailLayout(elements) {
        if (!elements.appShell) return;
        const guideOpen = Boolean(elements.guidePanel?.classList.contains("is-open"));
        elements.appShell.classList.toggle("app-shell-guide-open", guideOpen);
    }

    function flashSavedIndicator(elements) {
        if (!elements.notesSavedIndicator) return;
        elements.notesSavedIndicator.textContent = "Saved";
        elements.notesSavedIndicator.classList.add("is-active");
        window.clearTimeout(window.__priceAnalyzerSavedIndicatorTimer);
        window.__priceAnalyzerSavedIndicatorTimer = window.setTimeout(() => {
            elements.notesSavedIndicator?.classList.remove("is-active");
        }, 1200);
    }

    function initSideWorkspace(elements) {
        const guideOpen = readWorkspacePreference("guidePanelOpen") === "true";
        const notesOpen = readWorkspacePreference("notesPanelOpen") === "true";
        const savedNotes = String(readWorkspacePreference("workspaceNotes") || "");

        if (elements.guidePanelToggle) {
            elements.guidePanelToggle.hidden = false;
        }
        if (elements.notesPanelToggle) {
            elements.notesPanelToggle.hidden = false;
        }
        if (elements.notesTextarea) {
            elements.notesTextarea.value = savedNotes;
        }
        if (elements.notesSavedIndicator) {
            elements.notesSavedIndicator.textContent = savedNotes ? "Saved" : "Ready";
        }

        setSidePanelState(elements.guidePanel, elements.guidePanelToggle, guideOpen, "guidePanelOpen");
        setSidePanelState(elements.notesPanel, elements.notesPanelToggle, notesOpen, "notesPanelOpen");
        syncSideRailLayout(elements);

        if (elements.guidePanelToggle && elements.guidePanelToggle.dataset.bound !== "true") {
            elements.guidePanelToggle.dataset.bound = "true";
            elements.guidePanelToggle.addEventListener("click", () => {
                const next = !elements.guidePanel?.classList.contains("is-open");
                setSidePanelState(elements.guidePanel, elements.guidePanelToggle, next, "guidePanelOpen");
                syncSideRailLayout(elements);
            });
        }

        if (elements.notesPanelToggle && elements.notesPanelToggle.dataset.bound !== "true") {
            elements.notesPanelToggle.dataset.bound = "true";
            elements.notesPanelToggle.addEventListener("click", () => {
                const next = !elements.notesPanel?.classList.contains("is-open");
                setSidePanelState(elements.notesPanel, elements.notesPanelToggle, next, "notesPanelOpen");
            });
        }

        if (elements.closeGuidePanelButton && elements.closeGuidePanelButton.dataset.bound !== "true") {
            elements.closeGuidePanelButton.dataset.bound = "true";
            elements.closeGuidePanelButton.addEventListener("click", () => {
                setSidePanelState(elements.guidePanel, elements.guidePanelToggle, false, "guidePanelOpen");
                syncSideRailLayout(elements);
            });
        }

        if (elements.closeNotesPanelButton && elements.closeNotesPanelButton.dataset.bound !== "true") {
            elements.closeNotesPanelButton.dataset.bound = "true";
            elements.closeNotesPanelButton.addEventListener("click", () => {
                setSidePanelState(elements.notesPanel, elements.notesPanelToggle, false, "notesPanelOpen");
            });
        }

        if (elements.notesTextarea && elements.notesTextarea.dataset.bound !== "true") {
            elements.notesTextarea.dataset.bound = "true";
            elements.notesTextarea.addEventListener("input", () => {
                writeWorkspacePreference("workspaceNotes", elements.notesTextarea.value);
                flashSavedIndicator(elements);
            });
        }

        if (elements.clearNotesButton && elements.clearNotesButton.dataset.bound !== "true") {
            elements.clearNotesButton.dataset.bound = "true";
            elements.clearNotesButton.addEventListener("click", () => {
                if (elements.notesTextarea) {
                    elements.notesTextarea.value = "";
                }
                writeWorkspacePreference("workspaceNotes", "");
                if (elements.notesSavedIndicator) {
                    elements.notesSavedIndicator.textContent = "Cleared";
                    elements.notesSavedIndicator.classList.add("is-active");
                    window.clearTimeout(window.__priceAnalyzerSavedIndicatorTimer);
                    window.__priceAnalyzerSavedIndicatorTimer = window.setTimeout(() => {
                        if (elements.notesSavedIndicator) {
                            elements.notesSavedIndicator.textContent = "Ready";
                            elements.notesSavedIndicator.classList.remove("is-active");
                        }
                    }, 1000);
                }
            });
        }

    }

    function createState() {
        return {
            allRows: [],
            visibleRows: [],
            metrics: null,
            filters: { ...defaultFilters },
            capabilities: { hasDate: false },
            sort: { field: null, direction: "asc" },
            charts: { topOverpay: null, savings: null, status: null },
            upload: {
                isSubmitting: false,
                hasUploadedAnalysis: false,
                review: null,
                feedback: { error: "", success: "", showReplace: false }
            },
            filterUi: {
                openKey: null,
                activeTrigger: null,
                queries: {
                    product: "",
                    supplier: "",
                    status: ""
                }
            }
        };
    }

    function isLocked(elements) {
        if (!elements.appShell) {
            return false;
        }
        return elements.appShell.hidden || elements.appShell.classList.contains("app-shell-locked");
    }

    function getUrlState() {
        const params = new URLSearchParams(window.location.search);
        const rawProduct = params.get("product") || defaultFilters.product;
        const normalizedProduct = String(rawProduct).trim().toLowerCase() === "all" ? "" : rawProduct;
        return {
            supplier: params.get("supplier") || defaultFilters.supplier,
            product: normalizedProduct,
            status: params.get("status") || defaultFilters.status,
            search: params.get("search") || defaultFilters.search,
            dateFrom: params.get("dateFrom") || defaultFilters.dateFrom,
            dateTo: params.get("dateTo") || defaultFilters.dateTo,
            sortField: params.get("sortField") || null,
            sortDirection: params.get("sortDirection") === "desc" ? "desc" : "asc"
        };
    }

    function stripInitialSortParams() {
        const params = new URLSearchParams(window.location.search);
        if (!params.has("sortField") && !params.has("sortDirection")) {
            return;
        }
        params.delete("sortField");
        params.delete("sortDirection");
        const nextUrl = params.toString() ? `${window.location.pathname}?${params}` : window.location.pathname;
        if (nextUrl === `${window.location.pathname}${window.location.search}`) {
            console.log("URL SYNC SKIPPED", {
                reason: "startup_sort_cleanup_unchanged",
                url: nextUrl
            });
            return;
        }
        window.history.replaceState({}, "", nextUrl);
        console.log("URL UPDATED", {
            url: nextUrl
        });
    }

    function applyUrlState(state, options = {}) {
        const { includeSort = false } = options;
        const url = getUrlState();
        state.filters = { ...state.filters, product: url.product, supplier: url.supplier, status: url.status, search: url.search, dateFrom: url.dateFrom, dateTo: url.dateTo };
        if (includeSort && url.sortField) {
            state.sort = { field: url.sortField, direction: url.sortDirection };
        } else {
            state.sort = { field: null, direction: "asc" };
        }
    }

    function syncUrl(state) {
        if (isInitializing || isSyncingUrl) {
            console.log("URL SYNC SKIPPED", {
                reason: isInitializing ? "initializing" : "sync_in_progress"
            });
            return;
        }
        console.log("URL SYNC START", {
            filters: { ...state.filters },
            sort: { ...state.sort }
        });
        const params = new URLSearchParams();
        if (state.filters.product !== defaultFilters.product) params.set("product", state.filters.product);
        if (state.filters.supplier !== defaultFilters.supplier) params.set("supplier", state.filters.supplier);
        if (state.filters.status !== defaultFilters.status) params.set("status", state.filters.status);
        if (state.filters.search.trim()) params.set("search", state.filters.search.trim());
        if (state.capabilities.hasDate && state.filters.dateFrom) params.set("dateFrom", state.filters.dateFrom);
        if (state.capabilities.hasDate && state.filters.dateTo) params.set("dateTo", state.filters.dateTo);
        if (state.sort.field) params.set("sortField", state.sort.field);
        if (state.sort.field && state.sort.direction !== "asc") params.set("sortDirection", state.sort.direction);
        const nextUrl = params.toString() ? `${window.location.pathname}?${params}` : window.location.pathname;
        const currentUrl = `${window.location.pathname}${window.location.search}`;
        if (nextUrl === currentUrl) {
            console.log("URL SYNC SKIPPED", {
                reason: "unchanged",
                url: nextUrl
            });
            return;
        }
        isSyncingUrl = true;
        try {
            window.history.replaceState({}, "", nextUrl);
        } finally {
            isSyncingUrl = false;
        }
        console.log("URL UPDATED", {
            url: nextUrl
        });
    }

    function getFilterControlConfig(state) {
        return {
            product: {
                allLabel: "All Products",
                selectedValue: state.filters.product,
                options: [...new Set(state.allRows.map((row) => row.productName))].sort((a, b) => a.localeCompare(b))
            },
            supplier: {
                allLabel: "All Suppliers",
                selectedValue: state.filters.supplier,
                options: [...new Set(state.allRows.map((row) => row.supplier))].sort((a, b) => a.localeCompare(b))
            },
            status: {
                allLabel: "All Statuses",
                selectedValue: state.filters.status,
                options: ["Overpay", "Good Deal", "Normal", "top5"]
            }
        };
    }

    function getFilterOptionLabel(key, value) {
        if (key === "status" && value === "top5") {
            return "Top 5 Savings";
        }
        return value;
    }

    function normalizeAppliedFilterValue(key, value) {
        const normalizedValue = String(value || "").trim();
        if (!normalizedValue) {
            return key === "product" ? "" : "all";
        }
        return normalizedValue;
    }

    function renderSearchableFilterOptions(elements, state, key) {
        const config = getFilterControlConfig(state)[key];
        const query = String(state.filterUi.queries[key] || "").trim().toLowerCase();
        const availableOptions = query
            ? config.options.filter((option) => option.toLowerCase().includes(query))
            : config.options;

        const selectedValue = normalizeAppliedFilterValue(key, config.selectedValue);
        const allLabel = config.allLabel;
        const allSelected = selectedValue === "" || selectedValue === "all";
        const allOptionMarkup = `<button type="button" class="filter-popover-option ${allSelected ? "is-selected" : ""}" data-filter-key="${key}" data-filter-value="">${allLabel}</button>`;

        if (!availableOptions.length) {
            return `${allOptionMarkup}<div class="filter-popover-empty">No matching options</div>`;
        }

        return `${allOptionMarkup}${availableOptions.map((option) => {
            const normalizedOptionValue = normalizeAppliedFilterValue(key, option);
            const isSelected = normalizedOptionValue === selectedValue;
            return `<button type="button" class="filter-popover-option ${isSelected ? "is-selected" : ""}" data-filter-key="${key}" data-filter-value="${option}">${getFilterOptionLabel(key, option)}</button>`;
        }).join("")}`;
    }

    function positionFilterPopover(elements, state) {
        const key = state.filterUi.openKey;
        const popoverRoot = elements.filterPopoverRoot;
        const trigger = state.filterUi.activeTrigger;
        const panel = popoverRoot?.querySelector(".filter-popover-panel");
        if (!popoverRoot || !trigger || !panel) return;

        const rect = trigger.getBoundingClientRect();
        const panelWidth = Math.max(rect.width, 220);
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const horizontalPadding = 16;
        const verticalGap = 8;
        let left = rect.left;
        let top = rect.bottom + verticalGap;

        if (left + panelWidth > viewportWidth - horizontalPadding) {
            left = Math.max(horizontalPadding, viewportWidth - panelWidth - horizontalPadding);
        }

        panel.style.width = `${panelWidth}px`;
        panel.style.left = `${left}px`;
        panel.style.top = `${top}px`;

        const panelRect = panel.getBoundingClientRect();
        if (panelRect.bottom > viewportHeight - horizontalPadding) {
            top = Math.max(horizontalPadding, rect.top - panelRect.height - verticalGap);
            panel.style.top = `${top}px`;
        }
    }

    function syncFilterFocusState(elements, state) {
        const isOpen = Boolean(state.filterUi.openKey);
        document.body.classList.toggle("filters-open", isOpen);
        if (elements.appShell) {
            elements.appShell.classList.toggle("filters-open", isOpen);
        }
    }

    function closeFilterDropdown(elements, state, key) {
        const control = elements.filterControls[key];
        if (control?.shell) {
            control.shell.classList.remove("is-open");
        }
        if (control?.trigger) {
            control.trigger.setAttribute("aria-expanded", "false");
        }
        if (state.filterUi.openKey === key) {
            state.filterUi.openKey = null;
        }
        if (state.filterUi.activeTrigger === control?.trigger) {
            state.filterUi.activeTrigger = null;
        }
        if (elements.filterPopoverRoot) {
            elements.filterPopoverRoot.hidden = true;
            elements.filterPopoverRoot.innerHTML = "";
        }
        syncFilterFocusState(elements, state);
    }

    function closeAllFilterDropdowns(elements, state, exceptKey = null) {
        Object.keys(elements.filterControls).forEach((key) => {
            if (key === exceptKey) return;
            closeFilterDropdown(elements, state, key);
        });
    }

    function renderFilterPopover(elements, state, key) {
        const popoverRoot = elements.filterPopoverRoot;
        const control = elements.filterControls[key];
        if (!popoverRoot || !control?.trigger) return;

        const searchPlaceholders = {
            product: "Search product...",
            supplier: "Search supplier...",
            status: "Search status..."
        };

        popoverRoot.hidden = false;
        popoverRoot.innerHTML = `
            <div class="filter-popover-panel" data-filter-key="${key}">
                <input
                    id="filterPopoverSearch"
                    class="filter-popover-search"
                    type="text"
                    placeholder="${searchPlaceholders[key]}"
                    autocomplete="off"
                    value="${state.filterUi.queries[key] || ""}"
                >
                <div class="filter-popover-options" id="filterPopoverOptions" role="listbox">
                    ${renderSearchableFilterOptions(elements, state, key)}
                </div>
            </div>
        `;

        requestAnimationFrame(() => {
            positionFilterPopover(elements, state);
        });

        const searchInput = popoverRoot.querySelector("#filterPopoverSearch");
        const optionsContainer = popoverRoot.querySelector("#filterPopoverOptions");

        if (searchInput) {
            searchInput.focus();
            searchInput.select();
            searchInput.addEventListener("input", (event) => {
                state.filterUi.queries[key] = event.target.value;
                if (optionsContainer) {
                    optionsContainer.innerHTML = renderSearchableFilterOptions(elements, state, key);
                }
                requestAnimationFrame(() => {
                    positionFilterPopover(elements, state);
                });
            });
            searchInput.addEventListener("keydown", (event) => {
                if (event.key === "Escape") {
                    closeFilterDropdown(elements, state, key);
                    control.trigger?.focus();
                    return;
                }
                if (event.key === "Enter") {
                    const firstOption = optionsContainer?.querySelector(".filter-popover-option");
                    if (!firstOption) return;
                    event.preventDefault();
                    firstOption.click();
                }
            });
        }

        if (optionsContainer) {
            optionsContainer.addEventListener("click", (event) => {
                const option = event.target.closest(".filter-popover-option");
                if (!option) return;
                const rawValue = option.dataset.filterValue || "";
                state.filters[key] = normalizeAppliedFilterValue(key, rawValue);
                state.filterUi.queries[key] = "";
                closeFilterDropdown(elements, state, key);
                refresh(elements, state);
            });
        }
    }

    function openFilterDropdown(elements, state, key) {
        const control = elements.filterControls[key];
        if (!control?.trigger || !control.shell) return;

        closeAllFilterDropdowns(elements, state, key);
        control.shell.classList.add("is-open");
        control.trigger.setAttribute("aria-expanded", "true");
        state.filterUi.openKey = key;
        state.filterUi.activeTrigger = control.trigger;
        syncFilterFocusState(elements, state);
        renderFilterPopover(elements, state, key);
    }

    function syncSearchableFilterControls(elements, state) {
        const config = getFilterControlConfig(state);
        Object.entries(elements.filterControls).forEach(([key, control]) => {
            if (!control?.value) return;
            const selectedValue = normalizeAppliedFilterValue(key, config[key].selectedValue);
            const isAllSelected = selectedValue === "" || selectedValue === "all";
            control.value.textContent = isAllSelected ? config[key].allLabel : getFilterOptionLabel(key, selectedValue);
            if (control.search) {
                control.search.value = state.filterUi.queries[key] || "";
            }
            renderSearchableFilterOptions(elements, state, key);
        });
    }

    function syncDateInputShells(elements) {
        [elements.dateFromInput, elements.dateToInput].forEach((input) => {
            const shell = input?.closest(".date-input-inline");
            if (!shell) return;
            shell.classList.toggle("has-value", Boolean(input.value));
        });
    }

    function syncControls(elements, state) {
        syncSearchableFilterControls(elements, state);
        if (elements.searchInput) elements.searchInput.value = state.filters.search;
        if (elements.dateFromInput) elements.dateFromInput.value = state.filters.dateFrom;
        if (elements.dateToInput) elements.dateToInput.value = state.filters.dateTo;
        syncDateInputShells(elements);
    }

    function renderTableStructure(elements, state) {
        if (!elements.tableHead) return;
        Table.renderHeader(elements.tableHead, state.sort);
    }

    function updateDateAvailability(elements, state) {
        state.capabilities.hasDate = state.allRows.some((row) => row.date);
        if (!elements.dateFilterGroup) return;
        elements.dateFilterGroup.classList.toggle("is-hidden", !state.capabilities.hasDate);
        elements.dateFromInput.disabled = !state.capabilities.hasDate;
        elements.dateToInput.disabled = !state.capabilities.hasDate;
        if (!state.capabilities.hasDate) state.filters.dateFrom = state.filters.dateTo = "";
        syncDateInputShells(elements);
    }

    function populateProducts(elements, state) {
        syncSearchableFilterControls(elements, state);
    }

    function populateSuppliers(elements, state) {
        state.filters.supplier = normalizeAppliedFilterValue("supplier", state.filters.supplier);
        syncSearchableFilterControls(elements, state);
    }

    function sanitizeState(state) {
        const statuses = ["all", "Overpay", "Good Deal", "Normal", "top5"];
        const sorts = ["productName", "supplier", "purchaseUnit", "quantity", "unitPrice", "totalAmount", "averagePrice", "overpay", "savingsOpportunity", "date", "status"];
        const normalizedProduct = String(state.filters.product || "").trim();
        if (normalizedProduct.toLowerCase() === "all") {
            state.filters.product = "";
        } else {
            state.filters.product = normalizedProduct;
        }
        const suppliers = new Set(["all", ...state.allRows.map((row) => row.supplier)]);
        if (!suppliers.has(state.filters.supplier)) state.filters.supplier = defaultFilters.supplier;
        if (!statuses.includes(state.filters.status)) state.filters.status = defaultFilters.status;
        if (!state.capabilities.hasDate) state.filters.dateFrom = state.filters.dateTo = "";
        if (!sorts.includes(state.sort.field)) state.sort = { field: null, direction: "asc" };
    }

    function clampScore(value) {
        return Math.max(0, Math.min(100, value));
    }

    function getProductKey(row) {
        return `${row.productName}||${row.purchaseUnit || "unit"}`;
    }

    function getProductLabel(rowOrItem) {
        return rowOrItem.purchaseUnit ? `${rowOrItem.productName || rowOrItem.name} (${rowOrItem.purchaseUnit})` : (rowOrItem.productName || rowOrItem.name);
    }

    function normalizeMetric(value, min, max, invert = false) {
        if (max === min) return 100;
        const base = ((value - min) / (max - min)) * 100;
        return clampScore(invert ? 100 - base : base);
    }

    function compareText(left, right) {
        const a = String(left || "").toLowerCase();
        const b = String(right || "").toLowerCase();
        if (a < b) return -1;
        if (a > b) return 1;
        return 0;
    }

    function compareNumber(left, right) {
        const a = Number(left || 0);
        const b = Number(right || 0);
        if (a < b) return -1;
        if (a > b) return 1;
        return 0;
    }

    function compareRowsBySortField(left, right, field) {
        switch (field) {
            case "productName":
                return compareText(left.productName, right.productName);
            case "supplier":
                return compareText(left.supplier, right.supplier);
            case "purchaseUnit":
                return compareText(left.purchaseUnit, right.purchaseUnit);
            case "quantity":
                return compareNumber(left.quantity, right.quantity);
            case "unitPrice":
                return compareNumber(left.unitPrice, right.unitPrice);
            case "totalAmount":
                return compareNumber(left.totalAmount, right.totalAmount);
            case "averagePrice":
                return compareNumber(left.averagePrice, right.averagePrice);
            case "overpay":
                return compareNumber(left.overpay, right.overpay);
            case "savingsOpportunity":
                return compareNumber(left.savingsOpportunity, right.savingsOpportunity);
            case "date":
                return compareText(left.date, right.date);
            case "status":
                return compareText(left.status, right.status);
            default:
                return 0;
        }
    }

    function getSortPreview(rows, field) {
        return rows.slice(0, 3).map((row) => row[field]);
    }

    function sortRows(rows, sortState) {
        if (!sortState.field) return rows;
        const sortedRows = [...rows];
        const directionMultiplier = sortState.direction === "asc" ? 1 : -1;
        sortedRows.sort((left, right) => {
            const comparison = compareRowsBySortField(left, right, sortState.field);
            if (comparison !== 0) {
                return comparison * directionMultiplier;
            }
            return compareText(left.productName, right.productName) || compareText(left.supplier, right.supplier);
        });
        return sortedRows;
    }

    function normalizeUploadedRows(rows) {
        return (rows || []).map((row) => ({
            productName: row["Product Name"] || "",
            supplier: row.Supplier || "",
            purchaseUnit: row.Unit || "",
            quantity: Number(row.Quantity || 0),
            unitPrice: Number(row["Unit Price"] || 0),
            price: Number(row["Unit Price"] || 0),
            totalAmount: Number(row["Total Amount"] || 0),
            averagePrice: Number(row["Average Price"] || 0),
            overpay: Number(row.Overpay || 0),
            overpayPct: Number(row["Overpay Pct"] || 0),
            savingsOpportunity: Number(row["Savings Opportunity"] || 0),
            date: row.Date || "",
            status: row.Status || "Normal"
        }));
    }

    function isValidAnalysisRow(row) {
        if (!row || typeof row !== "object") {
            return false;
        }

        const hasProduct = String(row.productName || "").trim().length > 0;
        const hasSupplier = String(row.supplier || "").trim().length > 0;
        const hasUnit = String(row.purchaseUnit || "").trim().length > 0;
        const hasDate = String(row.date || "").trim().length > 0;
        const hasNumericSignal = [
            row.quantity,
            row.unitPrice,
            row.price,
            row.totalAmount,
            row.averagePrice,
            row.overpay,
            row.overpayPct,
            row.savingsOpportunity
        ].some((value) => Number.isFinite(Number(value)) && Number(value) !== 0);

        return hasProduct && hasSupplier && hasUnit && hasDate && hasNumericSignal;
    }

    function hasValidAnalysisRows(rows) {
        return Array.isArray(rows) && rows.some((row) => isValidAnalysisRow(row));
    }

    function normalizeAnalysisSource(source) {
        const normalized = String(source || "").trim().toLowerCase();
        if (normalized === "upload" || normalized === "uploaded_file") return "uploaded_file";
        if (normalized === "demo" || normalized === "demo_data") return "demo_data";
        if (normalized === "restored" || normalized === "restored_analysis") return "restored_analysis";
        return "empty";
    }

    function resolveAnalyzerStep2State(elements, state) {
        const selectedFile = elements.fileInput?.files?.[0] || null;
        const hasSelectedFile = Boolean(selectedFile);
        const hasAnalysis = hasValidAnalysisRows(state.allRows);
        const source = normalizeAnalysisSource(elements.mainDashboardView?.dataset.analysisSource || "empty");

        if (state.upload.review && hasSelectedFile) {
            return { mode: "uploaded_file", phase: "review", selectedFile, hasAnalysis: false };
        }
        if (hasSelectedFile) {
            return { mode: "uploaded_file", phase: "selected", selectedFile, hasAnalysis: false };
        }
        if (hasAnalysis && source !== "empty") {
            return { mode: source, phase: "active", selectedFile: null, hasAnalysis: true };
        }
        return { mode: "empty", phase: "idle", selectedFile: null, hasAnalysis: false };
    }

    function setAnalysisSourceState(elements, source) {
        if (!elements.mainDashboardView) {
            return;
        }

        const normalizedSource = normalizeAnalysisSource(source || "empty");
        elements.mainDashboardView.dataset.analysisSource = normalizedSource;
        const showPrevious = normalizedSource === "restored_analysis";
        const showDemo = normalizedSource === "demo_data";

        if (elements.clearAnalysisForm) {
            elements.clearAnalysisForm.hidden = !showPrevious;
        }
        if (elements.previousAnalysisBadge) {
            elements.previousAnalysisBadge.hidden = !showPrevious;
        }
        if (elements.demoDatasetBadge) {
            elements.demoDatasetBadge.hidden = !showDemo;
        }
    }

    function getActiveAnalysisLabel(elements, source) {
        const filename = String(elements.mainDashboardView?.dataset.analysisFilename || "").trim();
        if (source === "demo_data") {
            return "Demo dataset ready";
        }
        if (source === "restored_analysis") {
            return filename || "Saved analysis ready";
        }
        return filename || "Current analysis ready";
    }

    function getActiveAnalysisStatusText(elements, source) {
        const filename = String(elements.mainDashboardView?.dataset.analysisFilename || "").trim();
        if (source === "demo_data") {
            return "Analysis ready for demo dataset";
        }
        if (filename) {
            return `Analysis ready for ${filename}`;
        }
        if (source === "restored_analysis") {
            return "Analysis ready for saved analysis";
        }
        return "Analysis ready";
    }

    function renderAnalyzerStep2(elements, state) {
        const resolvedState = resolveAnalyzerStep2State(elements, state);
        const feedback = state.upload.feedback || { error: "", success: "", showReplace: false };
        const dropzone = document.getElementById("uploadDropzone");

        if (elements.uploadError) {
            elements.uploadError.textContent = feedback.error || "";
            elements.uploadError.hidden = !feedback.error;
        }

        if (elements.fileName) {
            if (resolvedState.mode === "empty") {
                elements.fileName.textContent = "No file selected yet";
            } else if (resolvedState.mode === "uploaded_file" && resolvedState.phase !== "active") {
                elements.fileName.textContent = resolvedState.selectedFile?.name || "No file selected yet";
            } else {
                elements.fileName.textContent = getActiveAnalysisLabel(elements, resolvedState.mode);
            }
        }

        if (elements.uploadBox) {
            elements.uploadBox.classList.toggle("has-file", resolvedState.mode !== "empty");
        }
        if (dropzone) {
            dropzone.classList.toggle("has-file", resolvedState.mode !== "empty");
        }

        if (resolvedState.phase === "active") {
            renderUploadStatus(elements, {
                success: feedback.success || getActiveAnalysisStatusText(elements, resolvedState.mode),
                showReplace: feedback.showReplace !== false
            });
            setAnalysisSourceState(elements, resolvedState.mode);
        } else if (resolvedState.phase === "review" && feedback.success) {
            renderUploadStatus(elements, {
                success: feedback.success,
                showReplace: false
            });
            setAnalysisSourceState(elements, "empty");
        } else {
            renderUploadStatus(elements, { success: "", showReplace: false });
            setAnalysisSourceState(elements, "empty");
        }

        if (elements.uploadSubmitButton) {
            const shouldEnableSubmit = !state.upload.isSubmitting && resolvedState.mode === "uploaded_file";
            elements.uploadSubmitButton.disabled = !shouldEnableSubmit;
        }
    }

    function validateRestoredAnalysisState(elements, state) {
        const hasAnalysis = hasValidAnalysisRows(state.allRows);
        state.upload.hasUploadedAnalysis = hasAnalysis;

        if (!hasAnalysis) {
            state.allRows = [];
            state.visibleRows = [];
            state.metrics = null;
            state.filters = { ...defaultFilters };
            state.sort = { field: null, direction: "asc" };
            resetUploadUi(elements);
            resetUploadReview(elements, state);
            state.upload.feedback = { error: "", success: "", showReplace: false };
            setAnalysisSourceState(elements, "empty");
            if (elements.mainDashboardView) {
                elements.mainDashboardView.dataset.hasAnalysis = "false";
                elements.mainDashboardView.dataset.analysisFilename = "";
            }
            renderAnalyzerStep2(elements, state);
            return false;
        }

        const source = normalizeAnalysisSource(elements.mainDashboardView?.dataset.analysisSource || "empty");
        setAnalysisSourceState(elements, source);
        if (elements.mainDashboardView) {
            elements.mainDashboardView.dataset.hasAnalysis = "true";
        }
        state.upload.feedback = {
            error: "",
            success: getActiveAnalysisStatusText(elements, source),
            showReplace: source !== "demo_data"
        };
        renderAnalyzerStep2(elements, state);
        return true;
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function resetUploadReview(elements, state) {
        if (state?.upload) {
            state.upload.review = null;
        }
        if (elements.mappingReviewPanel) {
            elements.mappingReviewPanel.hidden = true;
        }
        if (elements.mappingGrid) {
            elements.mappingGrid.innerHTML = "";
        }
        if (elements.mappingSummaryChips) {
            elements.mappingSummaryChips.innerHTML = "";
        }
        if (elements.mappingMissingAlert) {
            elements.mappingMissingAlert.hidden = true;
            elements.mappingMissingAlert.textContent = "";
        }
        if (elements.mappingOptionalAlert) {
            elements.mappingOptionalAlert.hidden = true;
            elements.mappingOptionalAlert.innerHTML = "";
        }
        if (elements.mappingReviewIntro) {
            elements.mappingReviewIntro.textContent = "We detected likely matches from your file headers. Review and confirm the fields below before analysis.";
        }
        if (elements.confirmMappingButton) {
            elements.confirmMappingButton.disabled = true;
        }
    }

    function getCurrentMappingSelections(elements) {
        const mapping = {};
        if (!elements.mappingGrid) {
            return mapping;
        }
        elements.mappingGrid.querySelectorAll(".mapping-select[data-field-name]").forEach((select) => {
            mapping[select.dataset.fieldName] = select.value || "";
        });
        return mapping;
    }

    function updateMappingReviewState(elements, state) {
        const review = state.upload.review;
        if (!review) {
            if (elements.confirmMappingButton) {
                elements.confirmMappingButton.disabled = true;
            }
            return;
        }

        const mappings = getCurrentMappingSelections(elements);
        const missingFields = REQUIRED_UPLOAD_FIELDS.filter((fieldName) => !mappings[fieldName]);
        const duplicateColumns = Object.entries(mappings).reduce((accumulator, [fieldName, columnName]) => {
            if (!columnName) return accumulator;
            accumulator[columnName] = accumulator[columnName] || [];
            accumulator[columnName].push(fieldName);
            return accumulator;
        }, {});
        const duplicateMessages = Object.entries(duplicateColumns)
            .filter(([, fieldNames]) => fieldNames.length > 1)
            .map(([columnName, fieldNames]) => `"${columnName}" is assigned to ${fieldNames.join(", ")}.`);

        if (elements.mappingGrid) {
            elements.mappingGrid.querySelectorAll(".mapping-row[data-field-name]").forEach((row) => {
                const fieldName = row.dataset.fieldName;
                const select = row.querySelector(".mapping-select");
                const status = row.querySelector(".mapping-status");
                const selectedValue = mappings[fieldName] || "";
                const detectedValue = select?.dataset.detectedColumn || "";
                const detectedQuality = select?.dataset.detectedQuality || "missing";
                const isMissing = !selectedValue;
                const isChanged = Boolean(selectedValue) && selectedValue !== detectedValue;
                row.classList.toggle("is-missing", isMissing);

                if (!status) return;
                status.className = "mapping-status";
                if (isMissing) {
                    status.classList.add("is-missing");
                    status.textContent = "Required field still needs a column";
                } else if (!detectedValue) {
                    status.classList.add("is-strong");
                    status.textContent = "Manually selected";
                } else if (isChanged) {
                    status.classList.add("is-possible");
                    status.textContent = "Updated from auto-detected match";
                } else if (detectedQuality === "exact" || detectedQuality === "alias" || detectedQuality === "strong") {
                    status.classList.add("is-strong");
                    status.textContent = "Auto-detected with high confidence";
                } else {
                    status.classList.add("is-possible");
                    status.textContent = "Auto-detected as a likely match";
                }
            });
        }

        if (elements.mappingSummaryChips) {
            const matchedCount = REQUIRED_UPLOAD_FIELDS.length - missingFields.length;
            elements.mappingSummaryChips.innerHTML = `
                <span class="mapping-summary-chip">${matchedCount} of ${REQUIRED_UPLOAD_FIELDS.length} required fields mapped</span>
                <span class="mapping-summary-chip ${missingFields.length ? "is-warning" : ""}">${missingFields.length ? `${missingFields.length} still need attention` : "Ready for analysis"}</span>
            `;
        }

        const issues = [];
        if (missingFields.length) {
            issues.push(`Map the remaining required fields before analysis: ${missingFields.join(", ")}.`);
        }
        issues.push(...duplicateMessages);

        if (elements.mappingMissingAlert) {
            elements.mappingMissingAlert.hidden = issues.length === 0;
            elements.mappingMissingAlert.textContent = issues.join(" ");
        }

        const mappedColumns = new Set(Object.values(mappings).filter(Boolean));
        const availableColumns = review.available_columns || review.headers || [];
        const optionalColumns = availableColumns.filter((columnName) => !mappedColumns.has(columnName));
        if (elements.mappingOptionalAlert) {
            if (optionalColumns.length) {
                elements.mappingOptionalAlert.hidden = false;
                elements.mappingOptionalAlert.innerHTML = `
                    <strong>Extra columns found:</strong>
                    <div class="mapping-pill-list">${optionalColumns.map((columnName) => `<span class="mapping-pill">${escapeHtml(columnName)}</span>`).join("")}</div>
                `;
            } else {
                elements.mappingOptionalAlert.hidden = true;
                elements.mappingOptionalAlert.innerHTML = "";
            }
        }

        if (elements.confirmMappingButton) {
            elements.confirmMappingButton.disabled = missingFields.length > 0 || duplicateMessages.length > 0 || state.upload.isSubmitting;
        }
    }

    function renderMappingReview(elements, state, payload) {
        state.upload.review = payload;
        const availableColumns = payload.available_columns || payload.headers || [];
        console.log("[upload debug] renderMappingReview payload", {
            filename: payload.filename,
            fieldReviews: payload.field_reviews,
            availableColumns
        });
        if (elements.mappingReviewIntro) {
            elements.mappingReviewIntro.textContent = "We detected likely matches from your file headers. Review and confirm the fields below before analysis.";
        }
        if (elements.mappingGrid) {
            elements.mappingGrid.innerHTML = (payload.field_reviews || []).map((review) => {
                const fieldName = review.field_name || review.field || "";
                const selectedColumn = review.selected_column || review.detected_column || payload.mapping?.[fieldName] || "";
                const options = [
                    `<option value="">Choose a column</option>`,
                    ...availableColumns.map((columnName) => `
                        <option value="${escapeHtml(columnName)}" ${columnName === selectedColumn ? "selected" : ""}>${escapeHtml(columnName)}</option>
                    `)
                ].join("");
                return `
                    <div class="mapping-row ${selectedColumn ? "" : "is-missing"}" data-field-name="${escapeHtml(fieldName)}">
                        <div class="mapping-field-label">
                            <div class="mapping-field-title">${escapeHtml(fieldName)}</div>
                            <div class="mapping-field-help">${escapeHtml(REQUIRED_FIELD_HINTS[fieldName] || "Choose the best matching column from your file.")}</div>
                        </div>
                        <div>
                            <select class="mapping-select" data-field-name="${escapeHtml(fieldName)}" data-detected-column="${escapeHtml(review.detected_column || "")}" data-detected-quality="${escapeHtml(review.match_quality || "missing")}">
                                ${options}
                            </select>
                            <span class="mapping-status"></span>
                        </div>
                    </div>
                `;
            }).join("");
            console.log("[upload debug] mapping select count", elements.mappingGrid.querySelectorAll(".mapping-select").length);
            elements.mappingGrid.querySelectorAll(".mapping-select").forEach((select) => {
                select.addEventListener("change", () => {
                    updateMappingReviewState(elements, state);
                });
            });
        }
        if (elements.mappingReviewPanel) {
            elements.mappingReviewPanel.hidden = false;
        }
        setUploadFeedback(elements, {
            success: payload.filename ? `Headers detected for ${payload.filename}` : "Headers detected",
            showReplace: false
        });
        updateMappingReviewState(elements, state);
    }

    function renderUploadStatus(elements, { success = "", showReplace = false } = {}) {
        if (!elements.uploadStatusHost) {
            return;
        }
        if (!success) {
            elements.uploadStatusHost.innerHTML = "";
            return;
        }
        elements.uploadStatusHost.innerHTML = `
            <div class="success-text upload-success-row">
                <span>${success}</span>
                ${showReplace ? '<button type="button" class="secondary-btn upload-success-action" id="replaceFileButton">Replace File</button>' : ""}
            </div>
        `;
    }

    function setUploadFeedback(elements, { error = "", success = "", showReplace = false } = {}) {
        const state = window.__priceAnalyzerDashboardState;
        if (state?.upload) {
            state.upload.feedback = { error, success, showReplace };
            renderAnalyzerStep2(elements, state);
            return;
        }
        if (elements.uploadError) {
            elements.uploadError.textContent = error;
            elements.uploadError.hidden = !error;
        }
        renderUploadStatus(elements, { success, showReplace });
    }

    function resetUploadUi(elements) {
        if (elements.fileInput) {
            elements.fileInput.value = "";
        }
        const uploadBox = document.getElementById("uploadBox");
        const dropzone = document.getElementById("uploadDropzone");
        if (uploadBox) {
            uploadBox.classList.remove("has-file", "is-dragging");
        }
        if (dropzone) {
            dropzone.classList.remove("has-file", "is-dragging");
        }
    }

    function resetAnalysisState(elements, state) {
        state.upload.hasUploadedAnalysis = false;
        state.upload.feedback = { error: "", success: "", showReplace: false };
        state.allRows = [];
        state.visibleRows = [];
        state.metrics = null;
        state.filters = { ...defaultFilters };
        state.sort = { field: null, direction: "asc" };
        updateDateAvailability(elements, state);
        sanitizeState(state);
        populateProducts(elements, state);
        populateSuppliers(elements, state);
        if (elements.mainDashboardView) {
            elements.mainDashboardView.dataset.hasAnalysis = "false";
            elements.mainDashboardView.dataset.analysisFilename = "";
        }
        setAnalysisSourceState(elements, "empty");
        syncRecipesAvailability(elements, false);
        if (elements.askDataPanel) {
            elements.askDataPanel.hidden = true;
        }
        renderAnalyzerStep2(elements, state);
        refresh(elements, state);
    }

    function replaceUploadedFile(elements, state) {
        resetUploadUi(elements);
        resetUploadReview(elements, state);
        setUploadFeedback(elements, { showReplace: false });
        resetAnalysisState(elements, state);
        if (elements.fileInput) {
            window.setTimeout(() => {
                elements.fileInput.click();
            }, 0);
        }
    }

    function applyUploadedAnalysis(payload, elements, state) {
        resetUploadReview(elements, state);
        state.upload.hasUploadedAnalysis = true;
        state.allRows = normalizeUploadedRows(payload.rows);
        state.visibleRows = [...state.allRows];
        state.filters = { ...defaultFilters };
        state.sort = { field: null, direction: "asc" };
        updateDateAvailability(elements, state);
        sanitizeState(state);
        populateProducts(elements, state);
        populateSuppliers(elements, state);
        if (elements.mainDashboardView) {
            elements.mainDashboardView.dataset.hasAnalysis = state.allRows.length > 0 ? "true" : "false";
            elements.mainDashboardView.dataset.analysisSource = "uploaded_file";
            elements.mainDashboardView.dataset.analysisFilename = payload.filename || "";
        }
        setAnalysisSourceState(elements, state.allRows.length > 0 ? "uploaded_file" : "empty");
        syncRecipesAvailability(elements, state.allRows.length > 0);
        if (elements.askDataPanel) {
            elements.askDataPanel.hidden = state.allRows.length === 0;
        }
        state.upload.feedback = {
            error: "",
            success: payload.filename ? `Analysis ready for ${payload.filename}` : "Analysis ready",
            showReplace: true
        };
        renderAnalyzerStep2(elements, state);
        refresh(elements, state);
        window.requestAnimationFrame(() => {
            setStoredCollapsibleState("guidedEntryCollapsed", true);
            setStoredCollapsibleState("uploadAnalyzeCollapsed", true);
            setStoredCollapsibleState("topInsightsCollapsed", false);
            setStoredCollapsibleState("analystWorkspaceCollapsed", false);
        });
    }

    async function submitUpload(elements, state) {
        if (!elements.fileInput || !elements.uploadForm) {
            return;
        }
        const file = elements.fileInput.files?.[0];
        if (!file) {
            setUploadFeedback(elements, {
                error: "Please choose a CSV or Excel file before analyzing."
            });
            return;
        }
        if (state.upload.isSubmitting) {
            return;
        }

        state.upload.isSubmitting = true;
        if (elements.uploadSubmitButton) {
            elements.uploadSubmitButton.disabled = true;
        }
        if (elements.confirmMappingButton) {
            elements.confirmMappingButton.disabled = true;
        }
        resetUploadReview(elements, state);
        setUploadFeedback(elements, {});

        const formData = new FormData();
        formData.append("file", file);
        console.log("UPLOAD STARTED");

        try {
            const response = await fetch("/upload/inspect", {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "X-Requested-With": "XMLHttpRequest"
                },
                body: formData
            });

            const data = await response.json();
            if (!response.ok || data.success !== true) {
                throw new Error(data.message || "Upload failed.");
            }

            console.log("UPLOAD SUCCESS", data);
            renderMappingReview(elements, state, data);
        } catch (error) {
            console.error("[upload] request failed", error);
            setUploadFeedback(elements, {
                error: error.message || "The upload could not be processed."
            });
        } finally {
            state.upload.isSubmitting = false;
            if (elements.uploadSubmitButton) {
                elements.uploadSubmitButton.disabled = false;
            }
            updateMappingReviewState(elements, state);
        }
    }

    async function confirmUploadMappings(elements, state) {
        if (!elements.fileInput) {
            return;
        }
        const file = elements.fileInput.files?.[0];
        if (!file) {
            setUploadFeedback(elements, {
                error: "Choose a file before confirming your column mappings."
            });
            return;
        }
        if (!state.upload.review) {
            setUploadFeedback(elements, {
                error: "Review your detected column matches before continuing."
            });
            return;
        }
        const mappings = getCurrentMappingSelections(elements);
        const missingFields = REQUIRED_UPLOAD_FIELDS.filter((fieldName) => !mappings[fieldName]);
        if (missingFields.length) {
            updateMappingReviewState(elements, state);
            setUploadFeedback(elements, {
                error: `Map the remaining required fields before analysis: ${missingFields.join(", ")}.`
            });
            return;
        }
        if (state.upload.isSubmitting) {
            return;
        }

        state.upload.isSubmitting = true;
        if (elements.uploadSubmitButton) {
            elements.uploadSubmitButton.disabled = true;
        }
        if (elements.confirmMappingButton) {
            elements.confirmMappingButton.disabled = true;
        }
        setUploadFeedback(elements, {});

        const formData = new FormData();
        formData.append("file", file);
        formData.append("mappings", JSON.stringify(mappings));

        try {
            const response = await fetch("/upload/confirm", {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "X-Requested-With": "XMLHttpRequest"
                },
                body: formData
            });
            const data = await response.json();
            if (!response.ok || data.success !== true) {
                throw new Error(data.message || "Analysis could not be completed.");
            }

            applyUploadedAnalysis(data, elements, state);
        } catch (error) {
            console.error("[upload confirm] request failed", error);
            setUploadFeedback(elements, {
                error: error.message || "The analysis could not be completed."
            });
        } finally {
            state.upload.isSubmitting = false;
            if (elements.uploadSubmitButton) {
                elements.uploadSubmitButton.disabled = false;
            }
            updateMappingReviewState(elements, state);
        }
    }

    function buildSupplierInsight(supplier) {
        const parts = [];
        if (supplier.winRate >= 0.6 && supplier.winCount > 0) {
            parts.push(`Strong price advantage across ${supplier.winCount} comparable product${supplier.winCount === 1 ? "" : "s"}`);
        } else if (supplier.winRate >= 0.3 && supplier.winCount > 0) {
            parts.push(`Competitive on ${Table.formatPercent(supplier.winRate * 100)} of comparable products`);
        } else if (supplier.comparableProducts > 0) {
            parts.push(`Low visible win rate at ${Table.formatPercent(supplier.winRate * 100)}`);
        } else {
            parts.push("No comparable products in the visible slice");
        }

        if (supplier.totalOverpay > 0 && supplier.overpayContributionShare >= 0.35) {
            parts.push("elevated extra spend exposure");
        } else if (supplier.avgOverpayPct <= 0) {
            parts.push("favorable visible pricing");
        } else if (supplier.avgOverpayPct > 5) {
            parts.push("weak overpay control");
        } else {
            parts.push("balanced visible pricing");
        }

        if (supplier.spendShare >= 0.35) {
            parts.push("high spend concentration");
        }

        return `${parts[0]} with ${parts.slice(1).join(" and ")}`;
    }

    function buildSupplierScores(rows) {
        const supplierMap = {};
        const productSupplierMap = {};
        const totalVisibleSpend = rows.reduce((sum, row) => sum + row.totalAmount, 0);
        const totalVisibleOverpay = rows.reduce((sum, row) => sum + row.savingsOpportunity, 0);

        rows.forEach((row, index) => {
            const supplier = supplierMap[row.supplier] || (supplierMap[row.supplier] = {
                supplier: row.supplier,
                name: row.supplier,
                order: Object.keys(supplierMap).length,
                rowCount: 0,
                totalSpend: 0,
                totalOverpay: 0,
                overpaySum: 0,
                winCount: 0,
                comparableProducts: 0,
                spendShare: 0,
                winRate: 0,
                avgOverpayPct: 0,
                score: 0,
                rank: 0,
                insight: "",
                comparableProductNames: new Set(),
                rowIndexes: []
            });

            supplier.rowCount += 1;
            supplier.totalSpend += row.totalAmount;
            supplier.totalOverpay += row.savingsOpportunity;
            supplier.overpaySum += row.overpayPct;
            supplier.rowIndexes.push(index);

            const productEntry = productSupplierMap[getProductKey(row)] || (productSupplierMap[getProductKey(row)] = {});
            const supplierProduct = productEntry[row.supplier] || (productEntry[row.supplier] = {
                totalPrice: 0,
                rowCount: 0
            });
            supplierProduct.totalPrice += row.unitPrice;
            supplierProduct.rowCount += 1;
        });

        Object.values(productSupplierMap).forEach((productEntry) => {
            const suppliers = Object.entries(productEntry).map(([supplierName, values]) => ({
                supplierName,
                averagePrice: values.rowCount ? values.totalPrice / values.rowCount : 0
            }));
            if (suppliers.length <= 1) return;

            const lowestAveragePrice = Math.min(...suppliers.map((item) => item.averagePrice));
            const winners = suppliers.filter((item) => item.averagePrice === lowestAveragePrice);

            suppliers.forEach((item) => {
                supplierMap[item.supplierName].comparableProducts += 1;
            });

            winners.forEach((item) => {
                supplierMap[item.supplierName].winCount += 1 / winners.length;
            });
        });

        const suppliers = Object.values(supplierMap).map((item) => ({
            ...item,
            spendShare: totalVisibleSpend ? item.totalSpend / totalVisibleSpend : 0,
            winRate: item.comparableProducts ? item.winCount / item.comparableProducts : 0,
            avgOverpayPct: item.rowCount ? item.overpaySum / item.rowCount : 0,
            overpayContributionShare: totalVisibleOverpay ? item.totalOverpay / totalVisibleOverpay : 0
        }));

        if (!suppliers.length) return [];

        const competitivenessValues = suppliers.map((item) => item.avgOverpayPct);
        const winRateValues = suppliers.map((item) => item.winRate);
        const spendShareValues = suppliers.map((item) => item.spendShare);
        const overpayContributionValues = suppliers.map((item) => item.overpayContributionShare);

        const competitivenessMin = Math.min(...competitivenessValues);
        const competitivenessMax = Math.max(...competitivenessValues);
        const winRateMin = Math.min(...winRateValues);
        const winRateMax = Math.max(...winRateValues);
        const spendShareMin = Math.min(...spendShareValues);
        const spendShareMax = Math.max(...spendShareValues);
        const overpayContributionMin = Math.min(...overpayContributionValues);
        const overpayContributionMax = Math.max(...overpayContributionValues);

        const scoredSuppliers = suppliers.map((item) => {
            const normalizedCompetitiveness = normalizeMetric(item.avgOverpayPct, competitivenessMin, competitivenessMax, true);
            const normalizedWinRate = normalizeMetric(item.winRate, winRateMin, winRateMax, false);
            const normalizedSpendShare = normalizeMetric(item.spendShare, spendShareMin, spendShareMax, false);
            const normalizedOverpayPenalty = normalizeMetric(item.overpayContributionShare, overpayContributionMin, overpayContributionMax, true);
            const score = clampScore(
                (normalizedCompetitiveness * 0.4) +
                (normalizedWinRate * 0.25) +
                (normalizedSpendShare * 0.15) +
                (normalizedOverpayPenalty * 0.2)
            );

            const supplier = {
                ...item,
                score,
                normalizedCompetitiveness,
                normalizedWinRate,
                normalizedSpendShare,
                normalizedOverpayPenalty
            };
            supplier.insight = buildSupplierInsight(supplier);
            return supplier;
        }).sort((a, b) => b.score - a.score || a.avgOverpayPct - b.avgOverpayPct || b.winRate - a.winRate || b.totalSpend - a.totalSpend || a.order - b.order)
            .map((item, index) => ({
                ...item,
                rank: index + 1
            }));

        return scoredSuppliers;
    }

    function aggregate(rows) {
        const productMap = {};
        const supplierMap = {};
        const statusCounts = { Overpay: 0, "Good Deal": 0, Normal: 0 };
        let totalVariance = 0;
        let largestSavingsRow = null;

        rows.forEach((row) => {
            totalVariance += Math.abs(row.overpayPct);
            statusCounts[row.status] = (statusCounts[row.status] || 0) + 1;

            const product = productMap[getProductKey(row)] || (productMap[getProductKey(row)] = {
                name: row.productName,
                productName: row.productName,
                purchaseUnit: row.purchaseUnit || "",
                totalSavings: 0,
                totalVariance: 0,
                totalSpend: 0,
                overpayRows: 0,
                rowCount: 0,
                suppliers: new Set()
            });
            product.totalSavings += row.savingsOpportunity;
            product.totalVariance += row.overpayPct;
            product.totalSpend += row.totalAmount;
            product.rowCount += 1;
            product.suppliers.add(row.supplier);
            if (row.status === "Overpay") product.overpayRows += 1;

            const supplier = supplierMap[row.supplier] || (supplierMap[row.supplier] = {
                name: row.supplier, totalRows: 0, totalSpend: 0, totalSavings: 0, overpaySum: 0, goodDealCount: 0
            });
            supplier.totalRows += 1;
            supplier.totalSpend += row.totalAmount;
            supplier.totalSavings += row.savingsOpportunity;
            supplier.overpaySum += row.overpayPct;
            if (row.status === "Good Deal") supplier.goodDealCount += 1;

            if (!largestSavingsRow || row.savingsOpportunity > largestSavingsRow.savingsOpportunity) largestSavingsRow = row;
        });

        const products = Object.values(productMap).map((item) => ({
            ...item,
            displayName: getProductLabel(item),
            averageOverpayPct: item.rowCount ? item.totalVariance / item.rowCount : 0,
            supplierCount: item.suppliers.size
        })).sort((a, b) => b.totalSavings - a.totalSavings || b.overpayRows - a.overpayRows || b.averageOverpayPct - a.averageOverpayPct);

        const suppliers = Object.values(supplierMap).map((item) => ({
            ...item,
            averageOverpayPct: item.totalRows ? item.overpaySum / item.totalRows : 0
        })).sort((a, b) => a.averageOverpayPct - b.averageOverpayPct || b.goodDealCount - a.goodDealCount || b.totalSpend - a.totalSpend);
        const supplierScores = buildSupplierScores(rows);
        const bestSupplierScore = supplierScores[0] || null;
        const rawWorstSupplierScore = supplierScores.length ? supplierScores[supplierScores.length - 1] : null;
        const rawMostExpensiveSupplier = [...suppliers]
            .sort((a, b) => b.averageOverpayPct - a.averageOverpayPct || b.totalSavings - a.totalSavings || b.totalSpend - a.totalSpend)[0] || null;
        const worstSupplierScore = rawWorstSupplierScore && (rawWorstSupplierScore.totalOverpay > 0 || rawWorstSupplierScore.avgOverpayPct > 0)
            ? rawWorstSupplierScore
            : null;
        const mostExpensiveSupplier = rawMostExpensiveSupplier && (rawMostExpensiveSupplier.totalSavings > 0 || rawMostExpensiveSupplier.averageOverpayPct > 0)
            ? rawMostExpensiveSupplier
            : null;

        const topLossProducts = products.filter((item) => item.totalSavings > 0 || item.overpayRows > 0).slice(0, 4);
        const overpayItems = rows.filter((row) => row.status === "Overpay").length;
        const extraSpend = rows.reduce((sum, row) => sum + row.savingsOpportunity, 0);
        const affectedProductCount = products.filter((item) => item.overpayRows > 0 || item.totalSavings > 0).length;

        return {
            totalRows: rows.length,
            overpayItems,
            extraSpend,
            affectedProductCount,
            overpayRate: rows.length ? (overpayItems / rows.length) * 100 : 0,
            averageVariance: rows.length ? totalVariance / rows.length : 0,
            topLossProduct: topLossProducts[0] || null,
            bestPerformingSupplier: suppliers[0] || null,
            bestSupplierScore,
            worstSupplierScore,
            mostExpensiveSupplier,
            largestSavingsRow,
            topLossProducts,
            supplierLeaders: supplierScores.slice(0, 5),
            supplierScores,
            topOverpayLabels: topLossProducts.map((item) => item.displayName),
            topOverpayValues: topLossProducts.map((item) => Number(item.totalSavings.toFixed(2))),
            savingsLabels: products.slice(0, 5).map((item) => item.displayName),
            savingsValues: products.slice(0, 5).map((item) => Number(item.totalSavings.toFixed(2))),
            statusCounts,
            statusLabels: Object.keys(statusCounts),
            statusValues: Object.values(statusCounts)
        };
    }

    function updateKpis(elements, metrics) {
        const m = metrics;
        const intel = elements.supplierIntelligence;
        if (!intel.mostExpensive) return;

        intel.mostExpensive.innerText = m.mostExpensiveSupplier ? m.mostExpensiveSupplier.name : "No supplier yet";
        intel.mostExpensiveInsight.innerText = m.mostExpensiveSupplier
            ? `${signedPercent(m.mostExpensiveSupplier.averageOverpayPct)} average variance with ${Table.formatCurrency(m.mostExpensiveSupplier.totalSavings)} of visible leakage.`
            : "No supplier pricing variance is visible yet.";
        intel.mostExpensiveNote.innerText = m.mostExpensiveSupplier
            ? `${m.mostExpensiveSupplier.totalRows} visible row${m.mostExpensiveSupplier.totalRows === 1 ? "" : "s"} and ${Table.formatCurrency(m.mostExpensiveSupplier.totalSpend)} visible spend are tied to this supplier.`
            : "Analyze a dataset to see which supplier is drifting furthest above value.";
        intel.mostExpensiveTrend.innerText = m.mostExpensiveSupplier
            ? `Leakage ${Table.formatCurrency(m.mostExpensiveSupplier.totalSavings)}`
            : "Awaiting supplier signal";

        intel.bestValue.innerText = m.bestSupplierScore ? m.bestSupplierScore.supplier : "No visible leader";
        intel.bestValueInsight.innerText = m.bestSupplierScore
            ? `Score ${m.bestSupplierScore.score.toFixed(1)} with ${Table.formatPercent(m.bestSupplierScore.winRate * 100)} win rate and ${signedPercent(m.bestSupplierScore.avgOverpayPct)} average variance.`
            : "Supplier strength appears once visible rows are available.";
        intel.bestValueNote.innerText = m.bestSupplierScore
            ? `${Table.formatCurrency(m.bestSupplierScore.totalSpend)} visible spend | ${m.bestSupplierScore.insight}.`
            : "No supplier benchmark is available in the current slice.";
        intel.bestValueTrend.innerText = m.bestSupplierScore
            ? `Rank #${m.bestSupplierScore.rank}`
            : "Awaiting benchmark";

        intel.highestRisk.innerText = m.worstSupplierScore ? m.worstSupplierScore.supplier : "No supplier yet";
        intel.highestRiskInsight.innerText = m.worstSupplierScore
            ? `${Table.formatCurrency(m.worstSupplierScore.totalOverpay)} recoverable leakage with ${signedPercent(m.worstSupplierScore.avgOverpayPct)} average variance.`
            : "No supplier risk signal is visible right now.";
        intel.highestRiskNote.innerText = m.worstSupplierScore
            ? `${m.worstSupplierScore.rowCount} visible row${m.worstSupplierScore.rowCount === 1 ? "" : "s"} and ${Table.formatCurrency(m.worstSupplierScore.totalSpend)} spend are exposed to this supplier.`
            : "The current slice does not show a clear supplier risk leader.";
        intel.highestRiskTrend.innerText = m.worstSupplierScore
            ? `Score ${m.worstSupplierScore.score.toFixed(1)}`
            : "Risk watch";
    }

    function buildRecommendedActions(metrics) {
        const actions = [];

        if (
            metrics.largestSavingsRow &&
            metrics.bestSupplierScore &&
            metrics.bestSupplierScore.supplier !== metrics.largestSavingsRow.supplier &&
            metrics.largestSavingsRow.savingsOpportunity > 0
        ) {
            actions.push({
                title: `Switch supplier review on ${getProductLabel(metrics.largestSavingsRow)}`,
                copy: `${metrics.largestSavingsRow.supplier} is currently the costly choice. Compare against ${metrics.bestSupplierScore.supplier} first. Expected value: ${Table.formatCurrency(metrics.largestSavingsRow.savingsOpportunity)}.`
            });
        }

        if (metrics.topLossProduct) {
            actions.push({
                title: `Renegotiate ${metrics.topLossProduct.displayName}`,
                copy: `${metrics.topLossProduct.overpayRows} visible row${metrics.topLossProduct.overpayRows === 1 ? "" : "s"} are driving this issue. Expected value: ${Table.formatCurrency(metrics.topLossProduct.totalSavings)}.`
            });
        }

        if (metrics.worstSupplierScore && metrics.worstSupplierScore.totalOverpay > 0) {
            actions.push({
                title: `Escalate pricing with ${metrics.worstSupplierScore.supplier}`,
                copy: `${Table.formatCurrency(metrics.worstSupplierScore.totalOverpay)} of visible leakage sits with this supplier. Expected value: reduce exposure across ${metrics.worstSupplierScore.rowCount} row${metrics.worstSupplierScore.rowCount === 1 ? "" : "s"}.`
            });
        }

        if (metrics.largestSavingsRow && actions.length < 3) {
            actions.push({
                title: `Monitor price movement on ${getProductLabel(metrics.largestSavingsRow)}`,
                copy: `${metrics.largestSavingsRow.supplier} is pricing at ${Table.formatCurrency(metrics.largestSavingsRow.unitPrice)} versus ${Table.formatCurrency(metrics.largestSavingsRow.averagePrice)} average. Expected value at risk: ${Table.formatCurrency(metrics.largestSavingsRow.savingsOpportunity)}.`
            });
        }

        while (actions.length < 3 && metrics.topLossProduct) {
            actions.push({
                title: `Monitor affected products in ${metrics.topLossProduct.displayName}`,
                copy: `${metrics.affectedProductCount} product${metrics.affectedProductCount === 1 ? "" : "s"} are affected in the visible slice. Expected value: protect ${Table.formatCurrency(metrics.extraSpend)} from further drift.`
            });
        }

        if (!actions.length) {
            actions.push({
                title: "Maintain current pricing watch",
                copy: "No immediate overpay signal is visible in the current slice, so use the charts and table to monitor any new variance."
            });
        }
        return actions.slice(0, 3);
    }

    function buildExecutiveSummaryLine(metrics) {
        if (!metrics.totalRows) {
            return "Upload and analyze a dataset to surface the highest-impact overpay signals first.";
        }
        if (metrics.topLossProduct && metrics.worstSupplierScore) {
            return `Your current cost pressure is mainly driven by ${metrics.worstSupplierScore.supplier} supplier pricing and unusually high ${metrics.topLossProduct.displayName} costs.`;
        }
        if (metrics.topLossProduct) {
            return `Most excess spend is concentrated in a small group of products, led by ${metrics.topLossProduct.displayName}.`;
        }
        if (metrics.worstSupplierScore) {
            return `${metrics.worstSupplierScore.supplier} is carrying the weakest supplier signal in the current view, even though total overpay remains limited.`;
        }
        return "The current view is relatively healthy, with no major overpay concentration visible right now.";
    }

    function updateExecutiveSummary(elements, rows, metrics) {
        const m = metrics;
        const actions = buildRecommendedActions(m);

        if (elements.heroInsightTitle) {
            elements.heroInsightTitle.textContent = !rows.length
                ? "What is the main problem?"
                : m.topLossProduct
                    ? `${m.topLossProduct.displayName} is your main pricing issue`
                    : "Your current slice has no active overpay issue";
        }
        if (elements.heroInsightValue) {
            elements.heroInsightValue.textContent = Table.formatCurrency(m.extraSpend);
        }
        if (elements.heroInsightCopy) {
            elements.heroInsightCopy.textContent = !rows.length
                ? "Analyze a file to surface one clear pricing problem, the products affected, and the next best move."
                : m.topLossProduct
                    ? `${Table.formatCurrency(m.extraSpend)} is currently recoverable. The biggest driver is ${m.topLossProduct.displayName}, affecting ${m.affectedProductCount} product${m.affectedProductCount === 1 ? "" : "s"} in the visible slice.`
                    : "The current slice looks healthy, with no meaningful overpay concentration visible right now.";
        }
        if (elements.executiveSummaryGrid) {
            const heroMetrics = !rows.length ? [
                { label: "Biggest Issue", value: "Waiting for upload" },
                { label: "Overpay Rate", value: "0.00%" },
                { label: "Affected Products", value: "0" },
                { label: "Priority Supplier", value: "Waiting for upload" }
            ] : [
                { label: "Biggest Issue", value: m.topLossProduct ? m.topLossProduct.displayName : "No active issue" },
                { label: "Overpay Rate", value: Table.formatPercent(m.overpayRate) },
                { label: "Affected Products", value: String(m.affectedProductCount) },
                { label: "Priority Supplier", value: m.worstSupplierScore ? m.worstSupplierScore.supplier : "No active supplier risk" }
            ];
            elements.executiveSummaryGrid.innerHTML = heroMetrics.map((metric) => `
                <article class="hero-metric-card">
                    <div class="hero-metric-label">${metric.label}</div>
                    <div class="hero-metric-value">${metric.value}</div>
                </article>
            `).join("");
        }
        if (elements.recommendedActionsList) {
            elements.recommendedActionsList.innerHTML = actions.map((action, index) => `<article class="action-priority-item"><div class="action-priority-index">${String(index + 1).padStart(2, "0")}</div><div class="action-priority-content"><div class="action-priority-title">${action.title}</div><p class="action-priority-copy">${action.copy}</p></div></article>`).join("");
        }
        if (elements.executiveSummarySmartline) {
            elements.executiveSummarySmartline.textContent = buildExecutiveSummaryLine(m);
        }
        if (elements.executiveSummaryChip) elements.executiveSummaryChip.textContent = `${rows.length} row${rows.length === 1 ? "" : "s"} in view`;
    }

    function renderDecisionLists(elements, metrics) {
        const m = metrics;
        if (elements.lossDriversChip) elements.lossDriversChip.textContent = `${m.topLossProducts.length} product${m.topLossProducts.length === 1 ? "" : "s"} highlighted`;
        if (elements.lossDriversList) elements.lossDriversList.innerHTML = m.topLossProducts.length ? m.topLossProducts.map((item, index) => `<article class="decision-item"><div class="decision-item-rank">#${index + 1}</div><div class="decision-item-body"><div class="decision-item-title">${item.displayName}</div><div class="decision-item-meta">${item.overpayRows} overpay row${item.overpayRows === 1 ? "" : "s"} | ${item.supplierCount} supplier comparison${item.supplierCount === 1 ? "" : "s"} | ${Table.formatPercent(item.averageOverpayPct)} average variance</div><div class="decision-item-meta">Expected savings: ${Table.formatCurrency(item.totalSavings)} from the visible slice.</div></div><div class="decision-item-value negative">${Table.formatCurrency(item.totalSavings)}</div></article>`).join("") : '<div class="decision-list-empty">No savings opportunities under current filters.</div>';
    }

    function updateChartTakeaways(elements, metrics) {
        const m = metrics;
        if (elements.chartTakeaways.topOverpay) elements.chartTakeaways.topOverpay.textContent = m.topLossProduct ? `${m.topLossProduct.displayName} is the biggest source of visible margin leakage at ${Table.formatCurrency(m.topLossProduct.totalSavings)} across ${m.topLossProduct.overpayRows} overpay row${m.topLossProduct.overpayRows === 1 ? "" : "s"}.` : "No savings opportunities under current filters.";
        if (elements.chartTakeaways.savings) elements.chartTakeaways.savings.textContent = m.largestSavingsRow ? `${getProductLabel(m.largestSavingsRow)} with ${m.largestSavingsRow.supplier} anchors the strongest single recovery opportunity at ${Table.formatCurrency(m.largestSavingsRow.overpay)} above average.` : "No savings opportunities under current filters.";
        if (elements.chartTakeaways.status) elements.chartTakeaways.status.textContent = m.overpayRate ? `${Table.formatPercent(m.overpayRate)} of visible rows are overpay, with ${Table.formatCurrency(m.extraSpend)} recoverable across ${m.overpayItems} exception row${m.overpayItems === 1 ? "" : "s"}.` : `No savings opportunities under current filters. Average variance is ${Table.formatPercent(m.averageVariance)}.`;
    }

    function updateStatusMixPanel(elements, metrics) {
        const m = metrics;
        const totalRows = m.totalRows || 0;
        const breakdown = [
            { label: "Overpay", key: "Overpay", className: "overpay" },
            { label: "Good Deal", key: "Good Deal", className: "good" },
            { label: "Normal", key: "Normal", className: "normal" }
        ];

        if (elements.statusMixRecoverableSpend) {
            elements.statusMixRecoverableSpend.textContent = Table.formatCurrency(m.extraSpend);
        }
        if (elements.statusMixOverpayRate) {
            elements.statusMixOverpayRate.textContent = Table.formatPercent(m.overpayRate);
        }
        if (elements.statusMixBreakdown) {
            elements.statusMixBreakdown.innerHTML = breakdown.map((item) => {
                const count = m.statusCounts?.[item.key] || 0;
                const share = totalRows ? (count / totalRows) * 100 : 0;
                const rowLabel = `${count} row${count === 1 ? "" : "s"}`;
                return `
                    <div class="status-mix-row">
                        <div class="status-mix-row-label"><span class="status-mix-dot ${item.className}"></span>${item.label}</div>
                        <div class="status-mix-row-meta">${rowLabel}</div>
                        <div class="status-mix-row-value">${Table.formatPercent(share)}</div>
                    </div>
                `;
            }).join("");
        }
    }

    function applyFiltersAndSorting(state) {
        let rows = [...state.allRows];
        if (state.filters.status === "Overpay") rows = rows.filter((row) => row.status === "Overpay");
        else if (state.filters.status === "Good Deal") rows = rows.filter((row) => row.status === "Good Deal");
        else if (state.filters.status === "Normal") rows = rows.filter((row) => row.status === "Normal");
        else if (state.filters.status === "top5") rows = [...rows].sort((a, b) => b.savingsOpportunity - a.savingsOpportunity).slice(0, 5);
        const productFilterValue = String(state.filters.product || "").trim();
        console.log("product filter value", productFilterValue);
        if (productFilterValue && productFilterValue.toLowerCase() !== "all") {
            const productQuery = productFilterValue.toLowerCase();
            rows = rows.filter((row) => row.productName.toLowerCase().includes(productQuery));
        }
        if (state.filters.supplier !== "all") rows = rows.filter((row) => row.supplier === state.filters.supplier);
        if (state.filters.search.trim()) {
            const q = state.filters.search.trim().toLowerCase();
            rows = rows.filter((row) => row.productName.toLowerCase().includes(q) || row.supplier.toLowerCase().includes(q));
        }
        if (state.capabilities.hasDate && (state.filters.dateFrom || state.filters.dateTo)) {
            rows = rows.filter((row) => row.date && (!state.filters.dateFrom || row.date >= state.filters.dateFrom) && (!state.filters.dateTo || row.date <= state.filters.dateTo));
        }
        const filteredRows = sortRows(rows, state.sort);
        console.log("filteredRows count", filteredRows.length);
        return filteredRows;
    }

    function getActiveFilterItems(state) {
        const items = [];
        if (state.filters.product.trim()) items.push({ key: "product", label: `Product: ${state.filters.product.trim()}` });
        if (state.filters.supplier !== "all") items.push({ key: "supplier", label: `Supplier: ${state.filters.supplier}` });
        if (state.filters.status !== "all") items.push({ key: "status", label: `Status: ${state.filters.status === "top5" ? "Top 5 Savings" : state.filters.status}` });
        if (state.filters.search.trim()) items.push({ key: "search", label: `Search: ${state.filters.search.trim()}` });
        if (state.capabilities.hasDate && state.filters.dateFrom) items.push({ key: "dateFrom", label: `From: ${state.filters.dateFrom}` });
        if (state.capabilities.hasDate && state.filters.dateTo) items.push({ key: "dateTo", label: `To: ${state.filters.dateTo}` });
        return items;
    }

    function renderActiveFilters(elements, state) {
        const items = getActiveFilterItems(state);
        if (elements.activeFilterChips) elements.activeFilterChips.innerHTML = items.map((item) => `<span class="filter-chip"><span>${item.label}</span><button type="button" data-filter-key="${item.key}" aria-label="Clear ${item.label}">Clear</button></span>`).join("");
        if (elements.activeFilterSummary) elements.activeFilterSummary.textContent = items.length ? `${items.length} filter${items.length === 1 ? "" : "s"} active. URL stays in sync with this view.` : "Showing all available results.";
    }

    function applySortSelection(field, elements, state) {
        if (!field) return;
        const direction = state.sort.field === field ? (state.sort.direction === "asc" ? "desc" : "asc") : "asc";
        state.sort = { field, direction };
        console.log("SORT APPLIED ONCE", {
            field,
            direction
        });
        console.log("[dashboard] clicked header field", field);
        console.log("[dashboard] next sort direction", direction);
        console.log("[dashboard] row count before render", state.visibleRows.length);
        refresh(elements, state);
        console.log("[dashboard] first 3 sorted row values", {
            field,
            values: getSortPreview(state.visibleRows, field)
        });
    }

    function refresh(elements, state) {
        console.log("RENDER START", {
            filters: { ...state.filters },
            sort: { ...state.sort }
        });
        console.log("allRows count", state.allRows.length);
        state.visibleRows = applyFiltersAndSorting(state);
        state.metrics = aggregate(state.visibleRows);
        console.log("[dashboard] current filters", { ...state.filters });
        console.log("[dashboard] filtered row count", state.visibleRows.length);
        renderTableStructure(elements, state);
        Table.renderTable(elements.tableBody, elements.emptyState, state.visibleRows);
        Table.updateResultCount(elements.resultCountChip, state.visibleRows);
        updateKpis(elements, state.metrics);
        updateExecutiveSummary(elements, state.visibleRows, state.metrics);
        renderDecisionLists(elements, state.metrics);
        updateChartTakeaways(elements, state.metrics);
        updateStatusMixPanel(elements, state.metrics);
        renderCharts(state, elements, aggregate, state.metrics);
        Table.updateSortIndicators(elements.resultsTable, state.sort);
        renderActiveFilters(elements, state);
        syncControls(elements, state);
        syncUrl(state);
        console.log("RENDER END", {
            filteredRows: state.visibleRows.length
        });
    }

    function bindColumnReorder(elements, state) {
        if (!elements.tableHead || elements.tableHead.dataset.columnReorderBound === "true") {
            return;
        }

        elements.tableHead.dataset.columnReorderBound = "true";
        let draggingKey = null;

        elements.tableHead.addEventListener("dragstart", (event) => {
            const header = event.target.closest("th[data-column-key]");
            if (!header) return;

            draggingKey = header.dataset.columnKey;
            header.classList.add("is-dragging");
            document.body.classList.add("is-column-dragging");
            if (event.dataTransfer) {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", draggingKey);
            }
        });

        elements.tableHead.addEventListener("dragover", (event) => {
            const header = event.target.closest("th[data-column-key]");
            if (!header || !draggingKey) return;
            event.preventDefault();
            elements.tableHead.querySelectorAll(".column-header").forEach((item) => {
                if (item !== header) {
                    item.classList.remove("is-drop-target");
                }
            });
            if (header.dataset.columnKey !== draggingKey) {
                header.classList.add("is-drop-target");
            }
        });

        elements.tableHead.addEventListener("dragleave", (event) => {
            const header = event.target.closest("th[data-column-key]");
            if (!header) return;
            header.classList.remove("is-drop-target");
        });

        elements.tableHead.addEventListener("drop", (event) => {
            const header = event.target.closest("th[data-column-key]");
            if (!header || !draggingKey) return;

            event.preventDefault();
            header.classList.remove("is-drop-target");
            Table.moveColumn(draggingKey, header.dataset.columnKey);
            draggingKey = null;
            refresh(elements, state);
        });

        elements.tableHead.addEventListener("dragend", () => {
            draggingKey = null;
            document.body.classList.remove("is-column-dragging");
            elements.tableHead.querySelectorAll(".column-header").forEach((header) => {
                header.classList.remove("is-dragging", "is-drop-target");
            });
        });
    }

    function bindDecisionTabs(elements, state) {
        const tabStrip = document.getElementById("decisionViewTabs");
        if (!tabStrip || tabStrip.dataset.bound === "true") {
            return;
        }

        tabStrip.dataset.bound = "true";
        tabStrip.addEventListener("click", (event) => {
            const tab = event.target.closest("[data-decision-tab]");
            if (!tab) return;
            const targetKey = tab.dataset.decisionTab;

            tabStrip.querySelectorAll("[data-decision-tab]").forEach((button) => {
                const isActive = button === tab;
                button.classList.toggle("is-active", isActive);
                button.setAttribute("aria-selected", isActive ? "true" : "false");
            });

            document.querySelectorAll("[data-decision-panel]").forEach((panel) => {
                const isActive = panel.dataset.decisionPanel === targetKey;
                panel.classList.toggle("is-active", isActive);
                panel.hidden = !isActive;
            });

            if (targetKey === "opportunities") {
                renderCharts(state, elements, aggregate, state.metrics);
            }
        });
    }

    function bindEvents(elements, state) {
        if (elements.resetFiltersButton) {
            elements.resetFiltersButton.addEventListener("click", () => {
                state.filters = { ...defaultFilters };
                state.filterUi.queries = { product: "", supplier: "", status: "" };
                closeAllFilterDropdowns(elements, state);
                refresh(elements, state);
            });
        }

        if (elements.resetColumnsButton && elements.resetColumnsButton.dataset.bound !== "true") {
            elements.resetColumnsButton.dataset.bound = "true";
            elements.resetColumnsButton.addEventListener("click", () => {
                Table.resetColumnOrder();
                refresh(elements, state);
            });
        }

        if (elements.goToAnalysisButton && elements.goToAnalysisButton.dataset.bound !== "true") {
            elements.goToAnalysisButton.dataset.bound = "true";
            elements.goToAnalysisButton.addEventListener("click", () => {
                if (elements.uploadBox) {
                    elements.uploadBox.scrollIntoView({ behavior: "smooth", block: "start" });
                }
                window.setTimeout(() => {
                    elements.fileInput?.focus({ preventScroll: true });
                }, 250);
            });
        }

        if (elements.uploadStatusHost && elements.uploadStatusHost.dataset.bound !== "true") {
            elements.uploadStatusHost.dataset.bound = "true";
            elements.uploadStatusHost.addEventListener("click", (event) => {
                const replaceButton = event.target.closest("#replaceFileButton");
                if (!replaceButton) return;
                replaceUploadedFile(elements, state);
            });
        }

        if (elements.activeFilterChips) elements.activeFilterChips.addEventListener("click", (event) => {
            const button = event.target.closest("button[data-filter-key]");
            if (!button) return;
            state.filters[button.dataset.filterKey] = defaultFilters[button.dataset.filterKey] || "";
            if (state.filterUi.queries[button.dataset.filterKey] !== undefined) {
                state.filterUi.queries[button.dataset.filterKey] = "";
            }
            refresh(elements, state);
        });

        Object.entries(elements.filterControls).forEach(([key, control]) => {
            if (!control?.shell || control.shell.dataset.bound === "true") return;
            control.shell.dataset.bound = "true";

            if (control.trigger) {
                control.trigger.addEventListener("click", (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (state.filterUi.openKey === key) {
                        closeFilterDropdown(elements, state, key);
                        return;
                    }
                    openFilterDropdown(elements, state, key);
                });
            }
        });

        if (elements.filterPopoverRoot && elements.filterPopoverRoot.dataset.bound !== "true") {
            elements.filterPopoverRoot.dataset.bound = "true";
            elements.filterPopoverRoot.addEventListener("click", (event) => {
                event.stopPropagation();
            });
        }

        if (!document.body.dataset.filterOverlayBound) {
            document.body.dataset.filterOverlayBound = "true";
            document.addEventListener("click", (event) => {
                const insideFilterControl = event.target.closest(".searchable-select");
                const insidePopover = event.target.closest(".filter-popover-panel");
                if (insideFilterControl || insidePopover) return;
                closeAllFilterDropdowns(elements, state);
            });
        }

        if (!window.__priceAnalyzerFilterPopoverRepositionBound) {
            window.__priceAnalyzerFilterPopoverRepositionBound = true;
            const reposition = () => {
                if (!state.filterUi.openKey) return;
                positionFilterPopover(elements, state);
            };
            window.addEventListener("resize", reposition);
            window.addEventListener("scroll", reposition, true);
        }

        if (elements.tableHead && elements.tableHead.dataset.sortBound !== "true") {
            elements.tableHead.dataset.sortBound = "true";
            elements.tableHead.addEventListener("click", (event) => {
                const button = event.target.closest(".sort-button");
                if (!button) return;
                event.preventDefault();
                applySortSelection(button.dataset.sort, elements, state);
            });
        }

        bindColumnReorder(elements, state);
        bindDecisionTabs(elements, state);

        if (elements.searchInput) elements.searchInput.addEventListener("input", (event) => { state.filters.search = event.target.value; refresh(elements, state); });
        if (elements.dateFromInput) elements.dateFromInput.addEventListener("change", (event) => { state.filters.dateFrom = event.target.value; syncDateInputShells(elements); refresh(elements, state); });
        if (elements.dateToInput) elements.dateToInput.addEventListener("change", (event) => { state.filters.dateTo = event.target.value; syncDateInputShells(elements); refresh(elements, state); });
        window.addEventListener("popstate", () => { applyUrlState(state); updateDateAvailability(elements, state); sanitizeState(state); populateProducts(elements, state); populateSuppliers(elements, state); refresh(elements, state); });
    }

    function initFileInput(elements, state) {
        const fileInput = elements.fileInput;
        const fileName = elements.fileName;
        const uploadBox = document.getElementById("uploadBox");
        const uploadForm = elements.uploadForm;
        const dropzone = document.getElementById("uploadDropzone");
        const dropzoneKicker = document.getElementById("uploadDropzoneKicker");
        const defaultKickerText = "Drag and drop your file here";

        if (!fileInput || !fileName) return;

        function logUploadEvent(label, event, extra = {}) {
            console.log(`[upload] ${label}`, {
                type: event.type,
                targetId: event.target?.id || null,
                currentTargetId: event.currentTarget?.id || null,
                ...extra
            });
        }

        function syncSelectedFile(event) {
            if (event) {
                event.stopPropagation();
                logUploadEvent("file input change", event, {
                    fileCount: fileInput.files.length
                });
            }
            fileName.textContent = fileInput.files.length ? fileInput.files[0].name : "No file selected yet";
            if (uploadBox) {
                uploadBox.classList.toggle("has-file", fileInput.files.length > 0);
            }
            if (dropzone) {
                dropzone.classList.toggle("has-file", fileInput.files.length > 0);
            }
            resetUploadReview(elements, state);
            setUploadFeedback(elements, { showReplace: false });
            renderAnalyzerStep2(elements, state);
        }

        function setDraggingState(isDragging) {
            if (uploadBox) {
                uploadBox.classList.toggle("is-dragging", isDragging);
            }
            if (dropzone) {
                dropzone.classList.toggle("is-dragging", isDragging);
            }
            if (dropzoneKicker) {
                dropzoneKicker.textContent = isDragging ? "Drop file here" : defaultKickerText;
            }
        }

        fileInput.addEventListener("click", (event) => {
            event.stopPropagation();
            logUploadEvent("file input click", event);
        });

        fileInput.addEventListener("change", syncSelectedFile);

        if (dropzone) {
            dropzone.addEventListener("click", (event) => {
                event.stopPropagation();
                logUploadEvent("dropzone click", event);
            });
        }

        if (uploadBox) {
            uploadBox.addEventListener("click", (event) => {
                logUploadEvent("upload box click", event, {
                    opensDialog: false
                });
            });
        }

        if (uploadForm) {
            uploadForm.addEventListener("submit", async (event) => {
                event.preventDefault();
                event.stopPropagation();
                logUploadEvent("form submit", event, {
                    submitterId: event.submitter?.id || null
                });
                await submitUpload(elements, state);
            });
        }

        if (elements.confirmMappingButton && elements.confirmMappingButton.dataset.bound !== "true") {
            elements.confirmMappingButton.dataset.bound = "true";
            elements.confirmMappingButton.addEventListener("click", async () => {
                await confirmUploadMappings(elements, state);
            });
        }

        if (elements.changeUploadFileButton && elements.changeUploadFileButton.dataset.bound !== "true") {
            elements.changeUploadFileButton.dataset.bound = "true";
            elements.changeUploadFileButton.addEventListener("click", () => {
                replaceUploadedFile(elements, state);
            });
        }

        const dragTarget = uploadBox || dropzone;
        if (!dragTarget) return;

        ["dragenter", "dragover"].forEach((eventName) => {
            dragTarget.addEventListener(eventName, (event) => {
                event.preventDefault();
                setDraggingState(true);
            });
        });

        ["dragleave", "drop"].forEach((eventName) => {
            dragTarget.addEventListener(eventName, (event) => {
                event.preventDefault();
                if (eventName === "dragleave" && event.currentTarget.contains(event.relatedTarget)) {
                    return;
                }
                setDraggingState(false);
            });
        });

        dragTarget.addEventListener("drop", (event) => {
            const files = event.dataTransfer?.files;
            if (!files || !files.length) return;
            logUploadEvent("drop", event, {
                fileCount: files.length
            });
            fileInput.files = files;
            syncSelectedFile();
        });
    }

    function initDashboard() {
        if (dashboardInitialized) {
            return;
        }
        console.log("INIT START");
        const elements = getElements();
        if (!elements.tableBody) {
            return;
        }
        if (isLocked(elements)) {
            console.log("SORT INIT SKIPPED UNTIL UNLOCK");
            return;
        }
        dashboardInitialized = true;
        isInitializing = true;
        try {
            const state = createState();
            window.__priceAnalyzerDashboardState = state;
            Table.loadColumnOrder();
            initFileInput(elements, state);
            state.allRows = Table.extractTableData(elements.tableBody);
            const hasValidRestoredAnalysis = validateRestoredAnalysisState(elements, state);
            console.log("URL READ ONCE", getUrlState());
            stripInitialSortParams();
            applyUrlState(state, { includeSort: false });
            updateDateAvailability(elements, state);
            sanitizeState(state);
            populateProducts(elements, state);
            populateSuppliers(elements, state);
            syncRecipesAvailability(elements, hasValidRestoredAnalysis);
            if (elements.askDataPanel) {
                elements.askDataPanel.hidden = !hasValidRestoredAnalysis;
            }
            renderAnalyzerStep2(elements, state);
            renderTableStructure(elements, state);
            bindEvents(elements, state);
            refresh(elements, state);
        } finally {
            isInitializing = false;
        }
        console.log("INIT COMPLETE");
    }

    function init() {
        const elements = getElements();
        initWorkspaceStructure(elements);
        initCollapsiblePanels();
        initSideWorkspace(elements);
        revealSectionFromHash();
        window.addEventListener("hashchange", revealSectionFromHash);
        if (isLocked(elements)) {
            console.log("SORT INIT SKIPPED UNTIL UNLOCK");
        } else {
            initDashboard();
        }
        document.addEventListener("price-analyzer:dashboard-unlocked", () => {
            initDashboard();
        }, { once: true });
    }

    document.addEventListener("DOMContentLoaded", init);
})();
