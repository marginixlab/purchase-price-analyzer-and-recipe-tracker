(function () {
    const DEFAULT_PRICING_MODE = "latest_price";

    function getElements() {
        return {
            mainDashboardView: document.getElementById("mainDashboardView"),
            recipesWorkspaceState: document.getElementById("recipesWorkspaceState"),
            recipesPanel: document.getElementById("recipesPanel"),
            recipesShell: document.getElementById("recipesShell"),
            recipesList: document.getElementById("recipesList"),
            recipesEmpty: document.getElementById("recipesEmpty"),
            recipesSidebarActions: document.getElementById("recipesSidebarActions"),
            newRecipeButton: document.getElementById("newRecipeButton"),
            recipeEditorTitle: document.getElementById("recipeEditorTitle"),
            recipeNameInput: document.getElementById("recipeNameInput"),
            recipeYieldInput: document.getElementById("recipeYieldInput"),
            recipePricingModeSelect: document.getElementById("recipePricingModeSelect"),
            addRecipeIngredientButton: document.getElementById("addRecipeIngredientButton"),
            recipeIngredientsList: document.getElementById("recipeIngredientsList"),
            recalculateRecipeButton: document.getElementById("recalculateRecipeButton"),
            deleteRecipeButton: document.getElementById("deleteRecipeButton"),
            saveRecipeButton: document.getElementById("saveRecipeButton"),
            recipeDeleteConfirm: document.getElementById("recipeDeleteConfirm"),
            cancelDeleteRecipeButton: document.getElementById("cancelDeleteRecipeButton"),
            confirmDeleteRecipeButton: document.getElementById("confirmDeleteRecipeButton"),
            recipeStatusMessage: document.getElementById("recipeStatusMessage"),
            recipeTotalCost: document.getElementById("recipeTotalCost"),
            recipeCostPerPortion: document.getElementById("recipeCostPerPortion"),
            recipeMainCostDriver: document.getElementById("recipeMainCostDriver"),
            recipeMainCostDriverCopy: document.getElementById("recipeMainCostDriverCopy"),
            recipePricingModeChip: document.getElementById("recipePricingModeChip"),
            recipeBreakdownList: document.getElementById("recipeBreakdownList")
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

    function formatCurrency(value) {
        return `$${Number(value || 0).toFixed(2)}`;
    }

    function hasAnalysis(elements) {
        const stateHost = elements.mainDashboardView || elements.recipesWorkspaceState;
        return stateHost?.dataset.hasAnalysis === "true";
    }

    function createEmptyIngredient() {
        return { product_name: "", quantity: "", unit: "" };
    }

    function createEmptyRecipe() {
        return {
            recipe_id: null,
            name: "",
            yield_portions: 1,
            pricing_mode: DEFAULT_PRICING_MODE,
            ingredients: [createEmptyIngredient()]
        };
    }

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function createState() {
        return {
            products: [],
            productMap: new Map(),
            pricingModes: [],
            recipes: [],
            activeRecipeId: null,
            draft: createEmptyRecipe(),
            calculation: null,
            calculateTimer: null,
            isLoaded: false,
            deleteConfirmVisible: false,
            isDeleting: false
        };
    }

    function syncProductMap(state) {
        state.productMap = new Map(state.products.map((product) => [product.product_name, product]));
    }

    function setStatus(elements, message = "", tone = "") {
        if (!elements.recipeStatusMessage) {
            return;
        }
        elements.recipeStatusMessage.hidden = !message;
        elements.recipeStatusMessage.className = `recipe-status${tone ? ` is-${tone}` : ""}`;
        elements.recipeStatusMessage.textContent = message;
    }

    function resetCalculationView(elements) {
        if (elements.recipeTotalCost) elements.recipeTotalCost.textContent = "$0.00";
        if (elements.recipeCostPerPortion) elements.recipeCostPerPortion.textContent = "$0.00";
        if (elements.recipeMainCostDriver) elements.recipeMainCostDriver.textContent = "No recipe yet";
        if (elements.recipeMainCostDriverCopy) {
            elements.recipeMainCostDriverCopy.textContent = "The ingredient driving the largest share of recipe cost will appear here.";
        }
        if (elements.recipePricingModeChip) elements.recipePricingModeChip.textContent = "Choose a pricing mode";
        if (elements.recipeBreakdownList) {
            elements.recipeBreakdownList.innerHTML = '<div class="decision-list-empty">Add ingredients and choose a pricing mode to see the recipe cost breakdown.</div>';
        }
    }

    function renderPricingModes(elements, state) {
        if (!elements.recipePricingModeSelect) {
            return;
        }
        elements.recipePricingModeSelect.innerHTML = state.pricingModes.map((mode) => `
            <option value="${escapeHtml(mode.value)}">${escapeHtml(mode.label)}</option>
        `).join("");
        elements.recipePricingModeSelect.value = state.draft.pricing_mode || DEFAULT_PRICING_MODE;
    }

    function getUnitsForProduct(state, productName) {
        return state.productMap.get(productName)?.units || [];
    }

    function renderIngredients(elements, state) {
        if (!elements.recipeIngredientsList) {
            return;
        }

        const productOptions = state.products.map((product) => `
            <option value="${escapeHtml(product.product_name)}">${escapeHtml(product.product_name)}</option>
        `).join("");

        elements.recipeIngredientsList.innerHTML = state.draft.ingredients.map((ingredient, index) => {
            const units = getUnitsForProduct(state, ingredient.product_name);
            const resolvedUnit = ingredient.unit && !units.includes(ingredient.unit)
                ? [ingredient.unit, ...units]
                : units;
            const unitOptions = resolvedUnit.length
                ? resolvedUnit.map((unit) => `<option value="${escapeHtml(unit)}" ${unit === ingredient.unit ? "selected" : ""}>${escapeHtml(unit)}</option>`).join("")
                : '<option value="">Choose unit</option>';

            return `
                <div class="recipe-ingredient-row recipe-ingredient-grid" data-index="${index}">
                    <label class="recipe-field recipe-ingredient-cell">
                        <span class="recipe-field-label">Product Name</span>
                        <select class="recipe-select" data-field="product_name" data-index="${index}">
                            <option value="">Choose product</option>
                            ${productOptions}
                        </select>
                    </label>
                    <label class="recipe-field recipe-ingredient-cell">
                        <span class="recipe-field-label">Quantity</span>
                        <input type="number" min="0" step="0.01" class="recipe-input" data-field="quantity" data-index="${index}" value="${escapeHtml(ingredient.quantity)}" placeholder="0.00">
                    </label>
                    <label class="recipe-field recipe-ingredient-cell">
                        <span class="recipe-field-label">Unit</span>
                        <select class="recipe-select" data-field="unit" data-index="${index}" ${ingredient.product_name ? "" : "disabled"}>
                            <option value="">Choose unit</option>
                            ${unitOptions}
                        </select>
                    </label>
                    <div class="recipe-ingredient-action">
                        <button type="button" class="recipe-remove-btn" data-remove-ingredient="${index}" aria-label="Remove ingredient">Remove</button>
                    </div>
                </div>
            `;
        }).join("");

        elements.recipeIngredientsList.querySelectorAll('select[data-field="product_name"]').forEach((select, index) => {
            select.value = state.draft.ingredients[index]?.product_name || "";
        });
    }

    function renderRecipeList(elements, state) {
        if (!elements.recipesList || !elements.recipesEmpty) {
            return;
        }

        if (!state.recipes.length) {
            elements.recipesList.innerHTML = "";
            elements.recipesEmpty.hidden = false;
            return;
        }

        elements.recipesEmpty.hidden = true;
        elements.recipesList.innerHTML = state.recipes.map((recipe) => {
            const isActive = recipe.recipe_id === state.activeRecipeId;
            const updatedLabel = recipe.updated_at ? new Date(recipe.updated_at).toLocaleDateString("en-US") : "Not saved yet";
            return `
                <button type="button" class="recipe-list-item ${isActive ? "is-active" : ""}" data-open-recipe="${escapeHtml(recipe.recipe_id)}">
                    <span class="recipe-list-name">${escapeHtml(recipe.name)}</span>
                    <span class="recipe-list-meta">${Number(recipe.yield_portions || 0)} portion${Number(recipe.yield_portions || 0) === 1 ? "" : "s"} | Updated ${escapeHtml(updatedLabel)}</span>
                </button>
            `;
        }).join("");
    }

    function renderEditor(elements, state) {
        if (!state.draft.ingredients.length) {
            state.draft.ingredients = [createEmptyIngredient()];
        }
        if (elements.recipeEditorTitle) {
            elements.recipeEditorTitle.textContent = state.activeRecipeId ? "Edit saved recipe" : "Create a recipe";
        }
        if (elements.recipeNameInput) elements.recipeNameInput.value = state.draft.name || "";
        if (elements.recipeYieldInput) elements.recipeYieldInput.value = state.draft.yield_portions || 1;
        renderPricingModes(elements, state);
        renderIngredients(elements, state);
        if (elements.recipesSidebarActions) {
            elements.recipesSidebarActions.hidden = !state.activeRecipeId;
        }
        if (elements.deleteRecipeButton) {
            elements.deleteRecipeButton.hidden = !state.activeRecipeId;
            elements.deleteRecipeButton.disabled = state.isDeleting;
            elements.deleteRecipeButton.textContent = state.isDeleting ? "Deleting..." : "Delete Recipe";
        }
        if (elements.saveRecipeButton) {
            elements.saveRecipeButton.textContent = state.activeRecipeId ? "Update Recipe" : "Save Recipe";
        }
        renderDeleteConfirmation(elements, state);
    }

    function renderDeleteConfirmation(elements, state) {
        if (elements.recipeDeleteConfirm) {
            elements.recipeDeleteConfirm.hidden = !(state.activeRecipeId && state.deleteConfirmVisible);
        }
        if (elements.cancelDeleteRecipeButton) {
            elements.cancelDeleteRecipeButton.disabled = state.isDeleting;
        }
        if (elements.confirmDeleteRecipeButton) {
            elements.confirmDeleteRecipeButton.disabled = state.isDeleting;
            elements.confirmDeleteRecipeButton.textContent = state.isDeleting ? "Deleting..." : "Delete";
        }
    }

    function renderCalculation(elements, calculation) {
        if (!calculation) {
            resetCalculationView(elements);
            return;
        }

        if (elements.recipeTotalCost) {
            elements.recipeTotalCost.textContent = formatCurrency(calculation.total_recipe_cost);
        }
        if (elements.recipeCostPerPortion) {
            elements.recipeCostPerPortion.textContent = formatCurrency(calculation.cost_per_portion);
        }
        if (elements.recipePricingModeChip) {
            elements.recipePricingModeChip.textContent = calculation.pricing_mode_label || "Pricing mode";
        }
        if (elements.recipeMainCostDriver) {
            elements.recipeMainCostDriver.textContent = calculation.main_cost_driver
                ? calculation.main_cost_driver.product_name
                : "No dominant ingredient";
        }
        if (elements.recipeMainCostDriverCopy) {
            elements.recipeMainCostDriverCopy.textContent = calculation.main_cost_driver
                ? `${calculation.main_cost_driver.product_name} is the main cost driver at ${formatCurrency(calculation.main_cost_driver.ingredient_cost)} using ${calculation.main_cost_driver.pricing_label}.`
                : "The ingredient driving the largest share of recipe cost will appear here.";
        }
        if (elements.recipeBreakdownList) {
            elements.recipeBreakdownList.innerHTML = (calculation.ingredient_breakdown || []).length
                ? calculation.ingredient_breakdown.map((item) => `
                    <article class="decision-item">
                        <div class="decision-item-rank supplier">${escapeHtml(item.unit)}</div>
                        <div class="decision-item-body">
                            <div class="decision-item-title">${escapeHtml(item.product_name)}</div>
                            <div class="decision-item-meta">${Number(item.quantity)} ${escapeHtml(item.unit)} at ${formatCurrency(item.price_used)} using ${escapeHtml(item.pricing_label)}.</div>
                            <div class="decision-item-meta">Supplier reference: ${escapeHtml(item.supplier)}</div>
                        </div>
                        <div class="decision-item-value negative">${formatCurrency(item.ingredient_cost)}</div>
                    </article>
                `).join("")
                : '<div class="decision-list-empty">Add ingredients and choose a pricing mode to see the recipe cost breakdown.</div>';
        }
    }

    function getFilledIngredients(state) {
        return state.draft.ingredients.filter((ingredient) => ingredient.product_name || ingredient.unit || ingredient.quantity);
    }

    function buildPayload(state, { requireComplete = false } = {}) {
        const filledIngredients = getFilledIngredients(state);
        const completeIngredients = filledIngredients.filter((ingredient) => ingredient.product_name && ingredient.unit && Number(ingredient.quantity) > 0);

        if (requireComplete && filledIngredients.length !== completeIngredients.length) {
            throw new Error("Complete each ingredient row before saving the recipe.");
        }

        if (!completeIngredients.length) {
            return null;
        }

        return {
            recipe_id: state.draft.recipe_id,
            name: String(state.draft.name || "").trim(),
            yield_portions: Number(state.draft.yield_portions || 0),
            pricing_mode: state.draft.pricing_mode || DEFAULT_PRICING_MODE,
            ingredients: completeIngredients.map((ingredient) => ({
                product_name: ingredient.product_name,
                quantity: Number(ingredient.quantity),
                unit: ingredient.unit
            }))
        };
    }

    async function fetchJson(url, options = {}) {
        const response = await fetch(url, {
            headers: {
                Accept: "application/json",
                ...(options.body ? { "Content-Type": "application/json" } : {})
            },
            ...options
        });
        const data = await response.json();
        if (!response.ok || data.success !== true) {
            throw new Error(data.message || "The recipe request could not be completed.");
        }
        return data;
    }

    async function loadBootstrap(elements, state) {
        if (!hasAnalysis(elements)) {
            state.products = [];
            state.recipes = [];
            state.activeRecipeId = null;
            state.draft = createEmptyRecipe();
            state.calculation = null;
            renderRecipeList(elements, state);
            renderEditor(elements, state);
            resetCalculationView(elements);
            return;
        }

        const data = await fetchJson("/recipes/bootstrap");
        state.products = data.products || [];
        state.pricingModes = data.pricing_modes || [];
        state.recipes = data.recipes || [];
        syncProductMap(state);
        state.isLoaded = true;
        renderRecipeList(elements, state);
        renderEditor(elements, state);

        if (state.activeRecipeId) {
            const savedRecipe = state.recipes.find((recipe) => recipe.recipe_id === state.activeRecipeId);
            if (savedRecipe) {
                state.draft = clone(savedRecipe);
                renderEditor(elements, state);
            }
        }
    }

    async function calculateRecipe(elements, state, { quiet = false } = {}) {
        if (!hasAnalysis(elements)) {
            return;
        }

        const payload = buildPayload(state);
        if (!payload) {
            state.calculation = null;
            renderCalculation(elements, null);
            if (!quiet) {
                setStatus(elements, "Add at least one complete ingredient row to calculate recipe cost.", "info");
            }
            return;
        }

        try {
            const data = await fetchJson("/recipes/calculate", {
                method: "POST",
                body: JSON.stringify(payload)
            });
            state.calculation = data.calculation;
            renderCalculation(elements, state.calculation);
            if (!quiet) {
                setStatus(elements, "Recipe costs updated.", "info");
            }
        } catch (error) {
            state.calculation = null;
            renderCalculation(elements, null);
            setStatus(elements, error.message, "error");
        }
    }

    function scheduleCalculation(elements, state) {
        window.clearTimeout(state.calculateTimer);
        state.calculateTimer = window.setTimeout(() => {
            calculateRecipe(elements, state, { quiet: true });
        }, 220);
    }

    function openRecipe(elements, state, recipeId) {
        const recipe = state.recipes.find((item) => item.recipe_id === recipeId);
        if (!recipe) {
            return;
        }
        state.activeRecipeId = recipeId;
        state.deleteConfirmVisible = false;
        state.draft = clone(recipe);
        renderRecipeList(elements, state);
        renderEditor(elements, state);
        setStatus(elements, `Opened recipe: ${recipe.name}`, "info");
        calculateRecipe(elements, state, { quiet: true });
    }

    function resetDraftAfterDelete(elements, state) {
        state.activeRecipeId = null;
        state.deleteConfirmVisible = false;
        state.draft = createEmptyRecipe();
        state.calculation = null;
        renderRecipeList(elements, state);
        renderEditor(elements, state);
        renderCalculation(elements, null);
    }

    async function saveRecipe(elements, state) {
        if (!hasAnalysis(elements)) {
            return;
        }

        let payload;
        try {
            payload = buildPayload(state, { requireComplete: true });
        } catch (error) {
            setStatus(elements, error.message, "error");
            return;
        }

        if (!payload) {
            setStatus(elements, "Add ingredients before saving the recipe.", "error");
            return;
        }

        payload.name = String(state.draft.name || "").trim();
        payload.yield_portions = Number(state.draft.yield_portions || 0);

        try {
            const data = await fetchJson("/recipes/save", {
                method: "POST",
                body: JSON.stringify(payload)
            });
            state.recipes = data.recipes || [];
            state.activeRecipeId = data.recipe?.recipe_id || state.activeRecipeId;
            state.deleteConfirmVisible = false;
            state.draft = clone(data.recipe || state.draft);
            state.calculation = data.calculation || null;
            renderRecipeList(elements, state);
            renderEditor(elements, state);
            renderCalculation(elements, state.calculation);
            setStatus(elements, data.message || "Recipe saved successfully", "success");
        } catch (error) {
            setStatus(elements, error.message, "error");
        }
    }

    async function deleteRecipe(elements, state) {
        if (!hasAnalysis(elements) || !state.activeRecipeId || state.isDeleting) {
            return;
        }

        state.isDeleting = true;
        renderEditor(elements, state);

        try {
            const data = await fetchJson("/recipes/delete", {
                method: "POST",
                body: JSON.stringify({ recipe_id: state.activeRecipeId })
            });
            state.recipes = data.recipes || [];
            resetDraftAfterDelete(elements, state);
            setStatus(elements, data.message || "Recipe deleted", "danger");
        } catch (error) {
            state.deleteConfirmVisible = true;
            setStatus(elements, error.message, "error");
        } finally {
            state.isDeleting = false;
            renderEditor(elements, state);
        }
    }

    function bindEvents(elements, state) {
        if (elements.newRecipeButton && elements.newRecipeButton.dataset.bound !== "true") {
            elements.newRecipeButton.dataset.bound = "true";
            elements.newRecipeButton.addEventListener("click", () => {
                state.activeRecipeId = null;
                state.deleteConfirmVisible = false;
                state.draft = createEmptyRecipe();
                state.calculation = null;
                renderRecipeList(elements, state);
                renderEditor(elements, state);
                renderCalculation(elements, null);
                setStatus(elements, "Started a new recipe draft.", "info");
            });
        }

        if (elements.recipeNameInput && elements.recipeNameInput.dataset.bound !== "true") {
            elements.recipeNameInput.dataset.bound = "true";
            elements.recipeNameInput.addEventListener("input", (event) => {
                state.draft.name = event.target.value;
            });
        }

        if (elements.recipeYieldInput && elements.recipeYieldInput.dataset.bound !== "true") {
            elements.recipeYieldInput.dataset.bound = "true";
            elements.recipeYieldInput.addEventListener("input", (event) => {
                state.draft.yield_portions = event.target.value;
                scheduleCalculation(elements, state);
            });
        }

        if (elements.recipePricingModeSelect && elements.recipePricingModeSelect.dataset.bound !== "true") {
            elements.recipePricingModeSelect.dataset.bound = "true";
            elements.recipePricingModeSelect.addEventListener("change", (event) => {
                state.draft.pricing_mode = event.target.value;
                scheduleCalculation(elements, state);
            });
        }

        if (elements.addRecipeIngredientButton && elements.addRecipeIngredientButton.dataset.bound !== "true") {
            elements.addRecipeIngredientButton.dataset.bound = "true";
            elements.addRecipeIngredientButton.addEventListener("click", () => {
                state.draft.ingredients.push(createEmptyIngredient());
                renderIngredients(elements, state);
            });
        }

        if (elements.recipeIngredientsList && elements.recipeIngredientsList.dataset.bound !== "true") {
            elements.recipeIngredientsList.dataset.bound = "true";
            elements.recipeIngredientsList.addEventListener("click", (event) => {
                const removeButton = event.target.closest("[data-remove-ingredient]");
                if (!removeButton) {
                    return;
                }
                const index = Number(removeButton.dataset.removeIngredient);
                state.draft.ingredients.splice(index, 1);
                if (!state.draft.ingredients.length) {
                    state.draft.ingredients.push(createEmptyIngredient());
                }
                renderIngredients(elements, state);
                scheduleCalculation(elements, state);
            });

            elements.recipeIngredientsList.addEventListener("input", (event) => {
                const field = event.target.dataset.field;
                const index = Number(event.target.dataset.index);
                if (!field || Number.isNaN(index) || !state.draft.ingredients[index]) {
                    return;
                }
                state.draft.ingredients[index][field] = event.target.value;
                scheduleCalculation(elements, state);
            });

            elements.recipeIngredientsList.addEventListener("change", (event) => {
                const field = event.target.dataset.field;
                const index = Number(event.target.dataset.index);
                if (!field || Number.isNaN(index) || !state.draft.ingredients[index]) {
                    return;
                }
                state.draft.ingredients[index][field] = event.target.value;
                if (field === "product_name") {
                    const units = getUnitsForProduct(state, event.target.value);
                    state.draft.ingredients[index].unit = units.includes(state.draft.ingredients[index].unit)
                        ? state.draft.ingredients[index].unit
                        : (units[0] || "");
                    renderIngredients(elements, state);
                }
                scheduleCalculation(elements, state);
            });
        }

        if (elements.recalculateRecipeButton && elements.recalculateRecipeButton.dataset.bound !== "true") {
            elements.recalculateRecipeButton.dataset.bound = "true";
            elements.recalculateRecipeButton.addEventListener("click", () => {
                calculateRecipe(elements, state);
            });
        }

        if (elements.saveRecipeButton && elements.saveRecipeButton.dataset.bound !== "true") {
            elements.saveRecipeButton.dataset.bound = "true";
            elements.saveRecipeButton.addEventListener("click", () => {
                saveRecipe(elements, state);
            });
        }

        if (elements.deleteRecipeButton && elements.deleteRecipeButton.dataset.bound !== "true") {
            elements.deleteRecipeButton.dataset.bound = "true";
            elements.deleteRecipeButton.addEventListener("click", () => {
                if (!state.activeRecipeId || state.isDeleting) {
                    return;
                }
                state.deleteConfirmVisible = true;
                renderEditor(elements, state);
                setStatus(elements);
            });
        }

        if (elements.cancelDeleteRecipeButton && elements.cancelDeleteRecipeButton.dataset.bound !== "true") {
            elements.cancelDeleteRecipeButton.dataset.bound = "true";
            elements.cancelDeleteRecipeButton.addEventListener("click", () => {
                state.deleteConfirmVisible = false;
                renderEditor(elements, state);
            });
        }

        if (elements.confirmDeleteRecipeButton && elements.confirmDeleteRecipeButton.dataset.bound !== "true") {
            elements.confirmDeleteRecipeButton.dataset.bound = "true";
            elements.confirmDeleteRecipeButton.addEventListener("click", () => {
                deleteRecipe(elements, state);
            });
        }

        if (elements.recipesList && elements.recipesList.dataset.bound !== "true") {
            elements.recipesList.dataset.bound = "true";
            elements.recipesList.addEventListener("click", (event) => {
                const button = event.target.closest("[data-open-recipe]");
                if (!button) {
                    return;
                }
                openRecipe(elements, state, button.dataset.openRecipe || "");
            });
        }
    }

    async function initRecipes() {
        const elements = getElements();
        const stateHost = elements.mainDashboardView || elements.recipesWorkspaceState;
        if (!elements.recipesShell || !stateHost) {
            return;
        }

        const state = createState();
        renderRecipeList(elements, state);
        renderEditor(elements, state);
        renderCalculation(elements, null);
        bindEvents(elements, state);

        const refreshBootstrap = async () => {
            if (!hasAnalysis(elements)) {
                state.products = [];
                state.recipes = [];
                state.activeRecipeId = null;
                state.deleteConfirmVisible = false;
                state.isDeleting = false;
                state.draft = createEmptyRecipe();
                state.calculation = null;
                renderRecipeList(elements, state);
                renderEditor(elements, state);
                renderCalculation(elements, null);
                setStatus(elements);
                return;
            }
            try {
                await loadBootstrap(elements, state);
                await calculateRecipe(elements, state, { quiet: true });
                setStatus(elements);
            } catch (error) {
                setStatus(elements, error.message, "error");
            }
        };

        await refreshBootstrap();

        const observer = new MutationObserver(() => {
            refreshBootstrap();
        });
        observer.observe(stateHost, {
            attributes: true,
            attributeFilter: ["data-has-analysis"]
        });
    }

    document.addEventListener("DOMContentLoaded", initRecipes);
})();
