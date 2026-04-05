(function () {
    const COLUMN_STORAGE_KEY = "priceAnalyzer.columnOrder.v1";

    const defaultColumns = [
        { key: "productName", label: "Product Name", sortable: true, sticky: true },
        { key: "supplier", label: "Supplier", sortable: true },
        { key: "purchaseUnit", label: "Unit", sortable: true },
        { key: "quantity", label: "Quantity", sortable: true },
        { key: "unitPrice", label: "Unit Price", sortable: true },
        { key: "totalAmount", label: "Total Amount", sortable: true },
        { key: "averagePrice", label: "Average Price", sortable: true },
        { key: "overpay", label: "Overpay", sortable: true },
        { key: "savingsOpportunity", label: "Savings Opportunity", sortable: true },
        { key: "date", label: "Date", sortable: true },
        { key: "status", label: "Status", sortable: true }
    ];

    let activeColumns = [...defaultColumns];

    function formatCurrency(value) {
        const numericValue = Number(value || 0);
        return Number.isFinite(numericValue)
            ? numericValue.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            })
            : "0.00";
    }

    function formatPercent(value) {
        return `${Number(value || 0).toFixed(2)}%`;
    }

    function formatQuantity(value) {
        const numericValue = Number(value || 0);
        return Number.isInteger(numericValue) ? String(numericValue) : numericValue.toFixed(2);
    }

    function getRowClass(status) {
        if (status === "Overpay") return "overpay-row";
        if (status === "Good Deal") return "good-row";
        return "normal-row";
    }

    function getStatusPill(status) {
        if (status === "Overpay") return '<span class="status-pill status-overpay">Overpay</span>';
        if (status === "Good Deal") return '<span class="status-pill status-good">Good Deal</span>';
        return '<span class="status-pill status-normal">Normal</span>';
    }

    function currencyToNumber(value) {
        return parseFloat(String(value).replace(/[^0-9.-]/g, "").trim()) || 0;
    }

    function percentToNumber(value) {
        return parseFloat(String(value).replace(/%/g, "").trim()) || 0;
    }

    function getCellMarkup(columnKey, row) {
        switch (columnKey) {
            case "productName":
                return row.productName || "";
            case "supplier":
                return row.supplier || "-";
            case "purchaseUnit":
                return row.purchaseUnit || "-";
            case "quantity":
                return formatQuantity(row.quantity);
            case "unitPrice":
                return formatCurrency(row.unitPrice);
            case "totalAmount":
                return formatCurrency(row.totalAmount);
            case "averagePrice":
                return formatCurrency(row.averagePrice);
            case "overpay":
                return formatCurrency(row.overpay);
            case "savingsOpportunity":
                return formatCurrency(row.savingsOpportunity);
            case "date":
                return row.date || "";
            case "status":
                return getStatusPill(row.status);
            default:
                return "";
        }
    }

    function getHeaderMarkup(column) {
        if (!column.sortable) {
            return `<span class="sort-label">${column.label}</span>`;
        }

        return `
            <button class="sort-button" type="button" data-sort="${column.key}">
                <span class="sort-label">${column.label}</span>
                <span class="sort-indicator" aria-hidden="true"></span>
            </button>
        `;
    }

    function saveColumnOrder() {
        try {
            window.localStorage.setItem(
                COLUMN_STORAGE_KEY,
                JSON.stringify(activeColumns.map((column) => column.key))
            );
        } catch (error) {
            console.warn("[table] failed to save column order", error);
        }
    }

    function mergeColumnOrder(savedKeys) {
        if (!Array.isArray(savedKeys) || !savedKeys.length) {
            return [...defaultColumns];
        }

        const columnMap = new Map(defaultColumns.map((column) => [column.key, column]));
        const ordered = savedKeys
            .map((key) => columnMap.get(key))
            .filter(Boolean);

        defaultColumns.forEach((column) => {
            if (!ordered.some((item) => item.key === column.key)) {
                ordered.push(column);
            }
        });

        return ordered;
    }

    function loadColumnOrder() {
        try {
            const stored = window.localStorage.getItem(COLUMN_STORAGE_KEY);
            if (!stored) {
                activeColumns = [...defaultColumns];
                return activeColumns;
            }

            activeColumns = mergeColumnOrder(JSON.parse(stored));
            return activeColumns;
        } catch (error) {
            console.warn("[table] failed to restore column order", error);
            activeColumns = [...defaultColumns];
            return activeColumns;
        }
    }

    function resetColumnOrder() {
        activeColumns = [...defaultColumns];
        try {
            window.localStorage.removeItem(COLUMN_STORAGE_KEY);
        } catch (error) {
            console.warn("[table] failed to clear column order", error);
        }
        return activeColumns;
    }

    function getColumns() {
        return activeColumns;
    }

    function moveColumn(fromKey, toKey) {
        if (!fromKey || !toKey || fromKey === toKey) {
            return activeColumns;
        }

        const fromIndex = activeColumns.findIndex((column) => column.key === fromKey);
        const toIndex = activeColumns.findIndex((column) => column.key === toKey);
        if (fromIndex === -1 || toIndex === -1) {
            return activeColumns;
        }

        const nextColumns = [...activeColumns];
        const [movedColumn] = nextColumns.splice(fromIndex, 1);
        nextColumns.splice(toIndex, 0, movedColumn);
        activeColumns = nextColumns;
        saveColumnOrder();
        return activeColumns;
    }

    function renderHeader(tableHead, sortState) {
        if (!tableHead) return;

        tableHead.innerHTML = `
            <tr>
                ${activeColumns.map((column) => `
                    <th
                        data-column-key="${column.key}"
                        draggable="true"
                        class="column-header ${column.sticky ? "column-header-primary" : ""}"
                    >
                        ${getHeaderMarkup(column)}
                    </th>
                `).join("")}
            </tr>
        `;

        updateSortIndicators(tableHead.closest("table"), sortState || { field: null, direction: "asc" });
    }

    function getCellByKey(cells, key, fallbackIndex) {
        return cells.find((cell) => cell.dataset.columnKey === key) || cells[fallbackIndex] || null;
    }

    function extractTableData(tableBody) {
        if (!tableBody) return [];

        return Array.from(tableBody.querySelectorAll("tr")).map((row) => {
            const cells = Array.from(row.querySelectorAll("td"));

            return {
                productName: getCellByKey(cells, "productName", 0)?.innerText.trim() || "",
                supplier: getCellByKey(cells, "supplier", 1)?.innerText.trim() || row.dataset.supplier || "",
                purchaseUnit: getCellByKey(cells, "purchaseUnit", 2)?.innerText.trim() || "",
                quantity: Number(getCellByKey(cells, "quantity", 3)?.innerText.trim()) || 0,
                unitPrice: currencyToNumber(getCellByKey(cells, "unitPrice", 4)?.innerText),
                price: currencyToNumber(getCellByKey(cells, "unitPrice", 4)?.innerText),
                totalAmount: currencyToNumber(getCellByKey(cells, "totalAmount", 5)?.innerText),
                averagePrice: currencyToNumber(getCellByKey(cells, "averagePrice", 6)?.innerText),
                overpay: currencyToNumber(getCellByKey(cells, "overpay", 7)?.innerText),
                overpayPct: percentToNumber(row.dataset.overpayPct || "0"),
                savingsOpportunity: currencyToNumber(getCellByKey(cells, "savingsOpportunity", 8)?.innerText),
                date: getCellByKey(cells, "date", 9)?.innerText.trim() || row.dataset.date || "",
                status: getCellByKey(cells, "status", 10)?.innerText.trim() || ""
            };
        });
    }

    function renderTable(tableBody, emptyState, rows) {
        if (!tableBody) return;

        tableBody.innerHTML = rows.map((row) => `
            <tr class="${getRowClass(row.status)}" data-date="${row.date || ""}" data-supplier="${row.supplier || ""}" data-overpay-pct="${row.overpayPct || 0}">
                ${activeColumns.map((column) => `<td data-column-key="${column.key}">${getCellMarkup(column.key, row)}</td>`).join("")}
            </tr>
        `).join("");

        if (emptyState) {
            emptyState.style.display = rows.length ? "none" : "block";
        }
    }

    function updateResultCount(resultCountChip, rows) {
        if (!resultCountChip) return;

        const label = rows.length === 1 ? "row" : "rows";
        resultCountChip.textContent = `${rows.length} visible ${label}`;
    }

    function updateSortIndicators(table, sortState) {
        if (!table) return;

        const sortButtons = Array.from(table.querySelectorAll(".sort-button"));
        sortButtons.forEach((button) => {
            const indicator = button.querySelector(".sort-indicator");
            const isActive = button.dataset.sort === sortState.field;

            button.classList.toggle("active", isActive);
            button.dataset.direction = isActive ? sortState.direction : "";
            if (indicator) indicator.textContent = "";
        });
    }

    loadColumnOrder();

    window.PriceAnalyzerTable = {
        extractTableData,
        getColumns,
        loadColumnOrder,
        moveColumn,
        renderHeader,
        renderTable,
        resetColumnOrder,
        updateResultCount,
        updateSortIndicators,
        formatCurrency,
        formatPercent,
        formatQuantity
    };
})();
