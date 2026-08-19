InventoryApp.renderResults = function (items) {
    const results =
        document.getElementById("results");

    const notFoundArea =
        document.getElementById("notFoundArea");

    const searchInput =
        document.getElementById("searchInput");

    if (!results || !notFoundArea) {
        return;
    }

    const query =
        searchInput?.value.trim() || "";

    results.innerHTML = "";

    InventoryApp.currentResultItems = items;
    InventoryApp.highlightedResultIndex = -1;

    if (!items.length) {
        if (query.length > 0) {
            notFoundArea.classList.remove(
                "hidden"
            );
        } else {
            notFoundArea.classList.add(
                "hidden"
            );
        }

        return;
    }

    notFoundArea.classList.add("hidden");

    items.forEach((item, index) => {
        const resultItem =
            document.createElement("div");

        resultItem.className =
            "result-item";

        resultItem.dataset.index =
            String(index);

        resultItem.tabIndex = 0;

        resultItem.onclick = () => {
            InventoryApp.selectItem(item);
        };

        resultItem.onkeydown = event => {
            if (event.key === "Enter") {
                event.preventDefault();

                InventoryApp.selectItem(item);
            }
        };

        const countedTotal =
            item.counted ?? "";

        resultItem.innerHTML = `
            <div class="result-main">
                ${InventoryApp.escapeHtml(
                    item.item_number
                )}
            </div>

            <div class="result-sub">
                ${InventoryApp.escapeHtml(
                    item.product_name || ""
                )}
            </div>

            <div class="result-sub">
                Current counted total:
                ${InventoryApp.escapeHtml(
                    countedTotal
                )}
            </div>
        `;

        results.appendChild(resultItem);
    });
};


InventoryApp.updateHighlightedResult =
function () {
    const resultElements =
        document.querySelectorAll(
            ".result-item"
        );

    resultElements.forEach(
        (element, index) => {
            const isHighlighted =
                index ===
                InventoryApp
                    .highlightedResultIndex;

            element.classList.toggle(
                "highlighted",
                isHighlighted
            );

            if (isHighlighted) {
                element.scrollIntoView({
                    block: "nearest",
                });
            }
        }
    );
};


InventoryApp.searchItems =
async function (query) {
    try {
        const response = await fetch(
            `/api/items?q=${
                encodeURIComponent(query)
            }`
        );

        const data =
            await response.json();

        if (!response.ok) {
            console.error(data);

            InventoryApp.renderResults([]);

            return;
        }

        InventoryApp.renderResults(
            data.items || []
        );

    } catch (error) {
        console.error(error);

        InventoryApp.renderResults([]);
    }
};


InventoryApp.renderZeroCountItems =
function (items) {
    const results =
        document.getElementById(
            "zeroCountResults"
        );

    const status =
        document.getElementById(
            "zeroCountStatus"
        );

    if (!results || !status) {
        return;
    }

    results.innerHTML = "";

    if (!items.length) {
        status.textContent =
            "No zero-count items were found.";

        return;
    }

    status.textContent =
        `${items.length} zero-count item${
            items.length === 1 ? "" : "s"
        }`;

    items.forEach(item => {
        const row =
            document.createElement("button");

        row.type = "button";

        row.className =
            "zero-count-row";

        row.onclick = () => {
            InventoryApp.hideZeroCountItems();

            InventoryApp.selectItem(item);
        };

        const itemNumber =
            InventoryApp.escapeHtml(
                item.item_number || ""
            );

        const productName =
            InventoryApp.escapeHtml(
                item.product_name || ""
            );

        row.innerHTML = `
            <span class="zero-count-number">
                ${itemNumber}
            </span>

            <span class="zero-count-description">
                ${productName}
            </span>

            <span class="zero-count-total">
                Count: 0
            </span>
        `;

        results.appendChild(row);
    });
};


InventoryApp.loadZeroCountItems =
async function () {
    const status =
        document.getElementById(
            "zeroCountStatus"
        );

    const results =
        document.getElementById(
            "zeroCountResults"
        );

    if (!status || !results) {
        return;
    }

    status.textContent =
        "Loading zero-count items...";

    results.innerHTML = "";

    try {
        const response = await fetch(
            "/api/items/zero-count"
        );

        const data =
            await response.json();

        if (!response.ok) {
            throw new Error(
                data.message ||
                "Could not load zero-count items."
            );
        }

        InventoryApp.renderZeroCountItems(
            data.items || []
        );

    } catch (error) {
        console.error(error);

        status.textContent =
            error.message ||
            "Could not load zero-count items.";
    }
};


