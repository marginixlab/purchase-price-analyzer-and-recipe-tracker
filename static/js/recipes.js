(function () {
    const DEFAULT_PRICING_MODE = "latest_price";
    const SHARED_DATA_SCOPE_KEY = "shared_analysis_scope_v1";
    const RECIPE_UNIT_OPTIONS = ["g", "kg", "oz", "lb", "ml", "l", "fl oz", "each", "portion"];
    const PACKAGE_BASE_UNIT_OPTIONS = ["g", "ml", "each"];
    const UNIT_TYPE_MAP = {
        g: "weight",
        kg: "weight",
        oz: "weight",
        lb: "weight",
        ml: "volume",
        l: "volume",
        "fl oz": "volume",
        each: "count",
        portion: "count",
        pack: "package",
        box: "package",
        case: "package",
        carton: "package",
        bottle: "package",
        can: "package",
        bag: "package",
        jar: "package"
    };
    const BASE_UNIT_BY_TYPE = {
        weight: "g",
        volume: "ml",
        count: "each"
    };
    const UNIT_ALIASES = {
        g: "g",
        gram: "g",
        grams: "g",
        oz: "oz",
        ounce: "oz",
        ounces: "oz",
        kg: "kg",
        kilogram: "kg",
        kilograms: "kg",
        lb: "lb",
        lbs: "lb",
        pound: "lb",
        pounds: "lb",
        ml: "ml",
        milliliter: "ml",
        milliliters: "ml",
        "fl oz": "fl oz",
        "fl. oz": "fl oz",
        floz: "fl oz",
        "fluid ounce": "fl oz",
        "fluid ounces": "fl oz",
        l: "l",
        lt: "l",
        liter: "l",
        liters: "l",
        each: "each",
        ea: "each",
        piece: "each",
        pieces: "each",
        pc: "each",
        pcs: "each",
        portion: "portion",
        portions: "portion",
        package: "pack",
        packages: "pack",
        pack: "pack",
        packs: "pack",
        box: "box",
        boxes: "box",
        case: "case",
        cases: "case",
        carton: "carton",
        cartons: "carton",
        bottle: "bottle",
        bottles: "bottle",
        can: "can",
        cans: "can",
        bag: "bag",
        bags: "bag",
        jar: "jar",
        jars: "jar"
    };
    const UNIT_FACTORS = {
        g: { type: "weight", factor: 1 },
        oz: { type: "weight", factor: 28.3495 },
        kg: { type: "weight", factor: 1000 },
        lb: { type: "weight", factor: 453.592 },
        ml: { type: "volume", factor: 1 },
        "fl oz": { type: "volume", factor: 29.5735 },
        l: { type: "volume", factor: 1000 },
        each: { type: "count", factor: 1 },
        portion: { type: "count", factor: 1 }
    };
    const DEFAULT_PRICING_GOAL_TYPE = "food_cost_pct";
    const PRICING_GOAL_LABELS = {
        food_cost_pct: "Target Food Cost %",
        gross_margin_pct: "Target Gross Margin %",
        markup_pct: "Markup %"
    };
    const PRICING_GOAL_HELPERS = {
        food_cost_pct: "Target Food Cost % estimates the menu price by keeping food cost at your chosen percentage.",
        gross_margin_pct: "Target Gross Margin % estimates the menu price needed to protect your preferred gross margin.",
        markup_pct: "Markup % estimates the menu price by adding your chosen percentage on top of total recipe cost."
    };

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
            recipeDataScopeSummary: document.getElementById("recipeDataScopeSummary"),
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
            recipeSellingPriceInput: document.getElementById("recipeSellingPriceInput"),
            recipePricingGoalTypeSelect: document.getElementById("recipePricingGoalTypeSelect"),
            recipeTargetFoodCostInput: document.getElementById("recipeTargetFoodCostInput"),
            recipePricingGoalValueLabel: document.getElementById("recipePricingGoalValueLabel"),
            recipePricingGoalHelper: document.getElementById("recipePricingGoalHelper"),
            recipePricingTotalCost: document.getElementById("recipePricingTotalCost"),
            recipePricingCostPerPortion: document.getElementById("recipePricingCostPerPortion"),
            recipeSellingPricePerPortionValue: document.getElementById("recipeSellingPricePerPortionValue"),
            recipeGrossProfitValue: document.getElementById("recipeGrossProfitValue"),
            recipeGrossProfitSubtext: document.getElementById("recipeGrossProfitSubtext"),
            recipeGrossMarginValue: document.getElementById("recipeGrossMarginValue"),
            recipeFoodCostValue: document.getElementById("recipeFoodCostValue"),
            recipeSuggestedPriceValue: document.getElementById("recipeSuggestedPriceValue"),
            recipePricingModeChip: document.getElementById("recipePricingModeChip"),
            recipeBreakdownList: document.getElementById("recipeBreakdownList"),
            createRecipeFromLibraryButton: document.getElementById("createRecipeFromLibraryButton"),
            openRecipeLibraryInlineButton: document.getElementById("openRecipeLibraryInlineButton"),
            recipeLibraryOverlay: document.getElementById("recipeLibraryOverlay"),
            closeRecipeLibraryButton: document.getElementById("closeRecipeLibraryButton"),
            recipeLibrarySearchInput: document.getElementById("recipeLibrarySearchInput"),
            recipeLibrarySortSelect: document.getElementById("recipeLibrarySortSelect"),
            recipeLibraryList: document.getElementById("recipeLibraryList"),
            recipeLibraryDetail: document.getElementById("recipeLibraryDetail")
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

    function formatOptionalCurrency(value) {
        const numericValue = Number(value);
        return Number.isFinite(numericValue) && numericValue > 0 ? formatCurrency(numericValue) : "--";
    }

    function formatOptionalPercent(value) {
        const numericValue = Number(value);
        return Number.isFinite(numericValue) && numericValue > 0 ? formatPercent(numericValue) : "--";
    }

    function syncPricingInputsFromElements(elements, state) {
        if (!state) {
            return;
        }
        if (elements?.recipeSellingPriceInput) {
            state.sellingPrice = elements.recipeSellingPriceInput.value;
        }
        if (elements?.recipePricingGoalTypeSelect) {
            state.pricingGoalType = elements.recipePricingGoalTypeSelect.value || DEFAULT_PRICING_GOAL_TYPE;
        }
        if (elements?.recipeTargetFoodCostInput) {
            state.pricingGoalValue = elements.recipeTargetFoodCostInput.value;
            state.targetFoodCostPct = elements.recipeTargetFoodCostInput.value;
        }
    }

    function getValidPricingGoalType(value) {
        return PRICING_GOAL_LABELS[value] ? value : DEFAULT_PRICING_GOAL_TYPE;
    }

    function parsePositiveNumber(value) {
        const parsedValue = Number(value);
        return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
    }

    function parseGoalRatePercent(value) {
        const normalizedValue = String(value ?? "").trim();
        if (!normalizedValue) {
            return null;
        }
        const parsedValue = Number(normalizedValue);
        return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : null;
    }

    function getSuggestedPriceFromGoal(totalRecipeCost, goalType, goalValue) {
        const safeCost = parsePositiveNumber(totalRecipeCost);
        const safeGoalValue = parseGoalRatePercent(goalValue);
        const normalizedGoalType = getValidPricingGoalType(goalType);
        if (safeCost === null || safeGoalValue === null) {
            return null;
        }
        const goalRate = safeGoalValue / 100;
        if (normalizedGoalType === "food_cost_pct") {
            return goalRate > 0 ? safeCost / goalRate : null;
        }
        if (normalizedGoalType === "gross_margin_pct") {
            return goalRate >= 0 && goalRate < 1 ? safeCost / (1 - goalRate) : null;
        }
        if (normalizedGoalType === "markup_pct") {
            return safeCost * (1 + goalRate);
        }
        return null;
    }

    function hasAnalysis(elements) {
        const stateHost = elements.mainDashboardView || elements.recipesWorkspaceState;
        return stateHost?.dataset.hasAnalysis === "true";
    }

    function readSharedDataScope() {
        return "current_upload";
    }

    function writeSharedDataScope() {
        return;
    }

    function normalizeUnit(unit) {
        const normalizedUnit = String(unit || "").trim();
        return UNIT_ALIASES[normalizedUnit.toLowerCase()] || normalizedUnit;
    }

    function getUnitType(unit) {
        return UNIT_TYPE_MAP[normalizeUnit(unit)] || "";
    }

    function isPackageUnit(unit) {
        return getUnitType(unit) === "package";
    }

    function getBaseUnitForType(unitType) {
        return BASE_UNIT_BY_TYPE[unitType] || "";
    }

    function getPackageConversionKey(productName, purchaseUnit) {
        const normalizedProductName = String(productName || "").trim().toLowerCase();
        const normalizedPurchaseUnit = normalizeUnit(purchaseUnit);
        return `${normalizedProductName}::${normalizedPurchaseUnit}`;
    }

    function rememberPackageConversion(state, productName, purchaseUnit, purchaseSize, purchaseBaseUnit) {
        if (!state || !productName || !isPackageUnit(purchaseUnit) || Number(purchaseSize || 0) <= 0 || !purchaseBaseUnit) {
            return;
        }
        state.packageConversionMap.set(
            getPackageConversionKey(productName, purchaseUnit),
            {
                purchase_size: Number(purchaseSize),
                purchase_base_unit: normalizeUnit(purchaseBaseUnit)
            }
        );
    }

    function getRememberedPackageConversion(state, productName, purchaseUnit) {
        if (!state || !productName || !isPackageUnit(purchaseUnit)) {
            return null;
        }
        return state.packageConversionMap.get(getPackageConversionKey(productName, purchaseUnit)) || null;
    }

    function inferPurchaseSize(purchaseUnit, usageUnit) {
        const normalizedPurchaseUnit = normalizeUnit(purchaseUnit);
        const normalizedUsageUnit = normalizeUnit(usageUnit);
        if (!normalizedPurchaseUnit || !normalizedUsageUnit || normalizedPurchaseUnit === normalizedUsageUnit) {
            return 1;
        }
        if (isPackageUnit(normalizedPurchaseUnit)) {
            return 0;
        }
        const purchaseMeta = UNIT_FACTORS[normalizedPurchaseUnit];
        const usageMeta = UNIT_FACTORS[normalizedUsageUnit];
        if (purchaseMeta && usageMeta && purchaseMeta.type === usageMeta.type && usageMeta.factor > 0) {
            return purchaseMeta.factor / usageMeta.factor;
        }
        return 0;
    }

    function resolvePurchaseBaseUnit(purchaseUnit, usageUnit, fallbackBaseUnit = "") {
        const normalizedPurchaseUnit = normalizeUnit(purchaseUnit);
        const normalizedUsageUnit = normalizeUnit(usageUnit);
        const normalizedFallback = normalizeUnit(fallbackBaseUnit);
        if (normalizedPurchaseUnit && normalizedUsageUnit && normalizedPurchaseUnit === normalizedUsageUnit) {
            return normalizedPurchaseUnit;
        }
        if (isPackageUnit(normalizedPurchaseUnit)) {
            const fallbackType = getUnitType(normalizedFallback);
            if (fallbackType && fallbackType !== "package") {
                return getBaseUnitForType(fallbackType) || normalizedFallback;
            }
            const usageType = getUnitType(normalizedUsageUnit);
            if (usageType && usageType !== "package") {
                return getBaseUnitForType(usageType) || normalizedUsageUnit;
            }
            return "each";
        }
        const purchaseType = getUnitType(normalizedPurchaseUnit);
        if (purchaseType === "package") {
            return "each";
        }
        if (normalizedFallback && getUnitType(normalizedFallback) && getUnitType(normalizedFallback) !== "package") {
            return normalizedFallback;
        }
        return getBaseUnitForType(purchaseType) || normalizedPurchaseUnit || normalizedFallback || "";
    }

    function hasUnitTypeMismatch(ingredient) {
        const usageType = getUnitType(ingredient?.unit);
        const purchaseType = getUnitType(ingredient?.purchase_unit);
        const purchaseBaseType = getUnitType(ingredient?.purchase_base_unit);
        if (!usageType || !purchaseType) {
            return Boolean(usageType && purchaseType !== "package" && purchaseBaseType && usageType !== purchaseBaseType);
        }
        if (purchaseType === "package") {
            return !purchaseBaseType || purchaseBaseType === "package" || usageType !== purchaseBaseType;
        }
        return usageType !== purchaseType;
    }

    function createEmptyIngredient() {
        return {
            product_name: "",
            quantity: "",
            unit: "",
            purchase_unit: "",
            purchase_size: 1,
            purchase_base_unit: ""
        };
    }

    function createEmptyRecipe() {
        return {
            recipe_id: null,
            name: "",
            yield_portions: 1,
            pricing_mode: DEFAULT_PRICING_MODE,
            pricing_goal_type: DEFAULT_PRICING_GOAL_TYPE,
            pricing_goal_value: "",
            target_food_cost_pct: 0,
            ingredients: [createEmptyIngredient()]
        };
    }

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function normalizeIngredientDraft(ingredient = {}, state = null) {
        const rawProductName = String(ingredient.product_name || "");
        const lookupProductName = rawProductName.trim();
        const sourcePurchaseUnit = state ? getSourcePurchaseUnitForProduct(state, lookupProductName) : "";
        const purchaseUnit = normalizeUnit(sourcePurchaseUnit || ingredient.purchase_unit || ingredient.unit || "");
        const storedBaseUnit = normalizeUnit(ingredient.purchase_base_unit || ingredient.conversion_unit || "");
        const rememberedConversion = getRememberedPackageConversion(state, lookupProductName, purchaseUnit);
        const purchaseBaseUnit = resolvePurchaseBaseUnit(
            purchaseUnit,
            ingredient.unit || storedBaseUnit || purchaseUnit,
            rememberedConversion?.purchase_base_unit || storedBaseUnit
        );
        const purchaseType = getUnitType(purchaseUnit);
        const defaultUsageUnit = purchaseType === "package"
            ? (purchaseBaseUnit || "each")
            : purchaseUnit;
        const candidateUsageUnit = normalizeUnit(ingredient.unit || defaultUsageUnit || "");
        const usageUnit = getUnitType(candidateUsageUnit) === "package"
            ? normalizeUnit(defaultUsageUnit || purchaseBaseUnit || "each")
            : candidateUsageUnit;
        const explicitConversionRequired = Boolean(
            purchaseUnit
            && usageUnit
            && purchaseUnit !== usageUnit
        );
        const resolvedPurchaseBaseUnit = explicitConversionRequired
            ? normalizeUnit(ingredient.purchase_base_unit || usageUnit || purchaseBaseUnit)
            : normalizeUnit(usageUnit || purchaseUnit || purchaseBaseUnit);
        const purchaseSize = Number(
            ingredient.purchase_size
            || rememberedConversion?.purchase_size
            || 0
        );
        const normalizedIngredient = {
            product_name: rawProductName,
            quantity: ingredient.quantity === 0 ? 0 : (ingredient.quantity || ""),
            unit: usageUnit,
            purchase_unit: purchaseUnit,
            purchase_size: purchaseSize > 0
                ? purchaseSize
                : inferPurchaseSize(purchaseUnit, resolvedPurchaseBaseUnit || usageUnit),
            purchase_base_unit: resolvedPurchaseBaseUnit
        };
        rememberPackageConversion(
            state,
            lookupProductName,
            normalizedIngredient.purchase_unit,
            normalizedIngredient.purchase_size,
            normalizedIngredient.purchase_base_unit
        );
        return normalizedIngredient;
    }

    function normalizeRecipeDraft(recipe, state) {
        const normalizedRecipe = clone(recipe || createEmptyRecipe());
        normalizedRecipe.recipe_id = normalizedRecipe.recipe_id || null;
        normalizedRecipe.name = String(normalizedRecipe.name || "");
        normalizedRecipe.yield_portions = normalizedRecipe.yield_portions || 1;
        normalizedRecipe.pricing_mode = normalizedRecipe.pricing_mode || DEFAULT_PRICING_MODE;
        normalizedRecipe.selling_price = Number(normalizedRecipe.selling_price || 0);
        normalizedRecipe.pricing_goal_type = getValidPricingGoalType(normalizedRecipe.pricing_goal_type || DEFAULT_PRICING_GOAL_TYPE);
        normalizedRecipe.pricing_goal_value = Number(
            normalizedRecipe.pricing_goal_value
            || normalizedRecipe.target_food_cost_pct
            || 0
        );
        normalizedRecipe.target_food_cost_pct = Number(normalizedRecipe.target_food_cost_pct || 0);
        normalizedRecipe.total_recipe_cost = Number(normalizedRecipe.total_recipe_cost || 0);
        normalizedRecipe.cost_per_portion = Number(normalizedRecipe.cost_per_portion || 0);
        normalizedRecipe.gross_profit = Number(normalizedRecipe.gross_profit || 0);
        normalizedRecipe.gross_margin_pct = Number(normalizedRecipe.gross_margin_pct || 0);
        normalizedRecipe.food_cost_pct = Number(normalizedRecipe.food_cost_pct || 0);
        normalizedRecipe.suggested_selling_price = Number(normalizedRecipe.suggested_selling_price || 0);
        normalizedRecipe.ingredients = Array.isArray(normalizedRecipe.ingredients) && normalizedRecipe.ingredients.length
            ? normalizedRecipe.ingredients.map((ingredient) => normalizeIngredientDraft(ingredient, state))
            : [createEmptyIngredient()];
        return normalizedRecipe;
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
            deleteTargetRecipeId: null,
            isDeleting: false,
            openProductDropdownIndex: null,
            packageConversionMap: new Map(),
            recipeLibraryOpen: false,
            recipeLibrarySearch: "",
            recipeLibrarySort: "newest",
            scopeSummary: null,
            sellingPrice: "",
            pricingGoalType: DEFAULT_PRICING_GOAL_TYPE,
            pricingGoalValue: "",
            targetFoodCostPct: "",
            statusTimer: null
        };
    }

    function syncProductMap(state) {
        state.productMap = new Map(state.products.map((product) => [product.product_name, product]));
    }

    function clearStatusTimer(elements, state = null) {
        const timerId = state?.statusTimer ?? Number(elements.recipeStatusMessage?.dataset.timerId || 0);
        if (timerId) {
            window.clearTimeout(timerId);
        }
        if (state) {
            state.statusTimer = null;
        }
        if (elements.recipeStatusMessage) {
            elements.recipeStatusMessage.dataset.timerId = "";
        }
    }

    function setStatus(elements, message = "", tone = "", state = null) {
        if (!elements.recipeStatusMessage) {
            return;
        }
        clearStatusTimer(elements, state);
        elements.recipeStatusMessage.hidden = !message;
        elements.recipeStatusMessage.className = `recipe-status${tone ? ` is-${tone}` : ""}`;
        elements.recipeStatusMessage.textContent = message;
        if (!message) {
            return;
        }
        if (tone === "success" || tone === "danger" || tone === "info") {
            const timerId = window.setTimeout(() => {
                setStatus(elements, "", "", state);
            }, tone === "info" ? 2500 : 3200);
            if (state) {
                state.statusTimer = timerId;
            }
            elements.recipeStatusMessage.dataset.timerId = String(timerId);
        }
    }

    function resetCalculationView(elements) {
        if (elements.recipeTotalCost) elements.recipeTotalCost.textContent = "0.00";
        if (elements.recipeCostPerPortion) elements.recipeCostPerPortion.textContent = "0.00";
        if (elements.recipeMainCostDriver) elements.recipeMainCostDriver.textContent = "No recipe yet";
        if (elements.recipeMainCostDriverCopy) {
            elements.recipeMainCostDriverCopy.textContent = "The ingredient driving the largest share of recipe cost will appear here.";
        }
        if (elements.recipePricingModeChip) elements.recipePricingModeChip.textContent = "Choose a pricing mode";
        if (elements.recipeBreakdownList) {
            elements.recipeBreakdownList.innerHTML = '<div class="decision-list-empty">Add ingredients and choose a pricing mode to see the recipe cost breakdown.</div>';
        }
        renderPricingPanel(elements, {
            calculation: null,
            draft: createEmptyRecipe(),
            sellingPrice: "",
            pricingGoalType: DEFAULT_PRICING_GOAL_TYPE,
            pricingGoalValue: "",
            targetFoodCostPct: ""
        });
    }

    function getPricingMetrics(state, elements = null) {
        const calculation = state?.calculation || null;
        const totalRecipeCost = Number(calculation?.total_recipe_cost || 0);
        const costPerPortion = Number(calculation?.cost_per_portion || 0);
        const yieldPortions = Number(state?.draft?.yield_portions || 0);
        const sellingPriceValue = state?.sellingPrice ?? elements?.recipeSellingPriceInput?.value ?? "";
        const pricingGoalType = getValidPricingGoalType(
            state?.pricingGoalType
            ?? elements?.recipePricingGoalTypeSelect?.value
            ?? DEFAULT_PRICING_GOAL_TYPE
        );
        const goalValue = state?.pricingGoalValue ?? state?.targetFoodCostPct ?? elements?.recipeTargetFoodCostInput?.value ?? "";
        const sellingPrice = parsePositiveNumber(sellingPriceValue);
        const suggestedSellingPrice = getSuggestedPriceFromGoal(totalRecipeCost, pricingGoalType, goalValue);
        const effectiveSellingPriceTotal = suggestedSellingPrice ?? sellingPrice;
        const sellingPricePerPortion = effectiveSellingPriceTotal === null || !Number.isFinite(yieldPortions) || yieldPortions <= 0
            ? null
            : effectiveSellingPriceTotal / yieldPortions;
        const grossProfitPerPortion = sellingPricePerPortion === null ? null : sellingPricePerPortion - costPerPortion;
        const grossProfit = grossProfitPerPortion === null || !Number.isFinite(yieldPortions) || yieldPortions <= 0
            ? null
            : grossProfitPerPortion * yieldPortions;
        const grossMarginPct = effectiveSellingPriceTotal === null || grossProfit === null ? null : ((grossProfit / effectiveSellingPriceTotal) * 100);
        const foodCostPct = effectiveSellingPriceTotal === null ? null : ((totalRecipeCost / effectiveSellingPriceTotal) * 100);

        return {
            totalRecipeCost,
            costPerPortion,
            sellingPricePerPortion,
            grossProfitPerPortion,
            grossProfit,
            grossMarginPct,
            foodCostPct,
            suggestedSellingPrice,
            pricingGoalType,
            pricingGoalValue: String(goalValue ?? "").trim() === "" ? null : Number(goalValue || 0)
        };
    }

    function renderPricingPanel(elements, state) {
        syncPricingInputsFromElements(elements, state);
        const liveSellingPrice = state?.sellingPrice ?? elements?.recipeSellingPriceInput?.value ?? "";
        const livePricingGoalType = getValidPricingGoalType(
            state?.pricingGoalType
            ?? elements?.recipePricingGoalTypeSelect?.value
            ?? DEFAULT_PRICING_GOAL_TYPE
        );
        const livePricingGoalValue = state?.pricingGoalValue ?? state?.targetFoodCostPct ?? elements?.recipeTargetFoodCostInput?.value ?? "";
        const metrics = getPricingMetrics({
            ...state,
            sellingPrice: liveSellingPrice,
            pricingGoalType: livePricingGoalType,
            pricingGoalValue: livePricingGoalValue,
            targetFoodCostPct: livePricingGoalValue
        }, elements);
        if (elements.recipeSellingPriceInput && document.activeElement !== elements.recipeSellingPriceInput) {
            elements.recipeSellingPriceInput.value = liveSellingPrice;
        }
        if (elements.recipePricingGoalTypeSelect && document.activeElement !== elements.recipePricingGoalTypeSelect) {
            elements.recipePricingGoalTypeSelect.value = livePricingGoalType;
        }
        if (elements.recipePricingGoalValueLabel) {
            elements.recipePricingGoalValueLabel.textContent = `${PRICING_GOAL_LABELS[livePricingGoalType] || "Goal Value"} (%)`;
        }
        if (elements.recipePricingGoalHelper) {
            elements.recipePricingGoalHelper.textContent = PRICING_GOAL_HELPERS[livePricingGoalType] || PRICING_GOAL_HELPERS[DEFAULT_PRICING_GOAL_TYPE];
        }
        if (elements.recipeTargetFoodCostInput && document.activeElement !== elements.recipeTargetFoodCostInput) {
            elements.recipeTargetFoodCostInput.value = livePricingGoalValue ?? "";
        }
        if (elements.recipePricingTotalCost) {
            elements.recipePricingTotalCost.textContent = formatCurrency(metrics.totalRecipeCost);
        }
        if (elements.recipePricingCostPerPortion) {
            elements.recipePricingCostPerPortion.textContent = formatCurrency(metrics.costPerPortion);
        }
        if (elements.recipeSellingPricePerPortionValue) {
            elements.recipeSellingPricePerPortionValue.textContent = metrics.sellingPricePerPortion === null
                ? "--"
                : formatCurrency(metrics.sellingPricePerPortion);
        }
        if (elements.recipeGrossProfitValue) {
            elements.recipeGrossProfitValue.textContent = metrics.grossProfitPerPortion === null ? "--" : formatCurrency(metrics.grossProfitPerPortion);
        }
        if (elements.recipeGrossProfitSubtext) {
            elements.recipeGrossProfitSubtext.textContent = metrics.grossProfit === null
                ? "Total: --"
                : `Total: ${formatCurrency(metrics.grossProfit)}`;
        }
        if (elements.recipeGrossMarginValue) {
            elements.recipeGrossMarginValue.textContent = metrics.grossMarginPct === null ? "--" : formatPercent(metrics.grossMarginPct);
        }
        if (elements.recipeFoodCostValue) {
            elements.recipeFoodCostValue.textContent = metrics.foodCostPct === null ? "--" : formatPercent(metrics.foodCostPct);
        }
        if (elements.recipeSuggestedPriceValue) {
            elements.recipeSuggestedPriceValue.textContent = metrics.suggestedSellingPrice === null ? "--" : formatCurrency(metrics.suggestedSellingPrice);
        }
    }

    function buildPricingSnapshot(state, elements = null) {
        syncPricingInputsFromElements(elements, state);
        const metrics = getPricingMetrics(state, elements);
        return {
            selling_price: Number((state?.sellingPrice ?? elements?.recipeSellingPriceInput?.value ?? "") || 0),
            pricing_goal_type: metrics.pricingGoalType,
            pricing_goal_value: metrics.pricingGoalValue === null ? null : Number(metrics.pricingGoalValue),
            target_food_cost_pct: metrics.pricingGoalType === "food_cost_pct" ? Number(metrics.pricingGoalValue || 0) : 0,
            total_recipe_cost: Number(metrics.totalRecipeCost || 0),
            cost_per_portion: Number(metrics.costPerPortion || 0),
            gross_profit: metrics.grossProfit === null ? 0 : Number(metrics.grossProfit),
            gross_margin_pct: metrics.grossMarginPct === null ? 0 : Number(metrics.grossMarginPct),
            food_cost_pct: metrics.foodCostPct === null ? 0 : Number(metrics.foodCostPct),
            suggested_selling_price: metrics.suggestedSellingPrice === null ? 0 : Number(metrics.suggestedSellingPrice)
        };
    }

    function renderPricingModes(elements, state) {
        if (!elements.recipePricingModeSelect) {
            return;
        }
        elements.recipePricingModeSelect.disabled = false;
        elements.recipePricingModeSelect.innerHTML = state.pricingModes.map((mode) => `
            <option value="${escapeHtml(mode.value)}">${escapeHtml(mode.label)}</option>
        `).join("");
        elements.recipePricingModeSelect.value = state.draft.pricing_mode || DEFAULT_PRICING_MODE;
    }

    function renderScopeSummary(elements, state) {
        if (elements.recipeDataScopeSelect) {
            elements.recipeDataScopeSelect.value = state.dataScope || "current_upload";
        }
        if (!elements.recipeDataScopeSummary) {
            return;
        }
        const summary = state.scopeSummary || {};
        const rowCount = Number(summary.row_count || 0);
        const productCount = Number(summary.product_count || 0);
        const scopeLabel = summary.scope_label || "Current Upload";
        elements.recipeDataScopeSummary.textContent = rowCount
            ? `${scopeLabel} • ${productCount} products • ${rowCount} rows`
            : `${scopeLabel} • No analyzed rows`;
    }

    function getUnitsForProduct(state, productName) {
        return state.productMap.get(productName)?.units || [];
    }

    function renderScopeSummary(elements, state) {
        if (!elements.recipeDataScopeSummary) {
            return;
        }
        const summary = state.scopeSummary || {};
        const rowCount = Number(summary.row_count || 0);
        const productCount = Number(summary.product_count || 0);
        const scopeLabel = summary.scope_label || "Current File";
        elements.recipeDataScopeSummary.textContent = rowCount
            ? `${scopeLabel} • ${productCount} products • ${rowCount} rows`
            : `${scopeLabel} • No analyzed file yet`;
    }

    function getSourcePurchaseUnitForProduct(state, productName) {
        const product = state.productMap.get(productName);
        return normalizeUnit(product?.purchase_unit || product?.units?.[0] || "");
    }

    function clearIngredientProductSelection(state, index) {
        if (!state.draft.ingredients[index]) {
            return;
        }
        state.draft.ingredients[index].product_name = "";
        state.draft.ingredients[index].unit = "";
        state.draft.ingredients[index].purchase_unit = "";
        state.draft.ingredients[index].purchase_size = 1;
        state.draft.ingredients[index].purchase_base_unit = "";
        state.openProductDropdownIndex = null;
    }

    function clearInvalidIngredientBindings(state) {
        const invalidProductNames = [];
        state.draft.ingredients = (state.draft.ingredients || []).map((ingredient) => {
            const normalizedIngredient = normalizeIngredientDraft(ingredient, state);
            const productName = String(normalizedIngredient.product_name || "").trim();
            if (!productName || state.productMap.has(productName)) {
                return normalizedIngredient;
            }
            invalidProductNames.push(productName);
            return {
                ...normalizedIngredient,
                product_name: "",
                unit: "",
                purchase_unit: "",
                purchase_size: 1,
                purchase_base_unit: ""
            };
        });
        return invalidProductNames;
    }

    function applyDraftValidationFeedback(elements, invalidProductNames) {
        if (!invalidProductNames.length) {
            return;
        }
        const uniqueNames = Array.from(new Set(invalidProductNames));
        const preview = uniqueNames.slice(0, 2).join(", ");
        const remainder = uniqueNames.length > 2 ? ` and ${uniqueNames.length - 2} more` : "";
        const verb = uniqueNames.length === 1 ? "is" : "are";
        setStatus(
            elements,
            `${preview}${remainder} ${verb} no longer in the active analyzed dataset. Reselect the cleared ingredient row${uniqueNames.length === 1 ? "" : "s"}.`,
            "info"
        );
    }

    function getFilteredProducts(state, query) {
        const normalizedQuery = String(query || "").trim().toLowerCase();
        const products = Array.isArray(state.products) ? state.products : [];
        if (!normalizedQuery) {
            return products;
        }
        return products.filter((product) => (
            String(product.product_name || "").toLowerCase().includes(normalizedQuery)
        ));
    }

    function formatRecipeUpdatedAt(value) {
        if (!value) {
            return "Not saved yet";
        }
        try {
            return new Date(value).toLocaleDateString("en-US");
        } catch (error) {
            return "Not saved yet";
        }
    }

    function getSortedRecipes(recipes, sortMode = "newest") {
        return [...(recipes || [])].sort((leftRecipe, rightRecipe) => {
            if (sortMode === "name_asc") {
                return String(leftRecipe.name || "").localeCompare(String(rightRecipe.name || ""));
            }
            if (sortMode === "oldest") {
                return new Date(leftRecipe.updated_at || 0).getTime() - new Date(rightRecipe.updated_at || 0).getTime();
            }
            if (sortMode === "cost_desc") {
                return Number(rightRecipe.cost_per_portion || 0) - Number(leftRecipe.cost_per_portion || 0);
            }
            if (sortMode === "cost_asc") {
                return Number(leftRecipe.cost_per_portion || 0) - Number(rightRecipe.cost_per_portion || 0);
            }
            return new Date(rightRecipe.updated_at || 0).getTime() - new Date(leftRecipe.updated_at || 0).getTime();
        });
    }

    function getLibraryRecipes(state) {
        const query = String(state.recipeLibrarySearch || "").trim().toLowerCase();
        const recipes = query
            ? state.recipes.filter((recipe) => String(recipe.name || "").toLowerCase().includes(query))
            : state.recipes;
        return getSortedRecipes(recipes, state.recipeLibrarySort);
    }

    function getArchivePricingMetrics(recipe) {
        const costPerPortion = Number(recipe?.cost_per_portion || 0);
        const yieldPortions = Number(recipe?.yield_portions || 0);
        const pricingGoalType = getValidPricingGoalType(recipe?.pricing_goal_type || DEFAULT_PRICING_GOAL_TYPE);
        const pricingGoalValue = Number(recipe?.pricing_goal_value || recipe?.target_food_cost_pct || 0);
        const savedSellingPriceTotal = Number(recipe?.selling_price || 0);
        const savedSellingPricePerPortion = savedSellingPriceTotal > 0 && yieldPortions > 0
            ? savedSellingPriceTotal / yieldPortions
            : null;
        const markupDerivedSellingPricePerPortion = pricingGoalType === "markup_pct" && pricingGoalValue >= 0 && costPerPortion > 0
            ? costPerPortion * (1 + (pricingGoalValue / 100))
            : null;
        const profitabilitySellingPricePerPortion = savedSellingPricePerPortion !== null
            ? savedSellingPricePerPortion
            : markupDerivedSellingPricePerPortion;
        const suggestedSellingPricePerPortion = pricingGoalValue >= 0 && costPerPortion > 0
            ? Number(getSuggestedPriceFromGoal(costPerPortion, pricingGoalType, pricingGoalValue) || 0)
            : 0;
        const suggestedSellingPriceTotal = suggestedSellingPricePerPortion > 0 && yieldPortions > 0
            ? suggestedSellingPricePerPortion * yieldPortions
            : 0;
        const hasValidProfitabilityPrice = profitabilitySellingPricePerPortion !== null && profitabilitySellingPricePerPortion > 0;
        const grossProfitPerPortion = hasValidProfitabilityPrice
            ? profitabilitySellingPricePerPortion - costPerPortion
            : null;
        const grossProfitTotal = grossProfitPerPortion !== null && yieldPortions > 0
            ? grossProfitPerPortion * yieldPortions
            : null;
        const grossMarginPct = hasValidProfitabilityPrice && grossProfitPerPortion !== null
            ? (grossProfitPerPortion / profitabilitySellingPricePerPortion) * 100
            : null;
        const foodCostPct = hasValidProfitabilityPrice
            ? (costPerPortion / profitabilitySellingPricePerPortion) * 100
            : null;

        return {
            suggestedSellingPriceTotal: suggestedSellingPriceTotal > 0 ? suggestedSellingPriceTotal : null,
            suggestedSellingPricePerPortion: suggestedSellingPricePerPortion > 0 ? suggestedSellingPricePerPortion : null,
            grossProfitPerPortion,
            grossProfitTotal,
            grossMarginPct,
            foodCostPct
        };
    }

    function renderIngredients(elements, state) {
        if (!elements.recipeIngredientsList) {
            return;
        }

        elements.recipeIngredientsList.innerHTML = state.draft.ingredients.map((ingredient, index) => {
            const normalizedIngredient = normalizeIngredientDraft(ingredient, state);
            state.draft.ingredients[index] = normalizedIngredient;
            const productResults = getFilteredProducts(state, normalizedIngredient.product_name);
            const productOptions = productResults
                .map((product) => `
                    <button
                        type="button"
                        class="recipe-product-option"
                        data-select-product="${escapeHtml(product.product_name)}"
                        data-index="${index}"
                    >${escapeHtml(product.product_name)}</button>
                `)
                .join("");
            const productDropdownOpen = state.openProductDropdownIndex === index;
            const purchaseUnitType = getUnitType(normalizedIngredient.purchase_unit);
            const purchaseBaseUnit = resolvePurchaseBaseUnit(
                normalizedIngredient.purchase_unit,
                normalizedIngredient.unit,
                normalizedIngredient.purchase_base_unit
            );
            normalizedIngredient.purchase_base_unit = purchaseBaseUnit;
            const hasMismatch = hasUnitTypeMismatch(normalizedIngredient);
            const availableUnits = Array.from(new Set([
                normalizedIngredient.unit,
                ...RECIPE_UNIT_OPTIONS
            ].filter(Boolean)));
            const unitOptions = [
                '<option value="">Usage unit</option>',
                ...availableUnits.map((unit) => `<option value="${escapeHtml(unit)}" ${unit === normalizedIngredient.unit ? "selected" : ""}>${escapeHtml(unit)}</option>`)
            ].join("");
            const packageBaseUnits = Array.from(new Set([
                purchaseBaseUnit,
                ...PACKAGE_BASE_UNIT_OPTIONS
            ].filter(Boolean)));
            const packageBaseOptions = packageBaseUnits
                .map((unit) => `<option value="${escapeHtml(unit)}" ${unit === purchaseBaseUnit ? "selected" : ""}>${escapeHtml(unit)}</option>`)
                .join("");
            const showConversionBasis = Boolean(
                normalizedIngredient.product_name
                && normalizedIngredient.purchase_unit
                && normalizedIngredient.unit
                && normalizedIngredient.purchase_unit !== normalizedIngredient.unit
            );
            const conversionTargetUnit = normalizeUnit(normalizedIngredient.unit || purchaseBaseUnit || "unit");
            const conversionMissing = showConversionBasis && Number(normalizedIngredient.purchase_size || 0) <= 0;

            return `
                <div class="recipe-ingredient-row recipe-ingredient-grid${productDropdownOpen ? " is-product-open" : ""}" data-index="${index}">
                    <label class="recipe-field recipe-ingredient-cell">
                        <span class="recipe-field-label">Product Name</span>
                        <div class="recipe-product-picker-wrap">
                            <input
                                type="text"
                                class="recipe-input recipe-product-search-input${normalizedIngredient.product_name ? " has-clear-action" : ""}"
                                data-field="product_name"
                                data-index="${index}"
                                value="${escapeHtml(normalizedIngredient.product_name)}"
                                placeholder="Search product"
                                autocomplete="off"
                                aria-expanded="${productDropdownOpen ? "true" : "false"}"
                            >
                            ${normalizedIngredient.product_name ? `
                                <button
                                    type="button"
                                    class="recipe-product-clear-btn"
                                    data-clear-product="${index}"
                                    aria-label="Clear selected product"
                                >x</button>
                            ` : ""}
                            ${productDropdownOpen ? `
                                <div class="recipe-product-dropdown" data-product-dropdown="${index}">
                                    ${productOptions || '<div class="recipe-product-option-empty">No matching products</div>'}
                                </div>
                            ` : ""}
                        </div>
                        <div class="recipe-purchase-meta">Bought as: 1 ${escapeHtml(normalizedIngredient.purchase_unit || "purchase unit")}</div>
                    </label>
                    <label class="recipe-field recipe-ingredient-cell">
                        <span class="recipe-field-label">Usage Qty</span>
                        <input type="number" min="0" step="0.01" class="recipe-input" data-field="quantity" data-index="${index}" value="${escapeHtml(normalizedIngredient.quantity)}" placeholder="0.00">
                    </label>
                    <label class="recipe-field recipe-ingredient-cell">
                        <span class="recipe-field-label">Recipe Unit</span>
                        <select class="recipe-select" data-field="unit" data-index="${index}" ${normalizedIngredient.product_name ? "" : "disabled"}>
                            ${unitOptions}
                        </select>
                        ${showConversionBasis ? `
                            <div class="recipe-conversion-block">
                                <div class="recipe-conversion-label">Conversion</div>
                                <div class="recipe-conversion-row">
                                    <div class="recipe-conversion-equation">
                                        <span class="recipe-conversion-copy">1 ${escapeHtml(normalizedIngredient.purchase_unit || "unit")}</span>
                                        <span class="recipe-conversion-copy">=</span>
                                        <input
                                            type="number"
                                            min="0.0001"
                                            step="0.01"
                                            class="recipe-input recipe-conversion-input"
                                            data-field="purchase_size"
                                            data-index="${index}"
                                            value="${escapeHtml(normalizedIngredient.purchase_size)}"
                                            placeholder="0"
                                        >
                                        <span class="recipe-conversion-copy is-target-unit">${escapeHtml(conversionTargetUnit)}</span>
                                    </div>
                                    <span
                                        class="recipe-conversion-info"
                                        tabindex="0"
                                        data-tooltip="Define how many ${escapeHtml(conversionTargetUnit)} are in 1 ${escapeHtml(normalizedIngredient.purchase_unit || "purchase unit")}."
                                        aria-label="Define how many ${escapeHtml(conversionTargetUnit)} are in 1 ${escapeHtml(normalizedIngredient.purchase_unit || "purchase unit")}."
                                    >i</span>
                                </div>
                            </div>
                        ` : ""}
                        ${conversionMissing ? `
                            <div class="recipe-unit-warning">Define how many ${escapeHtml(conversionTargetUnit)} are in 1 ${escapeHtml(normalizedIngredient.purchase_unit || "purchase unit")}.</div>
                        ` : ""}
                        ${hasMismatch ? `
                            <div class="recipe-unit-warning">Selected unit type does not match product type.</div>
                        ` : ""}
                    </label>
                    <div class="recipe-ingredient-action">
                        <button type="button" class="recipe-remove-btn" data-remove-ingredient="${index}" aria-label="Remove ingredient">Remove</button>
                    </div>
                </div>
            `;
        }).join("");
    }

    function renderRecipeList(elements, state) {
        if (!elements.recipesList || !elements.recipesEmpty) {
            return;
        }

        if (!state.recipes.length) {
            elements.recipesList.innerHTML = "";
            elements.recipesEmpty.hidden = false;
            if (elements.openRecipeLibraryInlineButton) {
                elements.openRecipeLibraryInlineButton.hidden = true;
            }
            return;
        }

        elements.recipesEmpty.hidden = true;
        if (elements.openRecipeLibraryInlineButton) {
            elements.openRecipeLibraryInlineButton.hidden = false;
        }
        elements.recipesList.innerHTML = getSortedRecipes(state.recipes, "newest").slice(0, 5).map((recipe) => {
            const updatedLabel = formatRecipeUpdatedAt(recipe.updated_at);
            return `
                <div class="recipe-list-item-shell">
                    <button type="button" class="recipe-list-item" data-open-recipe="${escapeHtml(recipe.recipe_id)}">
                        <span class="recipe-list-name">${escapeHtml(recipe.name)}</span>
                        <span class="recipe-list-meta">${Number(recipe.yield_portions || 0)} portion${Number(recipe.yield_portions || 0) === 1 ? "" : "s"} | Updated ${escapeHtml(updatedLabel)} | Snapshot</span>
                    </button>
                    <button type="button" class="recipe-list-delete-btn" data-delete-recipe="${escapeHtml(recipe.recipe_id)}" aria-label="Delete ${escapeHtml(recipe.name)} recipe">x</button>
                </div>
                ${state.deleteConfirmVisible && state.deleteTargetRecipeId === recipe.recipe_id ? `
                    <div class="recipe-delete-confirm recipe-delete-confirm-sidebar">
                        <div class="recipe-delete-confirm-copy">
                            <strong>Delete this recipe?</strong>
                            <span>This action cannot be undone.</span>
                        </div>
                        <div class="recipe-delete-confirm-actions">
                            <button type="button" class="secondary-btn" data-cancel-recipe-delete>Cancel</button>
                            <button type="button" class="action-btn" data-confirm-recipe-delete="${escapeHtml(recipe.recipe_id)}" ${state.isDeleting ? "disabled" : ""}>${state.isDeleting ? "Deleting..." : "Delete"}</button>
                        </div>
                    </div>
                ` : ""}
            `;
        }).join("");
    }

    function renderRecipeLibraryDetail(elements, state, recipes) {
        if (!elements.recipeLibraryDetail) {
            return;
        }

        const selectedRecipe = recipes.find((recipe) => recipe.recipe_id === state.activeRecipeId)
            || recipes[0]
            || null;

        if (!selectedRecipe) {
            elements.recipeLibraryDetail.innerHTML = `
                <div class="recipes-library-detail-empty">
                    <div class="recipes-library-empty-title">No snapshot selected</div>
                    <div class="recipes-library-empty-copy">Choose a saved recipe to review its archived snapshot details.</div>
                </div>
            `;
            return;
        }

        state.activeRecipeId = selectedRecipe.recipe_id;
        const ingredients = Array.isArray(selectedRecipe.ingredients) ? selectedRecipe.ingredients : [];
        const archivedGoalType = getValidPricingGoalType(selectedRecipe.pricing_goal_type || DEFAULT_PRICING_GOAL_TYPE);
        const archivedGoalLabel = PRICING_GOAL_LABELS[archivedGoalType] || PRICING_GOAL_LABELS[DEFAULT_PRICING_GOAL_TYPE];
        const archivedGoalValue = Number(selectedRecipe.pricing_goal_value || selectedRecipe.target_food_cost_pct || 0);
        const archivePricingMetrics = getArchivePricingMetrics(selectedRecipe);
        elements.recipeLibraryDetail.innerHTML = `
            <div class="recipes-library-detail-card">
                <div class="panel-label">Archived Snapshot</div>
                <h3 class="recipes-library-detail-title">${escapeHtml(selectedRecipe.name || "Untitled recipe")}</h3>
                <div class="recipes-library-detail-meta">Saved ${escapeHtml(formatRecipeUpdatedAt(selectedRecipe.updated_at))} • ${Number(selectedRecipe.yield_portions || 0)} portion${Number(selectedRecipe.yield_portions || 0) === 1 ? "" : "s"}</div>
                <div class="recipes-library-detail-kpis">
                    <div class="recipes-library-detail-kpi">
                        <span>Saved Total Cost</span>
                        <strong>${formatCurrency(selectedRecipe.total_recipe_cost || 0)}</strong>
                    </div>
                    <div class="recipes-library-detail-kpi">
                        <span>Saved Cost / Portion</span>
                        <strong>${formatCurrency(selectedRecipe.cost_per_portion || 0)}</strong>
                    </div>
                </div>
                <div class="recipes-library-detail-section">
                    <div class="panel-label">Profitability Outputs</div>
                    <div class="recipes-library-detail-pricing-grid">
                        <div class="recipes-library-detail-row">
                            <strong>Gross Profit</strong>
                            <span>${archivePricingMetrics.grossProfitPerPortion === null ? "--" : `${formatCurrency(archivePricingMetrics.grossProfitPerPortion)} / portion | Total: ${formatCurrency(archivePricingMetrics.grossProfitTotal)}`}</span>
                        </div>
                        <div class="recipes-library-detail-row">
                            <strong>Gross Margin %</strong>
                            <span>${archivePricingMetrics.grossMarginPct === null ? "--" : formatPercent(archivePricingMetrics.grossMarginPct)}</span>
                        </div>
                        <div class="recipes-library-detail-row">
                            <strong>Food Cost %</strong>
                            <span>${archivePricingMetrics.foodCostPct === null ? "--" : formatPercent(archivePricingMetrics.foodCostPct)}</span>
                        </div>
                    </div>
                </div>
                <div class="recipes-library-detail-section">
                    <div class="panel-label">Target &amp; Suggested Pricing</div>
                    <div class="recipes-library-detail-pricing-grid">
                        <div class="recipes-library-detail-row">
                            <strong>${escapeHtml(archivedGoalLabel)}</strong>
                            <span>${formatOptionalPercent(archivedGoalValue)}</span>
                        </div>
                        <div class="recipes-library-detail-row">
                            <strong>Suggested Selling Price (Total)</strong>
                            <span>${archivePricingMetrics.suggestedSellingPriceTotal === null ? "--" : formatCurrency(archivePricingMetrics.suggestedSellingPriceTotal)}</span>
                        </div>
                        <div class="recipes-library-detail-row">
                            <strong>Suggested Selling Price Per Portion</strong>
                            <span>${archivePricingMetrics.suggestedSellingPricePerPortion === null ? "--" : formatCurrency(archivePricingMetrics.suggestedSellingPricePerPortion)}</span>
                        </div>
                    </div>
                </div>
                <div class="recipes-library-detail-section">
                    <div class="panel-label">Ingredients</div>
                    <div class="recipes-library-detail-list">
                        ${ingredients.length ? ingredients.map((ingredient) => `
                            <div class="recipes-library-detail-row">
                                <strong>${escapeHtml(ingredient.product_name || "Unnamed ingredient")}</strong>
                                <span>${Number(ingredient.quantity || 0)} ${escapeHtml(ingredient.unit || "")}</span>
                            </div>
                        `).join("") : '<div class="recipes-library-empty-copy">No archived ingredients saved for this recipe.</div>'}
                    </div>
                </div>
                <div class="recipes-library-actions">
                    <button type="button" class="action-btn" data-load-recipe-builder="${escapeHtml(selectedRecipe.recipe_id)}">Open in Builder</button>
                </div>
                <div class="recipes-library-detail-note">Open this snapshot in Recipe Builder to continue editing and save updated values.</div>
            </div>
        `;
    }

    function renderRecipeLibrary(elements, state) {
        if (!elements.recipeLibraryOverlay || !elements.recipeLibraryList) {
            return;
        }

        elements.recipeLibraryOverlay.hidden = !state.recipeLibraryOpen;
        if (!state.recipeLibraryOpen) {
            return;
        }

        if (elements.recipeLibrarySearchInput && document.activeElement !== elements.recipeLibrarySearchInput) {
            elements.recipeLibrarySearchInput.value = state.recipeLibrarySearch || "";
        }
        if (elements.recipeLibrarySortSelect) {
            elements.recipeLibrarySortSelect.value = state.recipeLibrarySort || "newest";
        }

        const recipes = getLibraryRecipes(state);
        elements.recipeLibraryList.innerHTML = recipes.length
            ? recipes.map((recipe) => {
                const isActive = recipe.recipe_id === state.activeRecipeId;
                const ingredientCount = Array.isArray(recipe.ingredients) ? recipe.ingredients.length : 0;
                const previewIngredient = Array.isArray(recipe.ingredients) && recipe.ingredients.length
                    ? recipe.ingredients[0].product_name
                    : "No ingredients yet";
                const updatedLabel = formatRecipeUpdatedAt(recipe.updated_at);
                return `
                    <div class="recipes-library-row-shell ${isActive ? "is-active" : ""}" data-open-library-recipe="${escapeHtml(recipe.recipe_id)}" tabindex="0" role="button" aria-label="Open snapshot for ${escapeHtml(recipe.name || "recipe")}">
                        <div class="recipes-library-row">
                            <div class="recipes-library-main-copy">
                                <div class="recipes-library-name">${escapeHtml(recipe.name || "Untitled recipe")}</div>
                                <div class="recipes-library-meta">Updated ${escapeHtml(updatedLabel)} | ${ingredientCount} ingredient${ingredientCount === 1 ? "" : "s"}</div>
                            </div>
                        </div>
                        <div class="recipes-library-metric">
                            <span class="recipes-library-metric-label">Per Portion</span>
                            <strong>${formatCurrency(recipe.cost_per_portion || 0)}</strong>
                        </div>
                        <div class="recipes-library-metric total">
                            <span class="recipes-library-metric-label">Total Cost</span>
                            <strong>${formatCurrency(recipe.total_recipe_cost || 0)}</strong>
                        </div>
                        <div class="recipes-library-actions">
                            <button type="button" class="recipe-list-delete-btn recipes-library-delete-btn" data-delete-recipe="${escapeHtml(recipe.recipe_id)}" aria-label="Delete ${escapeHtml(recipe.name || "recipe")}">x</button>
                        </div>
                    </div>
                    ${state.deleteConfirmVisible && state.deleteTargetRecipeId === recipe.recipe_id ? `
                        <div class="recipe-delete-confirm recipe-library-delete-confirm">
                            <div class="recipe-delete-confirm-copy">
                                <strong>Delete this recipe?</strong>
                                <span>This action cannot be undone.</span>
                            </div>
                            <div class="recipe-delete-confirm-actions">
                                <button type="button" class="secondary-btn" data-cancel-recipe-delete>Cancel</button>
                                <button type="button" class="action-btn" data-confirm-recipe-delete="${escapeHtml(recipe.recipe_id)}" ${state.isDeleting ? "disabled" : ""}>${state.isDeleting ? "Deleting..." : "Delete"}</button>
                            </div>
                        </div>
                    ` : ""}
                `;
            }).join("")
              : `
                  <div class="recipes-library-empty-state">
                      <div class="recipes-library-empty-title">${state.recipes.length ? "No matching recipes" : "No recipes yet"}</div>
                      <div class="recipes-library-empty-copy">${state.recipes.length ? "Try a different recipe name or sort mode." : "Create your first recipe to start tracking costs."}</div>
                      ${state.recipes.length ? "" : '<button type="button" class="action-btn" id="recipeLibraryEmptyCreateButton">Create Recipe</button>'}
                  </div>
              `;
        renderRecipeLibraryDetail(elements, state, recipes);
    }

    function renderRecipeCollections(elements, state) {
        renderRecipeList(elements, state);
        renderRecipeLibrary(elements, state);
    }

    function renderEditor(elements, state) {
        if (!state.draft.ingredients.length) {
            state.draft.ingredients = [createEmptyIngredient()];
        }
        if (elements.recipeEditorTitle) {
            const isEditing = Boolean(state.draft.recipe_id);
            elements.recipeEditorTitle.textContent = isEditing ? "Edit recipe" : "Create a recipe";
            elements.recipeEditorTitle.classList.toggle("is-editing", isEditing);
        }
        if (elements.recipeNameInput) elements.recipeNameInput.value = state.draft.name || "";
        if (elements.recipeYieldInput) elements.recipeYieldInput.value = state.draft.yield_portions || 1;
        renderPricingModes(elements, state);
        renderIngredients(elements, state);
        renderPricingPanel(elements, state);
        if (elements.saveRecipeButton) {
            elements.saveRecipeButton.textContent = "Save Recipe";
        }
    }

    function startNewRecipeDraft(elements, state, statusMessage = "Started a new recipe draft.") {
        state.activeRecipeId = null;
        state.deleteConfirmVisible = false;
        state.deleteTargetRecipeId = null;
        state.openProductDropdownIndex = null;
        state.recipeLibraryOpen = false;
        state.draft = createEmptyRecipe();
        state.calculation = null;
        state.sellingPrice = "";
        state.pricingGoalType = DEFAULT_PRICING_GOAL_TYPE;
        state.pricingGoalValue = "";
        state.targetFoodCostPct = "";
        renderRecipeCollections(elements, state);
        renderEditor(elements, state);
        renderCalculation(elements, null);
        setStatus(elements, statusMessage, "info", state);
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
                            <div class="decision-item-meta">${Number(item.quantity)} ${escapeHtml(item.unit)} = ${Number(item.usage_quantity_in_base_unit || 0).toFixed(4)} ${escapeHtml(item.purchase_base_unit || item.unit)} using ${Number(item.purchase_ratio || 0).toFixed(4)} ${escapeHtml(item.purchase_unit || item.unit)}.</div>
                            <div class="decision-item-meta">Basis: 1 ${escapeHtml(item.purchase_unit || item.unit)} = ${Number(item.purchase_size || 1)} ${escapeHtml(item.purchase_base_unit || item.unit)} | ${formatCurrency(item.price_used)} / ${escapeHtml(item.purchase_unit || item.unit)} | ${escapeHtml(item.pricing_label)} | Supplier: ${escapeHtml(item.supplier)}</div>
                        </div>
                        <div class="decision-item-value negative">${formatCurrency(item.ingredient_cost)}</div>
                    </article>
                `).join("")
                  : '<div class="decision-list-empty">Add ingredients and choose a pricing mode to see the recipe cost breakdown.</div>';
        }
        renderPricingPanel(elements, {
            calculation,
            sellingPrice: elements.recipeSellingPriceInput?.value ?? "",
            pricingGoalType: elements.recipePricingGoalTypeSelect?.value ?? DEFAULT_PRICING_GOAL_TYPE,
            pricingGoalValue: elements.recipeTargetFoodCostInput?.value ?? "",
            targetFoodCostPct: elements.recipeTargetFoodCostInput?.value ?? ""
        });
    }

    function getFilledIngredients(state) {
        return state.draft.ingredients
            .map((ingredient) => normalizeIngredientDraft(ingredient, state))
            .filter((ingredient) => ingredient.product_name || ingredient.unit || ingredient.purchase_unit || ingredient.quantity);
    }

    function buildPayload(state, { requireComplete = false, elements = null } = {}) {
        const filledIngredients = getFilledIngredients(state);
        const mismatchedIngredient = filledIngredients.find((ingredient) => (
            ingredient.product_name
            && ingredient.unit
            && ingredient.purchase_unit
            && hasUnitTypeMismatch(ingredient)
        ));
        if (mismatchedIngredient) {
            throw new Error("Selected unit type does not match product type.");
        }
        const completeIngredients = filledIngredients.filter((ingredient) => (
            ingredient.product_name
            && ingredient.unit
            && ingredient.purchase_unit
            && ingredient.purchase_base_unit
            && !hasUnitTypeMismatch(ingredient)
            && Number(ingredient.quantity) > 0
            && Number(ingredient.purchase_size) > 0
        ));

        if (requireComplete && filledIngredients.length !== completeIngredients.length) {
            throw new Error("Complete each ingredient row before saving the recipe.");
        }

        if (!completeIngredients.length) {
            return null;
        }

        const pricingSnapshot = buildPricingSnapshot(state, elements);
        return {
            recipe_id: state.draft.recipe_id,
            name: String(state.draft.name || "").trim(),
            yield_portions: Number(state.draft.yield_portions || 0),
            pricing_mode: state.draft.pricing_mode || DEFAULT_PRICING_MODE,
            selling_price: pricingSnapshot.selling_price,
            pricing_goal_type: pricingSnapshot.pricing_goal_type,
            pricing_goal_value: pricingSnapshot.pricing_goal_value,
            target_food_cost_pct: pricingSnapshot.target_food_cost_pct,
            total_recipe_cost: pricingSnapshot.total_recipe_cost,
            cost_per_portion: pricingSnapshot.cost_per_portion,
            gross_profit: pricingSnapshot.gross_profit,
            gross_margin_pct: pricingSnapshot.gross_margin_pct,
            food_cost_pct: pricingSnapshot.food_cost_pct,
            suggested_selling_price: pricingSnapshot.suggested_selling_price,
            ingredients: completeIngredients.map((ingredient) => ({
                product_name: ingredient.product_name,
                quantity: Number(ingredient.quantity),
                unit: ingredient.unit,
                purchase_unit: ingredient.purchase_unit,
                purchase_size: Number(ingredient.purchase_size || 1),
                purchase_base_unit: ingredient.purchase_base_unit
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
            const data = await fetchJson("/recipes/bootstrap");
            state.products = [];
            syncProductMap(state);
            state.packageConversionMap = new Map();
            state.pricingModes = data.pricing_modes || [];
            state.recipes = (data.recipes || []).map((recipe) => normalizeRecipeDraft(recipe, state));
            state.activeRecipeId = null;
            state.deleteConfirmVisible = false;
            state.deleteTargetRecipeId = null;
            state.isDeleting = false;
            state.recipeLibraryOpen = false;
            state.openProductDropdownIndex = null;
            state.draft = createEmptyRecipe();
            state.calculation = null;
            state.sellingPrice = "";
            state.pricingGoalType = DEFAULT_PRICING_GOAL_TYPE;
            state.pricingGoalValue = "";
            state.targetFoodCostPct = "";
            state.scopeSummary = data.scope_summary || null;
            state.isLoaded = true;
            renderScopeSummary(elements, state);
            renderRecipeCollections(elements, state);
            renderEditor(elements, state);
            renderCalculation(elements, null);
            return;
        }

        const data = await fetchJson("/recipes/bootstrap");
        state.products = data.products || [];
        state.pricingModes = data.pricing_modes || [];
        state.scopeSummary = data.scope_summary || null;
        state.packageConversionMap = new Map();
        syncProductMap(state);
        state.recipes = (data.recipes || []).map((recipe) => normalizeRecipeDraft(recipe, state));
        state.draft = normalizeRecipeDraft(state.draft, state);
        const invalidDraftProducts = clearInvalidIngredientBindings(state);
        state.isLoaded = true;
        renderScopeSummary(elements, state);
        renderRecipeCollections(elements, state);
        renderEditor(elements, state);
        applyDraftValidationFeedback(elements, invalidDraftProducts);
    }

    async function calculateRecipe(elements, state, { quiet = false } = {}) {
        if (!hasAnalysis(elements)) {
            renderPricingPanel(elements, state);
            return;
        }

        syncPricingInputsFromElements(elements, state);
        const payload = buildPayload(state, { elements });
        if (!payload) {
            state.calculation = null;
            renderCalculation(elements, null);
            if (!quiet) {
                setStatus(elements, "Add at least one complete ingredient row to calculate recipe cost.", "info", state);
            } else if (elements.recipeStatusMessage?.classList.contains("is-error")) {
                setStatus(elements, "", "", state);
            }
            renderPricingPanel(elements, state);
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
                setStatus(elements, "Recipe costs updated.", "info", state);
            } else if (elements.recipeStatusMessage?.classList.contains("is-error")) {
                setStatus(elements, "", "", state);
            }
          } catch (error) {
              state.calculation = null;
              renderCalculation(elements, null);
              setStatus(elements, error.message, "error", state);
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
        state.deleteTargetRecipeId = null;
        state.recipeLibraryOpen = true;
        renderRecipeCollections(elements, state);
        setStatus(elements, `Viewing archived recipe: ${recipe.name}`, "info", state);
    }

    function loadRecipeIntoBuilder(elements, state, recipeId) {
        const recipe = state.recipes.find((item) => item.recipe_id === recipeId);
        if (!recipe) {
            return;
        }
        state.activeRecipeId = recipeId;
        state.deleteConfirmVisible = false;
        state.deleteTargetRecipeId = null;
        state.openProductDropdownIndex = null;
        state.recipeLibraryOpen = false;
        state.draft = normalizeRecipeDraft(recipe, state);
        state.calculation = {
            pricing_mode: state.draft.pricing_mode,
            pricing_mode_label: (state.pricingModes.find((mode) => mode.value === state.draft.pricing_mode)?.label) || "Pricing mode",
            total_recipe_cost: Number(state.draft.total_recipe_cost || 0),
            cost_per_portion: Number(state.draft.cost_per_portion || 0),
            main_cost_driver: null,
            ingredient_breakdown: []
        };
        state.sellingPrice = state.draft.selling_price > 0 ? String(state.draft.selling_price) : "";
        state.pricingGoalType = getValidPricingGoalType(state.draft.pricing_goal_type || DEFAULT_PRICING_GOAL_TYPE);
        state.pricingGoalValue = state.draft.pricing_goal_value > 0 ? String(state.draft.pricing_goal_value) : "";
        state.targetFoodCostPct = state.pricingGoalValue;
        renderRecipeCollections(elements, state);
        renderEditor(elements, state);
        renderCalculation(elements, state.calculation);
        scheduleCalculation(elements, state);
        setStatus(elements, `Loaded "${recipe.name}" into Recipe Builder for editing.`, "success", state);
    }

    function resetDraftAfterDelete(elements, state) {
        state.activeRecipeId = null;
        state.deleteConfirmVisible = false;
        state.deleteTargetRecipeId = null;
        state.openProductDropdownIndex = null;
        state.draft = createEmptyRecipe();
        state.calculation = null;
        state.sellingPrice = "";
        state.pricingGoalType = DEFAULT_PRICING_GOAL_TYPE;
        state.pricingGoalValue = "";
        state.targetFoodCostPct = "";
        renderRecipeCollections(elements, state);
        renderEditor(elements, state);
        renderCalculation(elements, null);
    }

    async function saveRecipe(elements, state) {
        if (!hasAnalysis(elements)) {
            return;
        }

        let payload;
        try {
            syncPricingInputsFromElements(elements, state);
            payload = buildPayload(state, { requireComplete: true, elements });
        } catch (error) {
            setStatus(elements, error.message, "error", state);
            return;
        }

        if (!payload) {
            setStatus(elements, "Add ingredients before saving the recipe.", "error", state);
            return;
        }

        payload.name = String(state.draft.name || "").trim();
        payload.yield_portions = Number(state.draft.yield_portions || 0);

        try {
            const data = await fetchJson("/recipes/save", {
                method: "POST",
                body: JSON.stringify(payload)
            });
            state.recipes = (data.recipes || []).map((recipe) => normalizeRecipeDraft(recipe, state));
            state.activeRecipeId = data.recipe?.recipe_id || null;
            state.deleteConfirmVisible = false;
            state.deleteTargetRecipeId = null;
            state.openProductDropdownIndex = null;
            state.recipeLibraryOpen = false;
            state.draft = normalizeRecipeDraft(data.recipe || payload, state);
            state.calculation = {
                pricing_mode: state.draft.pricing_mode,
                pricing_mode_label: (state.pricingModes.find((mode) => mode.value === state.draft.pricing_mode)?.label) || "Pricing mode",
                total_recipe_cost: Number(state.draft.total_recipe_cost || 0),
                cost_per_portion: Number(state.draft.cost_per_portion || 0),
                main_cost_driver: null,
                ingredient_breakdown: []
            };
            state.sellingPrice = state.draft.selling_price > 0 ? String(state.draft.selling_price) : "";
            state.pricingGoalType = getValidPricingGoalType(state.draft.pricing_goal_type || DEFAULT_PRICING_GOAL_TYPE);
            state.pricingGoalValue = state.draft.pricing_goal_value > 0 ? String(state.draft.pricing_goal_value) : "";
            state.targetFoodCostPct = state.pricingGoalValue;
            renderRecipeCollections(elements, state);
            renderEditor(elements, state);
            renderCalculation(elements, state.calculation);
            scheduleCalculation(elements, state);
            setStatus(elements, data.message || "Recipe saved successfully.", "success", state);
        } catch (error) {
            setStatus(elements, error.message, "error", state);
        }
    }

    async function deleteRecipe(elements, state, recipeId = state.deleteTargetRecipeId || state.activeRecipeId) {
        if (!recipeId || state.isDeleting) {
            return;
        }

        state.deleteTargetRecipeId = recipeId;
        state.isDeleting = true;
        renderRecipeCollections(elements, state);

        try {
            const data = await fetchJson("/recipes/delete", {
                method: "POST",
                body: JSON.stringify({ recipe_id: recipeId })
            });
            state.recipes = data.recipes || [];
            if (state.activeRecipeId === recipeId) {
                resetDraftAfterDelete(elements, state);
            } else {
                state.deleteConfirmVisible = false;
                state.deleteTargetRecipeId = null;
                renderRecipeCollections(elements, state);
            }
            setStatus(elements, data.message || "Recipe deleted", "danger", state);
        } catch (error) {
            state.deleteConfirmVisible = true;
            setStatus(elements, error.message, "error", state);
        } finally {
            state.isDeleting = false;
            renderRecipeCollections(elements, state);
            renderEditor(elements, state);
        }
    }

    function bindEvents(elements, state) {
        if (elements.newRecipeButton && elements.newRecipeButton.dataset.bound !== "true") {
            elements.newRecipeButton.dataset.bound = "true";
            elements.newRecipeButton.addEventListener("click", () => {
                startNewRecipeDraft(elements, state);
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

        if (elements.recipeSellingPriceInput && elements.recipeSellingPriceInput.dataset.bound !== "true") {
            elements.recipeSellingPriceInput.dataset.bound = "true";
            elements.recipeSellingPriceInput.addEventListener("input", (event) => {
                state.sellingPrice = event.target.value;
                renderPricingPanel(elements, state);
            });
        }

        if (elements.recipePricingGoalTypeSelect && elements.recipePricingGoalTypeSelect.dataset.bound !== "true") {
            elements.recipePricingGoalTypeSelect.dataset.bound = "true";
            elements.recipePricingGoalTypeSelect.addEventListener("change", (event) => {
                state.pricingGoalType = getValidPricingGoalType(event.target.value);
                renderPricingPanel(elements, state);
            });
        }

        if (elements.recipeTargetFoodCostInput && elements.recipeTargetFoodCostInput.dataset.bound !== "true") {
            elements.recipeTargetFoodCostInput.dataset.bound = "true";
            elements.recipeTargetFoodCostInput.addEventListener("input", (event) => {
                state.pricingGoalValue = event.target.value;
                state.targetFoodCostPct = event.target.value;
                renderPricingPanel(elements, state);
            });
        }

        if (elements.recipeDataScopeSelect && elements.recipeDataScopeSelect.dataset.bound !== "true") {
            elements.recipeDataScopeSelect.dataset.bound = "true";
            elements.recipeDataScopeSelect.value = state.dataScope || "current_upload";
            elements.recipeDataScopeSelect.addEventListener("change", async (event) => {
                state.dataScope = event.target.value || "current_upload";
                writeSharedDataScope(state.dataScope);
                try {
                    await loadBootstrap(elements, state);
                    await calculateRecipe(elements, state, { quiet: true });
                    setStatus(elements);
                } catch (error) {
                    setStatus(elements, error.message, "error");
                }
            });
        }

        if (elements.addRecipeIngredientButton && elements.addRecipeIngredientButton.dataset.bound !== "true") {
            elements.addRecipeIngredientButton.dataset.bound = "true";
            elements.addRecipeIngredientButton.addEventListener("click", () => {
                state.draft.ingredients.push(createEmptyIngredient());
                state.openProductDropdownIndex = state.draft.ingredients.length - 1;
                renderIngredients(elements, state);
            });
        }

        if (elements.recipeIngredientsList && elements.recipeIngredientsList.dataset.bound !== "true") {
            elements.recipeIngredientsList.dataset.bound = "true";
            elements.recipeIngredientsList.addEventListener("click", (event) => {
                const clearProductButton = event.target.closest("[data-clear-product]");
                if (clearProductButton) {
                    const index = Number(clearProductButton.dataset.clearProduct);
                    if (Number.isNaN(index)) {
                        return;
                    }
                    clearIngredientProductSelection(state, index);
                    renderIngredients(elements, state);
                    scheduleCalculation(elements, state);
                    return;
                }

                const productOptionButton = event.target.closest("[data-select-product]");
                if (productOptionButton) {
                    const index = Number(productOptionButton.dataset.index);
                    const productName = productOptionButton.dataset.selectProduct || "";
                    if (Number.isNaN(index) || !state.draft.ingredients[index]) {
                        return;
                    }
                    state.draft.ingredients[index].product_name = productName;
                    state.draft.ingredients[index].purchase_unit = getSourcePurchaseUnitForProduct(state, productName)
                        || normalizeUnit(state.draft.ingredients[index].purchase_unit || "");
                    const rememberedConversion = getRememberedPackageConversion(
                        state,
                        productName,
                        state.draft.ingredients[index].purchase_unit
                    );
                    state.draft.ingredients[index].purchase_base_unit = resolvePurchaseBaseUnit(
                        state.draft.ingredients[index].purchase_unit,
                        state.draft.ingredients[index].unit,
                        rememberedConversion?.purchase_base_unit || state.draft.ingredients[index].purchase_base_unit
                    );
                    const nextUsageUnit = normalizeUnit(state.draft.ingredients[index].unit);
                    const compatibleUsageType = getUnitType(nextUsageUnit) === getUnitType(state.draft.ingredients[index].purchase_base_unit);
                    state.draft.ingredients[index].unit = nextUsageUnit && compatibleUsageType
                        ? nextUsageUnit
                        : normalizeUnit(state.draft.ingredients[index].purchase_base_unit || state.draft.ingredients[index].purchase_unit || "");
                    state.draft.ingredients[index].purchase_size = inferPurchaseSize(
                        state.draft.ingredients[index].purchase_unit,
                        state.draft.ingredients[index].purchase_base_unit || state.draft.ingredients[index].unit
                    );
                    if (rememberedConversion?.purchase_size > 0) {
                        state.draft.ingredients[index].purchase_size = rememberedConversion.purchase_size;
                    }
                    rememberPackageConversion(
                        state,
                        state.draft.ingredients[index].product_name,
                        state.draft.ingredients[index].purchase_unit,
                        state.draft.ingredients[index].purchase_size,
                        state.draft.ingredients[index].purchase_base_unit
                    );
                    state.openProductDropdownIndex = null;
                    renderIngredients(elements, state);
                    scheduleCalculation(elements, state);
                    return;
                }

                const removeButton = event.target.closest("[data-remove-ingredient]");
                if (!removeButton) {
                    return;
                }
                const index = Number(removeButton.dataset.removeIngredient);
                state.draft.ingredients.splice(index, 1);
                if (!state.draft.ingredients.length) {
                    state.draft.ingredients.push(createEmptyIngredient());
                }
                state.openProductDropdownIndex = null;
                renderIngredients(elements, state);
                scheduleCalculation(elements, state);
            });

            elements.recipeIngredientsList.addEventListener("input", (event) => {
                const field = event.target.dataset.field;
                const index = Number(event.target.dataset.index);
                if (!field || Number.isNaN(index) || !state.draft.ingredients[index]) {
                    return;
                }
                state.draft.ingredients[index][field] = field === "purchase_size"
                    ? Number(event.target.value || 0)
                    : event.target.value;
                if (field === "product_name") {
                    state.openProductDropdownIndex = index;
                    renderIngredients(elements, state);
                    const activeInput = elements.recipeIngredientsList.querySelector(`.recipe-product-search-input[data-index="${index}"]`);
                    if (activeInput) {
                        const cursorAt = String(state.draft.ingredients[index].product_name || "").length;
                        activeInput.focus();
                        activeInput.setSelectionRange(cursorAt, cursorAt);
                    }
                    return;
                }
                if (field === "purchase_size") {
                    rememberPackageConversion(
                        state,
                        state.draft.ingredients[index].product_name,
                        state.draft.ingredients[index].purchase_unit,
                        state.draft.ingredients[index].purchase_size,
                        state.draft.ingredients[index].purchase_base_unit
                    );
                }
                scheduleCalculation(elements, state);
            });

            elements.recipeIngredientsList.addEventListener("focusin", (event) => {
                const productInput = event.target.closest('.recipe-product-search-input[data-field="product_name"]');
                if (!productInput) {
                    return;
                }
                const index = Number(productInput.dataset.index);
                if (Number.isNaN(index)) {
                    return;
                }
                if (state.openProductDropdownIndex === index && productInput.getAttribute("aria-expanded") === "true") {
                    return;
                }
                state.openProductDropdownIndex = index;
                renderIngredients(elements, state);
                const activeInput = elements.recipeIngredientsList.querySelector(`.recipe-product-search-input[data-index="${index}"]`);
                if (activeInput) {
                    const cursorAt = String(state.draft.ingredients[index]?.product_name || "").length;
                    activeInput.focus();
                    activeInput.setSelectionRange(cursorAt, cursorAt);
                }
            });

            elements.recipeIngredientsList.addEventListener("change", (event) => {
                const field = event.target.dataset.field;
                const index = Number(event.target.dataset.index);
                if (!field || Number.isNaN(index) || !state.draft.ingredients[index]) {
                    return;
                }
                state.draft.ingredients[index][field] = field === "purchase_size"
                    ? Number(event.target.value || 0)
                    : event.target.value;
                if (field === "product_name") {
                    const units = getUnitsForProduct(state, event.target.value);
                    if (!units.length) {
                        state.draft.ingredients[index].purchase_unit = "";
                        state.draft.ingredients[index].unit = "";
                        state.draft.ingredients[index].purchase_size = 1;
                        state.draft.ingredients[index].purchase_base_unit = "";
                        state.openProductDropdownIndex = index;
                        renderIngredients(elements, state);
                        return;
                    }
                    const currentUnit = normalizeUnit(state.draft.ingredients[index].unit);
                    const rememberedConversion = getRememberedPackageConversion(
                        state,
                        event.target.value,
                        state.draft.ingredients[index].purchase_unit
                    );
                    state.draft.ingredients[index].purchase_unit = getSourcePurchaseUnitForProduct(state, event.target.value)
                        || normalizeUnit(state.draft.ingredients[index].purchase_unit || "");
                    state.draft.ingredients[index].purchase_base_unit = resolvePurchaseBaseUnit(
                        state.draft.ingredients[index].purchase_unit,
                        currentUnit,
                        rememberedConversion?.purchase_base_unit || state.draft.ingredients[index].purchase_base_unit
                    );
                    const compatibleUsageType = getUnitType(currentUnit) === getUnitType(state.draft.ingredients[index].purchase_base_unit);
                    state.draft.ingredients[index].unit = currentUnit && compatibleUsageType
                        ? currentUnit
                        : normalizeUnit(state.draft.ingredients[index].purchase_base_unit || state.draft.ingredients[index].purchase_unit || "");
                    if (
                        state.draft.ingredients[index].purchase_unit
                        && state.draft.ingredients[index].unit
                        && state.draft.ingredients[index].purchase_unit !== state.draft.ingredients[index].unit
                    ) {
                        state.draft.ingredients[index].purchase_base_unit = state.draft.ingredients[index].unit;
                    }
                    state.draft.ingredients[index].purchase_size = inferPurchaseSize(
                        state.draft.ingredients[index].purchase_unit,
                        state.draft.ingredients[index].purchase_base_unit || state.draft.ingredients[index].unit
                    );
                    if (rememberedConversion?.purchase_size > 0) {
                        state.draft.ingredients[index].purchase_size = rememberedConversion.purchase_size;
                    }
                    rememberPackageConversion(
                        state,
                        state.draft.ingredients[index].product_name,
                        state.draft.ingredients[index].purchase_unit,
                        state.draft.ingredients[index].purchase_size,
                        state.draft.ingredients[index].purchase_base_unit
                    );
                    state.openProductDropdownIndex = null;
                    renderIngredients(elements, state);
                }
                if (field === "unit" || field === "purchase_base_unit") {
                    state.draft.ingredients[index].unit = normalizeUnit(state.draft.ingredients[index].unit);
                    state.draft.ingredients[index].purchase_unit = getSourcePurchaseUnitForProduct(
                        state,
                        state.draft.ingredients[index].product_name
                    ) || normalizeUnit(state.draft.ingredients[index].purchase_unit);
                    state.draft.ingredients[index].purchase_base_unit = state.draft.ingredients[index].purchase_unit !== state.draft.ingredients[index].unit
                        ? state.draft.ingredients[index].unit
                        : resolvePurchaseBaseUnit(
                            state.draft.ingredients[index].purchase_unit,
                            state.draft.ingredients[index].unit,
                            state.draft.ingredients[index].purchase_base_unit
                        );
                    state.draft.ingredients[index].purchase_size = state.draft.ingredients[index].purchase_unit === state.draft.ingredients[index].unit
                        ? 1
                        : inferPurchaseSize(
                            state.draft.ingredients[index].purchase_unit,
                            state.draft.ingredients[index].purchase_base_unit || state.draft.ingredients[index].unit
                        );
                    rememberPackageConversion(
                        state,
                        state.draft.ingredients[index].product_name,
                        state.draft.ingredients[index].purchase_unit,
                        state.draft.ingredients[index].purchase_size,
                        state.draft.ingredients[index].purchase_base_unit
                    );
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

        if (elements.recipesList && elements.recipesList.dataset.bound !== "true") {
            elements.recipesList.dataset.bound = "true";
            elements.recipesList.addEventListener("click", (event) => {
                const deleteButton = event.target.closest("[data-delete-recipe]");
                if (deleteButton) {
                    state.deleteConfirmVisible = true;
                    state.deleteTargetRecipeId = deleteButton.dataset.deleteRecipe || null;
                    renderRecipeCollections(elements, state);
                    setStatus(elements, "", "", state);
                    return;
                }

                if (event.target.closest("[data-cancel-recipe-delete]")) {
                    state.deleteConfirmVisible = false;
                    state.deleteTargetRecipeId = null;
                    renderRecipeCollections(elements, state);
                    return;
                }

                const confirmDeleteButton = event.target.closest("[data-confirm-recipe-delete]");
                if (confirmDeleteButton) {
                    deleteRecipe(elements, state, confirmDeleteButton.dataset.confirmRecipeDelete || "");
                    return;
                }

                const button = event.target.closest("[data-open-recipe]");
                if (!button) {
                    return;
                }
                openRecipe(elements, state, button.dataset.openRecipe || "");
            });
        }

        const openLibrary = () => {
            state.recipeLibraryOpen = true;
            setStatus(elements, "", "", state);
            renderRecipeLibrary(elements, state);
            window.setTimeout(() => {
                elements.recipeLibrarySearchInput?.focus();
            }, 0);
        };

        const closeLibrary = () => {
            state.recipeLibraryOpen = false;
            state.deleteConfirmVisible = false;
            state.deleteTargetRecipeId = null;
            setStatus(elements, "", "", state);
            renderRecipeLibrary(elements, state);
        };

        if (elements.openRecipeLibraryInlineButton && elements.openRecipeLibraryInlineButton.dataset.bound !== "true") {
            elements.openRecipeLibraryInlineButton.dataset.bound = "true";
            elements.openRecipeLibraryInlineButton.addEventListener("click", openLibrary);
        }

        if (elements.createRecipeFromLibraryButton && elements.createRecipeFromLibraryButton.dataset.bound !== "true") {
            elements.createRecipeFromLibraryButton.dataset.bound = "true";
            elements.createRecipeFromLibraryButton.addEventListener("click", () => {
                closeLibrary();
                startNewRecipeDraft(elements, state, "Started a new recipe from Recipe Library.");
            });
        }

        if (elements.closeRecipeLibraryButton && elements.closeRecipeLibraryButton.dataset.bound !== "true") {
            elements.closeRecipeLibraryButton.dataset.bound = "true";
            elements.closeRecipeLibraryButton.addEventListener("click", closeLibrary);
        }

        if (elements.recipeLibraryOverlay && elements.recipeLibraryOverlay.dataset.bound !== "true") {
            elements.recipeLibraryOverlay.dataset.bound = "true";
            elements.recipeLibraryOverlay.addEventListener("click", (event) => {
                if (event.target === elements.recipeLibraryOverlay) {
                    closeLibrary();
                }
            });
        }

        if (elements.recipeLibrarySearchInput && elements.recipeLibrarySearchInput.dataset.bound !== "true") {
            elements.recipeLibrarySearchInput.dataset.bound = "true";
            elements.recipeLibrarySearchInput.addEventListener("input", (event) => {
                state.recipeLibrarySearch = event.target.value;
                renderRecipeLibrary(elements, state);
            });
        }

        if (elements.recipeLibrarySortSelect && elements.recipeLibrarySortSelect.dataset.bound !== "true") {
            elements.recipeLibrarySortSelect.dataset.bound = "true";
            elements.recipeLibrarySortSelect.addEventListener("change", (event) => {
                state.recipeLibrarySort = event.target.value;
                renderRecipeLibrary(elements, state);
            });
        }

        if (elements.recipeLibraryList && elements.recipeLibraryList.dataset.bound !== "true") {
            elements.recipeLibraryList.dataset.bound = "true";
            elements.recipeLibraryList.addEventListener("click", (event) => {
                if (event.target.closest("#recipeLibraryEmptyCreateButton")) {
                    closeLibrary();
                    startNewRecipeDraft(elements, state, "Started a new recipe from Recipe Library.");
                    return;
                }

                const deleteButton = event.target.closest("[data-delete-recipe]");
                if (deleteButton) {
                    state.deleteConfirmVisible = true;
                    state.deleteTargetRecipeId = deleteButton.dataset.deleteRecipe || null;
                    renderRecipeCollections(elements, state);
                    return;
                }

                if (event.target.closest("[data-cancel-recipe-delete]")) {
                    state.deleteConfirmVisible = false;
                    state.deleteTargetRecipeId = null;
                    renderRecipeCollections(elements, state);
                    return;
                }

                const confirmDeleteButton = event.target.closest("[data-confirm-recipe-delete]");
                if (confirmDeleteButton) {
                    deleteRecipe(elements, state, confirmDeleteButton.dataset.confirmRecipeDelete || "");
                    return;
                }

                const loadButton = event.target.closest("[data-load-recipe-builder]");
                if (loadButton) {
                    loadRecipeIntoBuilder(elements, state, loadButton.dataset.loadRecipeBuilder || "");
                    return;
                }

                const openButton = event.target.closest("[data-open-library-recipe]");
                if (!openButton) {
                    return;
                }
                openRecipe(elements, state, openButton.dataset.openLibraryRecipe || "");
            });

            elements.recipeLibraryList.addEventListener("keydown", (event) => {
                if (event.key !== "Enter" && event.key !== " ") {
                    return;
                }
                const openTarget = event.target.closest("[data-open-library-recipe]");
                if (!openTarget || event.target.closest("[data-delete-recipe]")) {
                    return;
                }
                event.preventDefault();
                openRecipe(elements, state, openTarget.dataset.openLibraryRecipe || "");
            });
        }

        if (elements.recipeLibraryDetail && elements.recipeLibraryDetail.dataset.bound !== "true") {
            elements.recipeLibraryDetail.dataset.bound = "true";
            elements.recipeLibraryDetail.addEventListener("click", (event) => {
                const loadButton = event.target.closest("[data-load-recipe-builder]");
                if (!loadButton) {
                    return;
                }
                loadRecipeIntoBuilder(elements, state, loadButton.dataset.loadRecipeBuilder || "");
            });

            elements.recipeLibraryDetail.addEventListener("keydown", (event) => {
                if (event.key !== "Enter" && event.key !== " ") {
                    return;
                }
                const loadButton = event.target.closest("[data-load-recipe-builder]");
                if (!loadButton) {
                    return;
                }
                event.preventDefault();
                loadRecipeIntoBuilder(elements, state, loadButton.dataset.loadRecipeBuilder || "");
            });
        }

        if (document.body.dataset.recipeDropdownBound !== "true") {
            document.body.dataset.recipeDropdownBound = "true";
            document.addEventListener("click", (event) => {
                if (event.target.closest(".recipe-product-picker-wrap")) {
                    return;
                }
                if (state.openProductDropdownIndex === null) {
                    return;
                }
                state.openProductDropdownIndex = null;
                renderIngredients(elements, state);
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
        renderScopeSummary(elements, state);
        renderRecipeCollections(elements, state);
        renderEditor(elements, state);
        renderCalculation(elements, null);
        bindEvents(elements, state);

        const refreshBootstrap = async () => {
            if (!hasAnalysis(elements)) {
                try {
                    const data = await fetchJson("/recipes/bootstrap");
                    state.products = [];
                    syncProductMap(state);
                    state.packageConversionMap = new Map();
                    state.pricingModes = data.pricing_modes || [];
                    state.recipes = (data.recipes || []).map((recipe) => normalizeRecipeDraft(recipe, state));
                    state.activeRecipeId = null;
                    state.deleteConfirmVisible = false;
                    state.deleteTargetRecipeId = null;
                    state.isDeleting = false;
                    state.recipeLibraryOpen = false;
                    state.openProductDropdownIndex = null;
                    state.draft = createEmptyRecipe();
                    state.calculation = null;
                    state.scopeSummary = data.scope_summary || null;
                    renderScopeSummary(elements, state);
                    renderRecipeCollections(elements, state);
                    renderEditor(elements, state);
                    renderCalculation(elements, null);
                    setStatus(elements);
                } catch (error) {
                    setStatus(elements, error.message, "error");
                }
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
        window.PriceAnalyzerRecipes = {
            reloadSavedRecipes: refreshBootstrap
        };

        window.addEventListener("storage", async (event) => {
            if (event.key !== SHARED_DATA_SCOPE_KEY) {
                return;
            }
            const nextScope = readSharedDataScope();
            if (nextScope === state.dataScope) {
                return;
            }
            state.dataScope = nextScope;
            try {
                await loadBootstrap(elements, state);
                await calculateRecipe(elements, state, { quiet: true });
            } catch (error) {
                setStatus(elements, error.message, "error");
            }
        });

        window.addEventListener("shared-analysis-context-updated", async () => {
            state.dataScope = readSharedDataScope();
            try {
                await loadBootstrap(elements, state);
                await calculateRecipe(elements, state, { quiet: true });
            } catch (error) {
                setStatus(elements, error.message, "error");
            }
        });

        window.addEventListener("workspace-reset-completed", async () => {
            await refreshBootstrap();
        });

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
