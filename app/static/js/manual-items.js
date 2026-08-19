/*
 * Manual item helpers.
 *
 * Items that are on the floor but missing from the
 * workbook are added here, together with their first
 * count, through /api/add-manual-item.
 *
 * The count and entry functions for workbook items live
 * in counts.js. This file previously held a second,
 * older copy of them, and because this script loads
 * after counts.js those copies silently replaced the
 * real ones.
 */

InventoryApp.showManualItemForm =
function () {
    if (InventoryApp.isStrayTap()) {
        return;
    }

    const card =
        document.getElementById(
            "manualExceptionCard"
        );

    if (!card) {
        return;
    }

    const itemNumberInput =
        document.getElementById(
            "exceptionItemNumber"
        );

    const productNameInput =
        document.getElementById(
            "exceptionProductName"
        );

    const countInput =
        document.getElementById(
            "exceptionCount"
        );

    const status =
        document.getElementById(
            "exceptionStatus"
        );

    const searchInput =
        document.getElementById(
            "searchInput"
        );

    card.classList.remove("hidden");

    document.getElementById(
        "selectedCard"
    )?.classList.add("hidden");

    document.getElementById(
        "notFoundArea"
    )?.classList.add("hidden");

    InventoryApp.setSearchStatus("");

    /*
     * Carry over whatever was typed in search.
     * That is almost always the item number the
     * operator was looking for.
     */
    if (itemNumberInput) {
        itemNumberInput.value =
            (searchInput?.value || "")
                .trim()
                .toUpperCase();
    }

    if (productNameInput) {
        productNameInput.value = "";
    }

    if (countInput) {
        countInput.value = "";
        countInput.readOnly = false;

        countInput.setAttribute(
            "inputmode",
            "decimal"
        );
    }

    if (status) {
        status.textContent = "";

        status.classList.remove(
            "error-message"
        );
    }

    card.scrollIntoView({
        block: "start",
        behavior: "auto",
    });

    /*
     * Focus the count field when the item number came
     * over from search, otherwise start at the top.
     */
    const focusTarget =
        itemNumberInput &&
        itemNumberInput.value
            ? countInput
            : itemNumberInput;

    if (focusTarget) {
        window.setTimeout(() => {
            focusTarget.focus();
        }, 100);
    }
};


InventoryApp.hideManualItemForm =
function () {
    const card =
        document.getElementById(
            "manualExceptionCard"
        );

    card?.classList.add("hidden");

    [
        "exceptionItemNumber",
        "exceptionProductName",
        "exceptionCount",
    ].forEach(inputId => {
        const input =
            document.getElementById(inputId);

        if (input) {
            input.value = "";
            input.blur();
        }
    });

    const status =
        document.getElementById(
            "exceptionStatus"
        );

    if (status) {
        status.textContent = "";

        status.classList.remove(
            "error-message"
        );
    }

    document.getElementById(
        "notFoundArea"
    )?.classList.add("hidden");

    const searchInput =
        document.getElementById(
            "searchInput"
        );

    if (searchInput) {
        searchInput.value = "";
    }

    const results =
        document.getElementById("results");

    if (results) {
        results.innerHTML = "";
    }

    InventoryApp.currentResultItems = [];
    InventoryApp.highlightedResultIndex = -1;

    if (searchInput) {
        window.setTimeout(() => {
            searchInput.focus();
        }, 100);
    }
};


InventoryApp.saveManualItem =
async function () {
    const status =
        document.getElementById(
            "exceptionStatus"
        );

    const itemNumberInput =
        document.getElementById(
            "exceptionItemNumber"
        );

    const productNameInput =
        document.getElementById(
            "exceptionProductName"
        );

    const countInput =
        document.getElementById(
            "exceptionCount"
        );

    if (!status || !itemNumberInput) {
        return;
    }

    status.textContent = "";

    status.classList.remove(
        "error-message"
    );

    const itemNumber =
        itemNumberInput.value
            .trim()
            .toUpperCase();

    if (!itemNumber) {
        status.textContent =
            "Item number is required.";

        status.classList.add(
            "error-message"
        );

        itemNumberInput.focus();

        return;
    }

    /*
     * The item number format is checked by the server
     * so both paths always agree on what is valid.
     */
    const count =
        InventoryApp.getValidCount(
            "exceptionCount",
            status
        );

    if (count === null) {
        status.classList.add(
            "error-message"
        );

        countInput?.focus();

        return;
    }

    const saveButton =
        document.getElementById(
            "saveManualItemButton"
        );

    if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = "Saving...";
    }

    try {
        const response = await fetch(
            "/api/add-manual-item",
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/json",
                },
                body: JSON.stringify({
                    item_number: itemNumber,
                    product_name:
                        productNameInput?.value.trim()
                        || "",
                    count,
                }),
            }
        );

        const data = await response.json();

        if (!response.ok || !data.ok) {
            status.textContent =
                data.error ||
                "The item could not be added.";

            status.classList.add(
                "error-message"
            );

            return;
        }

        /*
         * Clear the fields before the card is hidden so
         * a cancelled form never reopens with old text.
         */
        [
            itemNumberInput,
            productNameInput,
            countInput,
        ].forEach(input => {
            if (input) {
                input.value = "";
                input.blur();
            }
        });

        /*
         * Same flow as a counted item: the entry is
         * stored, so go back to search for the next one.
         */
        InventoryApp.returnToSearch(
            `Added ${data.entry.count} for ` +
            `${data.item.item_number}. ` +
            `Item created manually.`,
            {
                item_number:
                    data.item.item_number,

                product_name:
                    data.item.product_name || "",
            }
        );

    } catch (error) {
        console.error(error);

        status.textContent =
            "Could not connect to the server.";

        status.classList.add(
            "error-message"
        );

    } finally {
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent =
                "Save Item";
        }
    }
};


document.addEventListener(
    "DOMContentLoaded",
    () => {
        const itemNumberInput =
            document.getElementById(
                "exceptionItemNumber"
            );

        const countInput =
            document.getElementById(
                "exceptionCount"
            );

        /*
         * Enter moves down the form, then saves.
         */
        if (itemNumberInput) {
            itemNumberInput.addEventListener(
                "keydown",
                event => {
                    if (event.key !== "Enter") {
                        return;
                    }

                    event.preventDefault();

                    countInput?.focus();
                }
            );
        }

        if (countInput) {
            countInput.addEventListener(
                "keydown",
                event => {
                    if (event.key !== "Enter") {
                        return;
                    }

                    event.preventDefault();

                    InventoryApp.saveManualItem();
                }
            );
        }
    }
);
