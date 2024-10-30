class VariantSelects extends HTMLElement {
  constructor() {
    super();
    this.addEventListener("change", this.onVariantChange);
  }

  onVariantChange() {
    this.updateOptions();
    this.updateMasterId();
    this.toggleAddButton(true, "", false);
    this.updatePickupAvailability();
    this.removeErrorMessage();
    this.updateVariantStatuses();

    if (!this.currentVariant) {
      this.toggleAddButton(true, "", true);
      this.setUnavailable();
    } else {
      this.updateMedia();
      this.updateURL();
      this.updateVariantInput();
      this.renderProductInfo();
      this.updateShareUrl();
    }
  }

  updateOptions() {
    this.options = Array.from(
      this.querySelectorAll("select"),
      (select) => select.value
    );
  }

  updateMasterId() {
    this.currentVariant = this.getVariantData().find((variant) => {
      return !variant.options
        .map((option, index) => {
          return this.options[index] === option;
        })
        .includes(false);
    });
  }

  updateMedia() {
    if (!this.currentVariant) return;
    if (!this.currentVariant.featured_media) return;

    const mediaGalleries = document.querySelectorAll(
      `[id^="MediaGallery-${this.dataset.section}"]`
    );
    mediaGalleries.forEach((mediaGallery) =>
      mediaGallery.setActiveMedia(
        `${this.dataset.section}-${this.currentVariant.featured_media.id}`,
        true
      )
    );

    const modalContent = document.querySelector(
      `#ProductModal-${this.dataset.section} .product-media-modal__content`
    );
    if (!modalContent) return;
    const newMediaModal = modalContent.querySelector(
      `[data-media-id="${this.currentVariant.featured_media.id}"]`
    );
    modalContent.prepend(newMediaModal);
  }

  updateURL() {
    if (!this.currentVariant || this.dataset.updateUrl === "false") return;
    window.history.replaceState(
      {},
      "",
      `${this.dataset.url}?variant=${this.currentVariant.id}`
    );
  }

  updateShareUrl() {
    const shareButton = document.getElementById(
      `Share-${this.dataset.section}`
    );
    if (!shareButton || !shareButton.updateUrl) return;
    shareButton.updateUrl(
      `${window.shopUrl}${this.dataset.url}?variant=${this.currentVariant.id}`
    );
  }

  updateVariantInput() {
    const productForms = document.querySelectorAll(
      `#product-form-${this.dataset.section}, #product-form-installment-${this.dataset.section}`
    );
    productForms.forEach((productForm) => {
      const input = productForm.querySelector('input[name="id"]')
        ? productForm.querySelector('input[name="id"]')
        : productForm.querySelector('input[name="items_id[0]"]');
      input.value = this.currentVariant.id;
      input.dataset.forProduct = this.currentVariant.name;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  updateVariantStatuses() {
    const selectedOptionOneVariants = this.variantData.filter(
      (variant) => this.querySelector(":checked").value === variant.option1
    );
    const inputWrappers = [...this.querySelectorAll(".product-form__input")];
    inputWrappers.forEach((option, index) => {
      if (index === 0) return;
      const optionInputs = [
        ...option.querySelectorAll('input[type="radio"], option'),
      ];
      const previousOptionSelected =
        inputWrappers[index - 1].querySelector(":checked").value;
      const availableOptionInputsValue = selectedOptionOneVariants
        .filter(
          (variant) =>
            variant.available &&
            variant[`option${index}`] === previousOptionSelected
        )
        .map((variantOption) => variantOption[`option${index + 1}`]);
      this.setInputAvailability(optionInputs, availableOptionInputsValue);
    });
  }

  setInputAvailability(listOfOptions, listOfAvailableOptions) {
    listOfOptions.forEach((input) => {
      if (listOfAvailableOptions.includes(input.getAttribute("value"))) {
        input.innerText = input.getAttribute("value");
      } else {
        input.innerText = window.variantStrings.unavailable_with_option.replace(
          "[value]",
          input.getAttribute("value")
        );
      }
    });
  }

  updatePickupAvailability() {
    const pickUpAvailability = document.querySelector("pickup-availability");
    if (!pickUpAvailability) return;

    if (this.currentVariant && this.currentVariant.available) {
      pickUpAvailability.fetchAvailability(this.currentVariant.id);
    } else {
      pickUpAvailability.removeAttribute("available");
      pickUpAvailability.innerHTML = "";
    }
  }

  removeErrorMessage() {
    const section = this.closest("section");
    if (!section) return;

    const productForm = section.querySelector("product-form");
    if (productForm) this.handleErrorMessage();
  }

  handleErrorMessage(errorMessage = false) {
    this.errorMessageWrapper =
      this.errorMessageWrapper ||
      this.querySelector(".product-form__error-message-wrapper");
    if (!this.errorMessageWrapper) return;
    this.errorMessage =
      this.errorMessage ||
      this.errorMessageWrapper.querySelector(".product-form__error-message");
    this.errorMessageWrapper.toggleAttribute("hidden", !errorMessage);
    if (errorMessage) {
      this.errorMessage.textContent = errorMessage;
    }
  }

  renderProductInfo() {
    const requestedVariantId = this.currentVariant.id;
    const sectionId = this.dataset.originalSection
      ? this.dataset.originalSection
      : this.dataset.section;

    fetch(
      `${this.dataset.url}?variant=${requestedVariantId}&section_id=${
        this.dataset.originalSection
          ? this.dataset.originalSection
          : this.dataset.section
      }`
    )
      .then((response) => response.text())
      .then((responseText) => {
        // prevent unnecessary ui changes from abandoned selections
        if (this.currentVariant.id !== requestedVariantId) return;

        const html = new DOMParser().parseFromString(responseText, "text/html");
        const destination = document.getElementById(
          `price-${this.dataset.section}`
        );
        const source = html.getElementById(
          `price-${
            this.dataset.originalSection
              ? this.dataset.originalSection
              : this.dataset.section
          }`
        );
        const buttonDestination = document.getElementById(
          `button-price-${this.dataset.section}`
        );
        const buttonSource = html.getElementById(
          `button-price-${
            this.dataset.originalSection
              ? this.dataset.originalSection
              : this.dataset.section
          }`
        );
        const skuSource = html.getElementById(
          `Sku-${
            this.dataset.originalSection
              ? this.dataset.originalSection
              : this.dataset.section
          }`
        );
        const skuDestination = document.getElementById(
          `Sku-${this.dataset.section}`
        );
        const inventorySource = html.getElementById(
          `Inventory-${
            this.dataset.originalSection
              ? this.dataset.originalSection
              : this.dataset.section
          }`
        );
        const inventoryDestination = document.getElementById(
          `Inventory-${this.dataset.section}`
        );

        if (source && destination) destination.innerHTML = source.innerHTML;
        if (buttonSource && buttonDestination)
          buttonDestination.innerHTML = buttonSource.innerHTML;
        if (inventorySource && inventoryDestination)
          inventoryDestination.innerHTML = inventorySource.innerHTML;
        if (skuSource && skuDestination) {
          skuDestination.innerHTML = skuSource.innerHTML;
          skuDestination.classList.toggle(
            "visibility-hidden",
            skuSource.classList.contains("visibility-hidden")
          );
        }

        const price = document.getElementById(`price-${this.dataset.section}`);

        if (price) price.classList.remove("visibility-hidden");

        if (inventoryDestination)
          inventoryDestination.classList.toggle(
            "visibility-hidden",
            inventorySource.innerText === ""
          );

        const addButtonUpdated = html.getElementById(
          `ProductSubmitButton-${sectionId}`
        );
        this.toggleAddButton(
          addButtonUpdated ? addButtonUpdated.hasAttribute("disabled") : true,
          window.variantStrings.soldOut
        );
        //this.toggleAddButton(!this.currentVariant.available, window.variantStrings.soldOut);

        publish(PUB_SUB_EVENTS.variantChange, {
          data: {
            sectionId,
            html,
            variant: this.currentVariant,
          },
        });
      });
  }

  toggleAddButton(disable = true, text, modifyClass = true) {
    const productForm = document.getElementById(
      `product-form-${this.dataset.section}`
    );
    if (!productForm) return;
    const inputId = productForm.querySelector('input[name="id"]')
      ? productForm.querySelector('input[name="id"]')
      : productForm.querySelector('input[name="items_id[0]"]');
    const addButton = productForm.querySelector('[name="add"]');
    const textmetexte = document.querySelector("#precommande");
    const addButtonText = productForm.querySelector('[name="add"] > span');
    const formUnavailable = productForm.querySelector(
      ".product-form__not-available"
    );
    const formButtons = productForm.querySelector(".product-form__buttons");
    const thisCurrentVariantId = this.currentVariant.id;
    const thisProductContainer = this.closest(".product__info-container");
    const thisProductLowStock = document.querySelector(
      ".product-form__low-stock"
    );
    const id = inputId.value;
    if (!addButton) return;

    productForm.classList.add("loading");
    window.ORDERSIFY_BIS.currentVariant = this.currentVariant;
    var event = new CustomEvent("OrdersifyFormChange", {
      detail: { variantID: thisCurrentVariantId },
    });
    document.body.dispatchEvent(event);

    if (disable) {
      thisProductLowStock.classList.add("hidden");
      formUnavailable.classList.remove("hidden");
      formButtons.classList.add("hidden");
      thisProductContainer.classList.add("not-available");
      addButton.setAttribute("disabled", "disabled");
      inputId.setAttribute("disabled", "disabled");
      if (text) addButtonText.textContent = text;
    } else {
      if (
        variantStock[thisCurrentVariantId] > 0 &&
        variantStock[thisCurrentVariantId] <= 5
      ) {
        const inventoryHtml =
          '<span class="low-stock">Attention plus que ' +
          variantStock[thisCurrentVariantId] +
          " dispo !</span>";
        thisProductLowStock.innerHTML = inventoryHtml;
        thisProductLowStock.classList.remove("hidden");
      } else {
        thisProductLowStock.classList.add("hidden");
      }
      formUnavailable.classList.add("hidden");
      formButtons.classList.remove("hidden");
      thisProductContainer.classList.remove("not-available");
      addButton.removeAttribute("disabled");
      inputId.removeAttribute("disabled");
      if (window.variantoff[id] != null) {
        var textme =
          "PRÉ-COMMANDE <br><small>- DÉLAIS DE FABRICATION : " +
          window.variantoff[id].fabrication +
          "</small><br><small>- DATE LIVRAISON PRÉ-COMMANDE : " +
          window.variantoff[id].livraison +
          "</small>";
        if (document.querySelector("#_preorder") != null) {
          document.querySelector("#_preorder").value = "Oui";
          document.querySelector("#_preorder_date").value =
            window.variantoff[id].livraison;
        }
        if (document.querySelector("#_infos-preorder") != null) {
          document.querySelector("#_infos-preorder").value =
            "ATTENTION : Il sera expédié une fois le délais de fabrication passé";
        }

        textmetexte.innerHTML = textme;
        addButtonText.textContent = window.variantStrings.PreOrderaddToCart;
      } else {
        textmetexte.innerHTML = " ";
        if (document.querySelector("#_preorder") != null) {
          document.querySelector("#_preorder").value = "";
          document.querySelector("#_preorder_date").value = "";
        }
        if (document.querySelector("#_infos-preorder") != null) {
          document.querySelector("#_infos-preorder").value = "";
        }

        addButtonText.textContent = window.variantStrings.addToCart;
      }
    }
    setTimeout(function () {
      productForm.classList.remove("loading");
    }, 1200);

    if (!modifyClass) return;
  }

  setUnavailable() {
    const button = document.getElementById(
      `product-form-${this.dataset.section}`
    );
    const addButton = button.querySelector('[name="add"]');
    const addButtonText = button.querySelector('[name="add"] > span');
    const price = document.getElementById(`price-${this.dataset.section}`);
    const inventory = document.getElementById(
      `Inventory-${this.dataset.section}`
    );
    const sku = document.getElementById(`Sku-${this.dataset.section}`);

    if (!addButton) return;
    addButtonText.textContent = window.variantStrings.unavailable;
    if (price) price.classList.add("visibility-hidden");
    if (inventory) inventory.classList.add("visibility-hidden");
    if (sku) sku.classList.add("visibility-hidden");
  }

  getVariantData() {
    this.variantData =
      this.variantData ||
      JSON.parse(this.querySelector('[type="application/json"]').textContent);
    return this.variantData;
  }
}

customElements.define("variant-selects", VariantSelects);

class VariantRadios extends VariantSelects {
  constructor() {
    super();
    this.updateOptions();
    this.updateMasterId();
    this.updateVariantStatuses();
  }

  setInputAvailability(listOfOptions, listOfAvailableOptions) {
    listOfOptions.forEach((input) => {
      if (listOfAvailableOptions.includes(input.getAttribute("value"))) {
        input.classList.remove("disabled");
        input.parentNode.classList.remove("disabled");
        input.parentNode.parentNode.classList.remove("disabled");
      } else {
        input.classList.add("disabled");
        input.parentNode.classList.add("disabled");
        input.parentNode.parentNode.classList.add("disabled");
      }
    });
  }

  updateOptions() {
    if (document.querySelectorAll('input[name="Couleur"]').length > 0) {
      const Option1 = Array.from(
        document.querySelectorAll('input[name="Couleur"]')
      ).find((radio) => radio.checked);
      const MediaGallery = Option1.closest(".product")
        .querySelector(".product__media-gallery")
        .setAttribute("data-color", Option1.value);
      const Product = Option1.closest(".product");
      const MediaWrapper = Product.querySelector(".product__media-list");
      const Medias = MediaWrapper.querySelectorAll(".product__media-item");
      const MediaW = Medias[0].offsetWidth;
      const ShowedMediaCount = Array.prototype.slice
        .call(Medias)
        .filter(function (media) {
          return getComputedStyle(media).display !== "none";
        });
      const MediatoShow =
        Medias != ShowedMediaCount ? ShowedMediaCount.length : Medias.length;
      const MediaPos = parseInt(MediaWrapper.getAttribute("data-media-pos"));
      var NewPos = 1;
      MediaWrapper.setAttribute("data-media-count", MediatoShow);
      MediaWrapper.setAttribute("data-media-pos", 1);
      MediaWrapper.setAttribute(
        "data-media-next",
        NewPos + 1 < MediatoShow ? NewPos + 1 : 1
      );
      MediaWrapper.setAttribute("data-media-prev", MediatoShow);
      MediaWrapper.style.left = (NewPos - 1) * MediaW * -1 + "px";
    }

    const fieldsets = Array.from(this.querySelectorAll("fieldset"));
    this.options = fieldsets.map((fieldset) => {
      return Array.from(fieldset.querySelectorAll("input")).find(
        (radio) => radio.checked
      ).value;
    });
  }
}

customElements.define("variant-radios", VariantRadios);

class ProductRecommendations extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    const handleIntersection = (entries, observer) => {
      if (!entries[0].isIntersecting) return;
      observer.unobserve(this);

      fetch(this.dataset.url)
        .then((response) => response.text())
        .then((text) => {
          const html = document.createElement("div");
          html.innerHTML = text;
          const recommendations = html.querySelector("product-recommendations");

          if (recommendations && recommendations.innerHTML.trim().length) {
            this.innerHTML = recommendations.innerHTML;
          }

          if (
            !this.querySelector("slideshow-component") &&
            this.classList.contains("complementary-products")
          ) {
            this.remove();
          }

          if (html.querySelector(".grid__item")) {
            this.classList.add("product-recommendations--loaded");
          }
        })
        .catch((e) => {
          console.error(e);
        });
    };

    new IntersectionObserver(handleIntersection.bind(this), {
      rootMargin: "0px 0px 400px 0px",
    }).observe(this);
  }
}

customElements.define("product-recommendations", ProductRecommendations);

class BasButton extends HTMLElement {
  constructor() {
    super();
    this.addEventListener("click", this.openBasModal);
  }

  openBasModal() {
    const osfInlineBtn = document.querySelector(".osf_inline_button");
    if (osfInlineBtn) osfInlineBtn.click();
  }
}

customElements.define("bas-button", BasButton);

addLoadEvent(ChangeBroderieTextOnKeyUp);

function ChangeBroderieText(input) {
  const TextValue = input.querySelector("input").value;
  const TextLabel = input.querySelector(".pplrlabel");
  TextLabel.setAttribute("data-text", TextValue);
}

function ChangeBroderieTextOnKeyUp() {
  document.querySelectorAll(".pplraddprice").forEach((element) => {
    const price = element.getAttribute("data-price");
    if (element.closest(".pplrlabel")) {
      element.closest(".pplrlabel").append("(+" + price + "€)");
    }
  });
  document.querySelectorAll(".pplr_ins").forEach((element) => {
    if (!element.closest(".pplr-wrapper").classList.contains("pplr-helper")) {
      element.closest(".pplr-wrapper").classList.add("ins");
      const element_id =
        "pplr_ins_" +
        element.closest(".pplr-wrapper").getAttribute("data-main");
      const newElement =
        '<input type="checkbox" id="' +
        element_id +
        '"/><label for="' +
        element_id +
        '" class="ins">?</label><span class="pplr_ins">' +
        element.innerHTML +
        "</span>";
      element
        .closest(".pplr-wrapper")
        .querySelector(".pplrlabel")
        .insertAdjacentHTML("beforeend", newElement);
    }
  });
  document.querySelectorAll(".pplrcheckbox").forEach((input) => {
    input.addEventListener("change", function (event) {
      input.closest(".pplr-wrapper").classList.toggle("checked");
    });
  });
  document.querySelectorAll(".pplr_select").forEach((input) => {
    input
      .closest(".product-personalizer")
      .setAttribute("data-select", input.value);
    input.addEventListener("change", function (event) {
      input
        .closest(".product-personalizer")
        .setAttribute("data-select", input.value);
    });
  });
  document
    .querySelectorAll(
      ".pplr-pied-gauche,.pplr-pied-droit,.pplr-manche-gauche,.pplr-sac,.pplr-pied"
    )
    .forEach((element) => {
      element.addEventListener(
        "keyup",
        function (event) {
          if (element.classList.contains("LoadDataText")) {
            ChangeBroderieText(element);
            return;
          } else {
            element.querySelector(".pplrlabel").setAttribute("data-text", "");
            ChangeBroderieText(element);
            element.classList.add("LoadDataText");
          }
        },
        true
      );
    });
}
