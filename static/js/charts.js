(function () {
    const centerLabelPlugin = {
        id: "centerLabelPlugin",
        afterDatasetsDraw(chart, args, pluginOptions) {
            if (chart.config.type !== "doughnut" || !pluginOptions?.enabled) {
                return;
            }

            const meta = chart.getDatasetMeta(0);
            const arc = meta?.data?.[0];
            if (!arc) {
                return;
            }

            const { ctx } = chart;
            const x = arc.x;
            const y = arc.y;
            const totalLabel = pluginOptions.totalLabel || "Visible Rows";
            const totalValue = pluginOptions.totalValue || "0";
            const detail = pluginOptions.detail || "";
            const color = pluginOptions.color || "#0f172a";
            const muted = pluginOptions.muted || "#64748b";

            ctx.save();
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            ctx.fillStyle = muted;
            ctx.font = "700 11px 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
            ctx.fillText(totalLabel, x, y - 20);

            ctx.fillStyle = color;
            ctx.font = "800 26px 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
            ctx.fillText(totalValue, x, y + 4);

            if (detail) {
                ctx.fillStyle = muted;
                ctx.font = "600 11px 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
                ctx.fillText(detail, x, y + 26);
            }

            ctx.restore();
        }
    };

    function getThemeTokens() {
        const styles = getComputedStyle(document.documentElement);

        return {
            surface: styles.getPropertyValue("--surface-elevated").trim() || styles.getPropertyValue("--surface-strong").trim(),
            chartGrid: styles.getPropertyValue("--chart-grid").trim(),
            chartTick: styles.getPropertyValue("--chart-tick").trim(),
            chartLegend: styles.getPropertyValue("--chart-legend").trim(),
            textStrong: styles.getPropertyValue("--text-strong").trim(),
            muted: styles.getPropertyValue("--muted").trim(),
            topOverpay: [
                styles.getPropertyValue("--chart-top-1").trim(),
                styles.getPropertyValue("--chart-top-2").trim(),
                styles.getPropertyValue("--chart-top-3").trim(),
                styles.getPropertyValue("--chart-top-4").trim(),
                styles.getPropertyValue("--chart-top-5").trim()
            ],
            savings: [
                styles.getPropertyValue("--chart-save-1").trim(),
                styles.getPropertyValue("--chart-save-2").trim(),
                styles.getPropertyValue("--chart-save-3").trim(),
                styles.getPropertyValue("--chart-save-4").trim(),
                styles.getPropertyValue("--chart-save-5").trim()
            ],
            status: [
                styles.getPropertyValue("--chart-status-1").trim(),
                styles.getPropertyValue("--chart-status-2").trim(),
                styles.getPropertyValue("--chart-status-3").trim()
            ]
        };
    }

    function currency(value) {
        const numericValue = Number(value || 0);
        return Number.isFinite(numericValue)
            ? numericValue.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            })
            : "0.00";
    }

    function buildTooltip(themeTokens, valueFormatter) {
        return {
            enabled: true,
            backgroundColor: themeTokens.surface,
            titleColor: themeTokens.textStrong,
            bodyColor: themeTokens.textStrong,
            borderColor: themeTokens.chartGrid,
            borderWidth: 1,
            padding: 12,
            displayColors: false,
            titleFont: {
                size: 12,
                weight: "700"
            },
            bodyFont: {
                size: 12,
                weight: "700"
            },
            callbacks: {
                label(context) {
                    return valueFormatter(context.raw);
                }
            }
        };
    }

    function buildBarChartConfig(labels, values, colors, datasetLabel, themeTokens) {
        const strongestIndex = values.indexOf(Math.max(...values, 0));
        const backgroundColor = colors.map((color, index) => index === strongestIndex ? color : `${color}cc`);

        return {
            type: "bar",
            data: {
                labels,
                datasets: [{
                    label: datasetLabel,
                    data: values,
                    backgroundColor,
                    borderRadius: 14,
                    borderSkipped: false,
                    maxBarThickness: 34,
                    categoryPercentage: 0.62,
                    barPercentage: 0.82
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 220,
                    easing: "easeOutCubic"
                },
                plugins: {
                    legend: { display: false },
                    tooltip: buildTooltip(themeTokens, (value) => `${datasetLabel}: ${currency(value)}`)
                },
                layout: {
                    padding: {
                        top: 8,
                        right: 10,
                        bottom: 0,
                        left: 2
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false,
                            drawBorder: false
                        },
                        border: {
                            display: false
                        },
                        ticks: {
                            color: themeTokens.chartTick,
                            font: {
                                size: 11,
                                weight: "700"
                            },
                            padding: 8
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: themeTokens.chartGrid,
                            drawBorder: false
                        },
                        border: {
                            display: false
                        },
                        ticks: {
                            color: themeTokens.chartTick,
                            font: {
                                size: 11,
                                weight: "600"
                            },
                            padding: 10,
                            callback(value) {
                                return currency(value);
                            }
                        }
                    }
                }
            }
        };
    }

    function buildDoughnutChartConfig(labels, values, colors, themeTokens) {
        const total = values.reduce((sum, value) => sum + value, 0);
        const dominantIndex = values.indexOf(Math.max(...values, 0));
        const dominantLabel = dominantIndex >= 0 ? labels[dominantIndex] : "No data";
        const dominantValue = dominantIndex >= 0 ? values[dominantIndex] : 0;
        const dominantShare = total ? `${Math.round((dominantValue / total) * 100)}% largest slice` : "No visible rows";

        return {
            type: "doughnut",
            data: {
                labels,
                datasets: [{
                    label: "Status Count",
                    data: values,
                    backgroundColor: colors,
                    borderWidth: 0,
                    hoverOffset: 4,
                    spacing: 3
                }]
            },
            plugins: [centerLabelPlugin],
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 220,
                    easing: "easeOutCubic"
                },
                cutout: "76%",
                radius: "88%",
                layout: {
                    padding: {
                        top: 8,
                        right: 8,
                        bottom: 4,
                        left: 8
                    }
                },
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: {
                            color: themeTokens.chartLegend,
                            usePointStyle: true,
                            pointStyle: "circle",
                            boxWidth: 10,
                            boxHeight: 10,
                            padding: 18,
                            font: {
                                size: 12,
                                weight: "700"
                            }
                        }
                    },
                    tooltip: buildTooltip(themeTokens, (value) => `${value} rows`),
                    centerLabelPlugin: {
                        enabled: true,
                        totalLabel: "Visible Rows",
                        totalValue: String(total),
                        detail: dominantShare,
                        color: themeTokens.textStrong,
                        muted: themeTokens.muted
                    }
                }
            }
        };
    }

    function destroyCharts(charts) {
        ["topOverpay", "savings", "status"].forEach((chartKey) => {
            if (charts[chartKey]) {
                charts[chartKey].destroy();
            }
        });
    }

    function renderCharts(state, elements, aggregateDashboardData, metricsOverride) {
        const themeTokens = getThemeTokens();
        const metrics = metricsOverride || aggregateDashboardData(state.visibleRows);

        destroyCharts(state.charts);

        state.charts.topOverpay = new Chart(
            elements.topOverpayChart,
            buildBarChartConfig(
                metrics.topOverpayLabels,
                metrics.topOverpayValues,
                themeTokens.topOverpay,
                "Savings Opportunity",
                themeTokens
            )
        );

        state.charts.savings = new Chart(
            elements.savingsChart,
            buildBarChartConfig(
                metrics.savingsLabels,
                metrics.savingsValues,
                themeTokens.savings,
                "Savings Opportunity",
                themeTokens
            )
        );

        state.charts.status = new Chart(
            elements.statusChart,
            buildDoughnutChartConfig(
                metrics.statusLabels,
                metrics.statusValues,
                themeTokens.status,
                themeTokens
            )
        );
    }

    window.PriceAnalyzerCharts = {
        renderCharts
    };
})();
