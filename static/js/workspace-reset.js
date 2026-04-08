(function () {
    const QUOTE_COMPARE_ACTIVE_SESSION_KEY = "quote_compare_active_session_v1";
    const QUOTE_COMPARE_STATE_KEY = "quote_compare_state_v1";
    const QUOTE_COMPARE_SCROLL_KEY = "quote_compare_scroll_v1";
    const QUOTE_COMPARE_LAST_SCREEN_KEY = "quote_compare_last_screen_v1";
    const RECIPES_BOOTSTRAP_CACHE_KEY = "recipes_bootstrap_cache_v1";
    const RECIPES_BOOTSTRAP_CACHE_KEY_V2 = "recipes_bootstrap_cache_v2";
    const NOTES_ITEMS_KEY = "workspaceNotesItemsV2";
    const SHARED_ANALYSIS_SCOPE_KEY = "shared_analysis_scope_v1";
    const DEMO_SESSION_ID_KEY = "demo_session_id";

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
            const rawValue = String(window.sessionStorage.getItem(SHARED_ANALYSIS_SCOPE_KEY) || "").trim();
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

    function clearFrontendResetState() {
        try {
            sessionStorage.removeItem(QUOTE_COMPARE_ACTIVE_SESSION_KEY);
            sessionStorage.removeItem(QUOTE_COMPARE_STATE_KEY);
            sessionStorage.removeItem(QUOTE_COMPARE_SCROLL_KEY);
            sessionStorage.removeItem(QUOTE_COMPARE_LAST_SCREEN_KEY);
            sessionStorage.removeItem(`${RECIPES_BOOTSTRAP_CACHE_KEY}:${getAuthUserStorageSuffix()}`);
            const sharedScope = readSharedDataScope();
            const scopedRecipeBootstrapKey = `${RECIPES_BOOTSTRAP_CACHE_KEY_V2}:${getAuthUserStorageSuffix()}:${sharedScope.scope}:${sharedScope.session_id || "default"}`;
            sessionStorage.removeItem(scopedRecipeBootstrapKey);
            if (window.__analysisScopeBootstrapCache && typeof window.__analysisScopeBootstrapCache === "object") {
                window.__analysisScopeBootstrapCache = {};
            }
            if (sharedScope.scope === "demo" && sharedScope.session_id) {
                window.localStorage.removeItem(`${NOTES_ITEMS_KEY}:demo:${sharedScope.session_id}`);
            }
        } catch (error) {
            // Ignore storage failures.
        }
        console.info("[PERF] reset.frontend_state_cleared", {
            user: getAuthUserStorageSuffix()
        });
    }

    function isDemoMode() {
        return document.body?.dataset?.demoMode === "true";
    }

    async function reloadSavedRecipesUi() {
        if (window.PriceAnalyzerRecipes?.reloadSavedRecipes) {
            await window.PriceAnalyzerRecipes.reloadSavedRecipes();
            return;
        }

        const response = await fetch("/recipes/bootstrap", {
            headers: {
                Accept: "application/json"
            }
        });

        try {
            await response.json();
        } catch (error) {
            console.error("[workspace reset] recipes bootstrap rehydrate failed", error);
        }
    }

    function applyResetUiState() {
        if (isDemoMode()) {
            clearFrontendResetState();
            window.PriceAnalyzerBootGuard?.resetAllUiState?.();
            window.location.assign("/?demo-entry=1");
            return true;
        }
        const scopeSummaryText = "No analyzed file yet";
        document.getElementById("mainDashboardView")?.setAttribute("data-has-analysis", "false");
        document.getElementById("recipesWorkspaceState")?.setAttribute("data-has-analysis", "false");
        const quoteSummary = document.getElementById("quoteDataScopeSummary");
        if (quoteSummary) {
            quoteSummary.textContent = scopeSummaryText;
        }
        const recipeSummary = document.getElementById("recipeDataScopeSummary");
        if (recipeSummary) {
            recipeSummary.textContent = scopeSummaryText;
        }
        const continueAnalysisButton = document.getElementById("quoteContinueAnalysisButton");
        if (continueAnalysisButton) {
            continueAnalysisButton.hidden = true;
        }
        clearFrontendResetState();
        window.PriceAnalyzerBootGuard?.resetAllUiState?.();
        window.dispatchEvent(new CustomEvent("shared-analysis-context-updated", {
            detail: {
                scope: "current_upload",
                uploadId: ""
            }
        }));
        window.dispatchEvent(new CustomEvent("workspace-reset-completed"));
        window.resetQuoteCompareToStep1?.();
        return false;
    }

    async function resetWorkspaceData() {
        const sharedScope = readSharedDataScope();
        const query = sharedScope.scope === "demo" && sharedScope.session_id
            ? `?demo_session_id=${encodeURIComponent(sharedScope.session_id)}`
            : "";
        const response = await fetch(`/workspace/reset${query}`, {
            method: "POST",
            headers: {
                Accept: "application/json"
            }
        });
        const responseClone = response.clone();
        let data = null;
        try {
            data = await response.json();
        } catch (error) {
            const rawResponse = await responseClone.text().catch(() => "");
            console.error("[workspace reset] non-JSON response", {
                status: response.status,
                body: rawResponse
            });
            throw new Error("Workspace reset failed.");
        }
        if (!response.ok || data.success !== true) {
            throw new Error(data.message || "Workspace reset failed.");
        }
        return data;
    }

    function initWorkspaceReset() {
        const triggerButtons = Array.from(document.querySelectorAll("[data-reset-workspace]"));
        const overlay = document.getElementById("workspaceResetOverlay");
        const cancelButton = document.getElementById("workspaceResetCancelButton");
        const confirmButton = document.getElementById("workspaceResetConfirmButton");

        if (!triggerButtons.length || !overlay || !cancelButton || !confirmButton) {
            return;
        }

        let isSubmitting = false;

        function closeModal() {
            if (isSubmitting) {
                return;
            }
            overlay.hidden = true;
            document.body.classList.remove("is-workspace-reset-open");
        }

        function openModal() {
            overlay.hidden = false;
            document.body.classList.add("is-workspace-reset-open");
            window.requestAnimationFrame(() => {
                cancelButton.focus();
            });
        }

        triggerButtons.forEach((button) => {
            if (button.dataset.bound === "true") {
                return;
            }
            button.dataset.bound = "true";
            button.addEventListener("click", openModal);
        });

        cancelButton.addEventListener("click", closeModal);

        overlay.addEventListener("click", (event) => {
            if (event.target === overlay) {
                closeModal();
            }
        });

        window.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && !overlay.hidden) {
                closeModal();
            }
        });

        confirmButton.addEventListener("click", async () => {
            if (isSubmitting) {
                return;
            }
            isSubmitting = true;
            confirmButton.disabled = true;
            confirmButton.textContent = "Resetting...";
            try {
                await resetWorkspaceData();
                const redirectedToDemoEntry = applyResetUiState();
                if (redirectedToDemoEntry) {
                    return;
                }
                if (document.body?.dataset.activeView === "recipes") {
                    window.location.assign("/");
                    return;
                }
                await reloadSavedRecipesUi();
                confirmButton.disabled = false;
                confirmButton.textContent = "Reset Data";
                isSubmitting = false;
                closeModal();
            } catch (error) {
                confirmButton.disabled = false;
                confirmButton.textContent = "Reset Data";
                isSubmitting = false;
                window.alert(error.message || "Workspace reset failed.");
            }
        });
    }

    document.addEventListener("DOMContentLoaded", initWorkspaceReset);
})();