InventoryApp.showZeroCountItems =
function () {
    const normalSearchArea =
        document.getElementById(
            "normalSearchArea"
        );

    const zeroCountArea =
        document.getElementById(
            "zeroCountArea"
        );

    const title =
        document.getElementById(
            "searchSectionTitle"
        );

    const button =
        document.getElementById(
            "zeroCountToggleButton"
        );

    const selectedCard =
        document.getElementById(
            "selectedCard"
        );

    const manualExceptionCard =
        document.getElementById(
            "manualExceptionCard"
        );

    normalSearchArea?.classList.add(
        "hidden"
    );

    zeroCountArea?.classList.remove(
        "hidden"
    );

    selectedCard?.classList.add(
        "hidden"
    );

    manualExceptionCard?.classList.add(
        "hidden"
    );

    if (title) {
        title.textContent =
            "Zero Count Items";
    }

    if (button) {
        button.textContent =
            "Back to Search";

        button.onclick =
            InventoryApp.hideZeroCountItems;
    }

    InventoryApp.loadZeroCountItems();
};


InventoryApp.hideZeroCountItems =
function () {
    const normalSearchArea =
        document.getElementById(
            "normalSearchArea"
        );

    const zeroCountArea =
        document.getElementById(
            "zeroCountArea"
        );

    const title =
        document.getElementById(
            "searchSectionTitle"
        );

    const button =
        document.getElementById(
            "zeroCountToggleButton"
        );

    const status =
        document.getElementById(
            "zeroCountStatus"
        );

    const results =
        document.getElementById(
            "zeroCountResults"
        );

    normalSearchArea?.classList.remove(
        "hidden"
    );

    zeroCountArea?.classList.add(
        "hidden"
    );

    if (title) {
        title.textContent = "Search";
    }

    if (button) {
        button.textContent =
            "View Zero Counts";

        button.onclick =
            InventoryApp.showZeroCountItems;
    }

    if (status) {
        status.textContent = "";
    }

    if (results) {
        results.innerHTML = "";
    }

    const searchInput =
        document.getElementById(
            "searchInput"
        );

    if (searchInput) {
        window.setTimeout(() => {
            searchInput.focus();
        }, 100);
    }
};


document.addEventListener(
    "DOMContentLoaded",
    () => {
        const searchInput =
            document.getElementById(
                "searchInput"
            );

        if (!searchInput) {
            return;
        }

        searchInput.addEventListener(
            "input",
            () => {
                clearTimeout(
                    InventoryApp.searchTimer
                );

                const query =
                    searchInput.value.trim();

                const results =
                    document.getElementById(
                        "results"
                    );

                const notFoundArea =
                    document.getElementById(
                        "notFoundArea"
                    );

                if (!query) {
                    if (results) {
                        results.innerHTML = "";
                    }

                    notFoundArea?.classList.add(
                        "hidden"
                    );

                    InventoryApp
                        .currentResultItems = [];

                    InventoryApp
                        .highlightedResultIndex = -1;

                    return;
                }

                /*
                 * A new item number is being typed, so
                 * the operator has moved on from the
                 * material they just counted.
                 */
                if (
                    typeof InventoryApp
                        .hideLastCountedShortcut ===
                    "function"
                ) {
                    InventoryApp
                        .hideLastCountedShortcut();
                }

                InventoryApp.searchTimer =
                    window.setTimeout(
                        () => {
                            InventoryApp
                                .searchItems(query);
                        },
                        120
                    );
            }
        );

        searchInput.addEventListener(
            "keydown",
            event => {
                if (event.key === "Escape") {
                    const results =
                        document.getElementById(
                            "results"
                        );

                    const notFoundArea =
                        document.getElementById(
                            "notFoundArea"
                        );

                    if (results) {
                        results.innerHTML = "";
                    }

                    notFoundArea?.classList.add(
                        "hidden"
                    );

                    InventoryApp
                        .currentResultItems = [];

                    InventoryApp
                        .highlightedResultIndex = -1;

                    return;
                }

                if (
                    !InventoryApp
                        .currentResultItems
                        .length
                ) {
                    return;
                }

                if (
                    event.key ===
                    "ArrowDown"
                ) {
                    event.preventDefault();

                    InventoryApp
                        .highlightedResultIndex =
                        (
                            InventoryApp
                                .highlightedResultIndex +
                            1
                        ) %
                        InventoryApp
                            .currentResultItems
                            .length;

                    InventoryApp
                        .updateHighlightedResult();

                    return;
                }

                if (
                    event.key ===
                    "ArrowUp"
                ) {
                    event.preventDefault();

                    InventoryApp
                        .highlightedResultIndex =
                        InventoryApp
                            .highlightedResultIndex <= 0
                            ? InventoryApp
                                .currentResultItems
                                .length - 1
                            : InventoryApp
                                .highlightedResultIndex - 1;

                    InventoryApp
                        .updateHighlightedResult();

                    return;
                }

                if (event.key === "Enter") {
                    event.preventDefault();

                    const index =
                        InventoryApp
                            .highlightedResultIndex >= 0
                            ? InventoryApp
                                .highlightedResultIndex
                            : 0;

                    InventoryApp.selectItem(
                        InventoryApp
                            .currentResultItems[
                                index
                            ]
                    );
                }
            }
        );
    }
);