function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll(
      "summary, a[href], button:enabled, [tabindex]:not([tabindex^='-']), [draggable], area, input:not([type=hidden]):enabled, select:enabled, textarea:enabled, object, iframe"
    )
  );
}

document.querySelectorAll('[id^="Details-"] summary').forEach((summary) => {
  summary.setAttribute('role', 'button');
  summary.setAttribute('aria-expanded', summary.parentNode.hasAttribute('open'));

  if(summary.nextElementSibling.getAttribute('id')) {
    summary.setAttribute('aria-controls', summary.nextElementSibling.id);
  }

  summary.addEventListener('click', (event) => {
    event.currentTarget.setAttribute('aria-expanded', !event.currentTarget.closest('details').hasAttribute('open'));
  });

  if (summary.closest('header-drawer')) return;
  summary.parentElement.addEventListener('keyup', onKeyUpEscape);
});

const trapFocusHandlers = {};

function trapFocus(container, elementToFocus = container) {
  var elements = getFocusableElements(container);
  var first = elements[0];
  var last = elements[elements.length - 1];

  removeTrapFocus();

  trapFocusHandlers.focusin = (event) => {
    if (
      event.target !== container &&
      event.target !== last &&
      event.target !== first
    )
      return;

    document.addEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.focusout = function() {
    document.removeEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.keydown = function(event) {
    if (event.code.toUpperCase() !== 'TAB') return; // If not TAB key
    // On the last focusable element and tab forward, focus the first element.
    if (event.target === last && !event.shiftKey) {
      event.preventDefault();
      first.focus();
    }

    //  On the first focusable element and tab backward, focus the last element.
    if (
      (event.target === container || event.target === first) &&
      event.shiftKey
    ) {
      event.preventDefault();
      last.focus();
    }
  };

  document.addEventListener('focusout', trapFocusHandlers.focusout);
  document.addEventListener('focusin', trapFocusHandlers.focusin);

  elementToFocus.focus();
  
  if (elementToFocus.tagName === 'INPUT' &&
    ['search', 'text', 'email', 'url'].includes(elementToFocus.type) &&
    elementToFocus.value) {
    elementToFocus.setSelectionRange(0, elementToFocus.value.length);
  }
}

// Here run the querySelector to figure out if the browser supports :focus-visible or not and run code based on it.
try {
  document.querySelector(":focus-visible");
} catch(e) {
  focusVisiblePolyfill();
}

function focusVisiblePolyfill() {
  const navKeys = ['ARROWUP', 'ARROWDOWN', 'ARROWLEFT', 'ARROWRIGHT', 'TAB', 'ENTER', 'SPACE', 'ESCAPE', 'HOME', 'END', 'PAGEUP', 'PAGEDOWN']
  let currentFocusedElement = null;
  let mouseClick = null;

  window.addEventListener('keydown', (event) => {
    if(navKeys.includes(event.code.toUpperCase())) {
      mouseClick = false;
    }
  });

  window.addEventListener('mousedown', (event) => {
    mouseClick = true;
  });

  window.addEventListener('focus', () => {
    if (currentFocusedElement) currentFocusedElement.classList.remove('focused');

    if (mouseClick) return;

    currentFocusedElement = document.activeElement;
    currentFocusedElement.classList.add('focused');

  }, true);
}

function pauseAllMedia() {
  document.querySelectorAll('.js-youtube').forEach((video) => {
    video.contentWindow.postMessage('{"event":"command","func":"' + 'pauseVideo' + '","args":""}', '*');
  });
  document.querySelectorAll('.js-vimeo').forEach((video) => {
    video.contentWindow.postMessage('{"method":"pause"}', '*');
  });
  document.querySelectorAll('video').forEach((video) => video.pause());
  document.querySelectorAll('product-model').forEach((model) => {
    if (model.modelViewerUI) model.modelViewerUI.pause();
  });
}

function removeTrapFocus(elementToFocus = null) {
  document.removeEventListener('focusin', trapFocusHandlers.focusin);
  document.removeEventListener('focusout', trapFocusHandlers.focusout);
  document.removeEventListener('keydown', trapFocusHandlers.keydown);

  if (elementToFocus) elementToFocus.focus();
}

function onKeyUpEscape(event) {
  if (event.code.toUpperCase() !== 'ESCAPE') return;

  const openDetailsElement = event.target.closest('details[open]');
  if (!openDetailsElement) return;

  const summaryElement = openDetailsElement.querySelector('summary');
  openDetailsElement.removeAttribute('open');
  summaryElement.setAttribute('aria-expanded', false);
  summaryElement.focus();
}

class QuantityInput extends HTMLElement {
  constructor() {
    super();
    this.input = this.querySelector('input');
    if(this.input == null) {
      this.input = this.querySelector('select');
    }
    this.changeEvent = new Event('change', { bubbles: true })

    this.input.addEventListener('change', this.onInputChange.bind(this));
    this.querySelectorAll('button').forEach(
      (button) => button.addEventListener('click', this.onButtonClick.bind(this))
    );
  }

  quantityUpdateUnsubscriber = undefined;

  connectedCallback() {
    this.validateQtyRules();
    this.quantityUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.quantityUpdate, this.validateQtyRules.bind(this));
  }

  disconnectedCallback() {
    if (this.quantityUpdateUnsubscriber) {
      this.quantityUpdateUnsubscriber();
    }
  }

  onInputChange(event) {
    this.validateQtyRules();
    if(this.input.name.includes('items_qty')) {
      const product = document.querySelector('product-info');
      const globalInput = product.querySelector('[name="global_qty"]');
      const submitButton = product.querySelector('[name="add"]');
      const addButtonText = product.querySelector('[name="add"] > span');
      const priceButton = product.querySelector('[name="add"] > .price');
      const productpricesButtonTexts = product.querySelectorAll('.product-price-item');
      const pricesButtonTexts = product.querySelectorAll('.price-item');
      const OptionpricesButtonTexts = product.querySelectorAll('.option-price-item');
      let GlobalPrice = 0;
      let GlobalOptionPrice = 0;
      let GlobalQty = 0;
      document.querySelectorAll('[name^=items_qty]').forEach((input) => {
        GlobalQty += parseInt(input.value);
        if(parseInt(input.value) > 0) {
          GlobalPrice += parseFloat(input.dataset.price) * parseInt(input.value);
        }
      });
      productpricesButtonTexts.forEach((price) => {
        price.textContent = ' ' + (GlobalPrice).toFixed(2) + '€ ';
      });
      globalInput.value = GlobalQty;
      document.querySelectorAll('[name^=options_id]').forEach((input) => {
        var nextCheckboxInput = input.nextElementSibling;
        if(parseInt(GlobalQty) > 0 && nextCheckboxInput.name.includes('product_options') && nextCheckboxInput.checked) {
          GlobalOptionPrice += parseFloat(input.dataset.price) * parseInt(GlobalQty);
        }
      });
      OptionpricesButtonTexts.forEach((price) => {
        price.textContent = ' ' + (GlobalOptionPrice).toFixed(2) + '€ ';
      });
      pricesButtonTexts.forEach((price) => {
        price.textContent = ' ' + (GlobalPrice + GlobalOptionPrice).toFixed(2) + '€ ';
      });
      if(GlobalQty >= 15) {
        submitButton.disabled = false;
        submitButton.classList.remove('disabled');
        priceButton.classList.remove('hidden');
        addButtonText.textContent = window.variantStrings.addToCart;
      } else {
        submitButton.disabled = true;
        submitButton.classList.add('disabled');
        priceButton.classList.add('hidden');
        if(GlobalQty > 0) {
          let new_text = window.variantStrings.toQtyMinProduct.replace('{{ quantity }}',(15 - GlobalQty));
          addButtonText.textContent = new_text;
        } else {
          addButtonText.textContent = window.variantStrings.QtyMinProduct;
        }
      }
    }
  }
  
  onButtonClick(event) {
    event.preventDefault();
    const previousValue = this.input.value;

    event.target.name === 'plus' ? this.input.stepUp() : this.input.stepDown();
    if (previousValue !== this.input.value) this.input.dispatchEvent(this.changeEvent);
  }
  
  validateQtyRules() {
    const value = parseInt(this.input.value);
    if (this.input.min) {
      const min = parseInt(this.input.min);
      const buttonMinus = this.querySelector(".quantity__button[name='minus']");
      buttonMinus.classList.toggle('disabled', value <= min);
    }
    if (this.input.max) {
      const max = parseInt(this.input.max);
      const buttonPlus = this.querySelector(".quantity__button[name='plus']");
      buttonPlus.classList.toggle('disabled', value >= max);
    } 
  }
}

customElements.define('quantity-input', QuantityInput);

class ProductOption extends HTMLElement {
  constructor() {
    super();
    this.product = document.querySelector('product-info');
    this.globalQtyInput = this.product.querySelector('[name="global_qty"]');
    this.DeliveryAvailabilty = this.product.querySelector('delivery-availability');
    this.CustomInfo = this.product.querySelector('.custom-availability-info');
    this.PickupAvailabilty = this.product.querySelector('pickup-availability');
    this.product.querySelectorAll('input[type=checkbox]').forEach((input) => {
      input.addEventListener('change', this.onInputChange.bind(this));
    });
    var max_delay = false;
  }
  
  onInputChange(event) {
    const priceButton = this.product.querySelector('[name="add"] > .price');
    const productpricesButtonTexts = this.product.querySelectorAll('.product-price-item');
    const pricesButtonTexts = this.product.querySelectorAll('.price-item');
    const OptionpricesButtonTexts = this.product.querySelectorAll('.option-price-item');
    const embrodery_delay_text = window.variantStrings.embroidery;
    const delay_text = window.variantStrings.delivery_availability_min_max.replace('[min]',this.DeliveryAvailabilty.getAttribute('data-availability-min')).replace('[max]',this.DeliveryAvailabilty.getAttribute('data-availability-max'));
    const base_delay_text = window.variantStrings.delivery_availability_min_max.replace('[min]',this.DeliveryAvailabilty.getAttribute('data-availability-base-min')).replace('[max]',this.DeliveryAvailabilty.getAttribute('data-availability-base-max'));
    const pickup_delay_text = window.variantStrings.pickup_availability_min_max.replace('[min]',this.PickupAvailabilty.getAttribute('data-availability-min'));
    const base_pickup_delay_text = window.variantStrings.pickup_availability_base;
    let GlobalPrice = 0;
    let GlobalOptionPrice = 0;
    let GlobalQty = 0;
    let GlobalOptionType = '';
    document.querySelectorAll('[name^=items_qty]').forEach((input) => {
      GlobalQty += parseInt(input.value);
      if(parseInt(input.value) > 0) {
        GlobalPrice += parseFloat(input.dataset.price) * parseInt(input.value);
      }
    });
    productpricesButtonTexts.forEach((price) => {
      price.textContent = ' ' + (GlobalPrice).toFixed(2) + '€ ';
    });
    this.globalQtyInput.value = GlobalQty;

    document.querySelectorAll('[name^=options_id]').forEach((input) => {
      var nextCheckboxInput = input.nextElementSibling;
      if(parseInt(GlobalQty) > 0 && nextCheckboxInput.name.includes('product_options') && nextCheckboxInput.checked) {
        GlobalOptionType += input.getAttribute('data-type') + ' ';
        GlobalOptionPrice += parseFloat(input.dataset.price) * parseInt(GlobalQty);
      }
    });
    
    if(GlobalOptionType != '' && GlobalOptionType.includes('broderie')) {
      this.DeliveryAvailabilty.querySelector('.delay').innerHTML = delay_text;
      this.PickupAvailabilty.querySelector('.delay').innerHTML = pickup_delay_text;
      this.CustomInfo.querySelector('.text').innerHTML = embrodery_delay_text;
    } else {
      this.DeliveryAvailabilty.querySelector('.delay').innerHTML = base_delay_text;
      this.PickupAvailabilty.querySelector('.delay').innerHTML = base_pickup_delay_text;
      this.CustomInfo.querySelector('.text').innerHTML = '';
    }

    OptionpricesButtonTexts.forEach((price) => {
      price.textContent = ' ' + (GlobalOptionPrice).toFixed(2) + '€ ';
    });
    pricesButtonTexts.forEach((price) => {
      price.textContent = ' ' + (GlobalPrice + GlobalOptionPrice).toFixed(2) + '€ ';
    });
  }
}
customElements.define('product-option', ProductOption);

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

function fetchConfig(type = 'json') {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': `application/${type}` }
  };
}

/*
 * Shopify Common JS
 *
 */
if ((typeof window.Shopify) == 'undefined') {
  window.Shopify = {};
}

Shopify.bind = function(fn, scope) {
  return function() {
    return fn.apply(scope, arguments);
  }
};

Shopify.setSelectorByValue = function(selector, value) {
  for (var i = 0, count = selector.options.length; i < count; i++) {
    var option = selector.options[i];
    if (value == option.value || value == option.innerHTML) {
      selector.selectedIndex = i;
      return i;
    }
  }
};

Shopify.addListener = function(target, eventName, callback) {
  target.addEventListener ? target.addEventListener(eventName, callback, false) : target.attachEvent('on'+eventName, callback);
};

Shopify.postLink = function(path, options) {
  options = options || {};
  var method = options['method'] || 'post';
  var params = options['parameters'] || {};

  var form = document.createElement("form");
  form.setAttribute("method", method);
  form.setAttribute("action", path);

  for(var key in params) {
    var hiddenField = document.createElement("input");
    hiddenField.setAttribute("type", "hidden");
    hiddenField.setAttribute("name", key);
    hiddenField.setAttribute("value", params[key]);
    form.appendChild(hiddenField);
  }
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
};

Shopify.CountryProvinceSelector = function(country_domid, province_domid, options) {
  this.countryEl         = document.getElementById(country_domid);
  this.provinceEl        = document.getElementById(province_domid);
  this.provinceContainer = document.getElementById(options['hideElement'] || province_domid);

  Shopify.addListener(this.countryEl, 'change', Shopify.bind(this.countryHandler,this));

  this.initCountry();
  this.initProvince();
};

Shopify.CountryProvinceSelector.prototype = {
  initCountry: function() {
    var value = this.countryEl.getAttribute('data-default');
    Shopify.setSelectorByValue(this.countryEl, value);
    this.countryHandler();
  },

  initProvince: function() {
    var value = this.provinceEl.getAttribute('data-default');
    if (value && this.provinceEl.options.length > 0) {
      Shopify.setSelectorByValue(this.provinceEl, value);
    }
  },

  countryHandler: function(e) {
    var opt       = this.countryEl.options[this.countryEl.selectedIndex];
    var raw       = opt.getAttribute('data-provinces');
    var provinces = JSON.parse(raw);

    this.clearOptions(this.provinceEl);
    if (provinces && provinces.length == 0) {
      this.provinceContainer.style.display = 'none';
    } else {
      for (var i = 0; i < provinces.length; i++) {
        var opt = document.createElement('option');
        opt.value = provinces[i][0];
        opt.innerHTML = provinces[i][1];
        this.provinceEl.appendChild(opt);
      }

      this.provinceContainer.style.display = "";
    }
  },

  clearOptions: function(selector) {
    while (selector.firstChild) {
      selector.removeChild(selector.firstChild);
    }
  },

  setOptions: function(selector, values) {
    for (var i = 0, count = values.length; i < values.length; i++) {
      var opt = document.createElement('option');
      opt.value = values[i];
      opt.innerHTML = values[i];
      selector.appendChild(opt);
    }
  }
};

class MenuDrawer extends HTMLElement {
  constructor() {
    super();

    this.mainDetailsToggle = this.querySelector('details');

    this.addEventListener('keyup', this.onKeyUp.bind(this));
    this.addEventListener('focusout', this.onFocusOut.bind(this));
    this.bindEvents();
  }

  bindEvents() {
    this.querySelectorAll('summary').forEach(summary => summary.addEventListener('click', this.onSummaryClick.bind(this)));
    this.querySelectorAll('button').forEach(button => button.addEventListener('click', this.onCloseButtonClick.bind(this)));
  }

  onKeyUp(event) {
    if(event.code.toUpperCase() !== 'ESCAPE') return;

    const openDetailsElement = event.target.closest('details[open]');
    if(!openDetailsElement) return;

    openDetailsElement === this.mainDetailsToggle ? this.closeMenuDrawer(event, this.mainDetailsToggle.querySelector('summary')) : this.closeSubmenu(openDetailsElement);
  }

  onSummaryClick(event) {
    const summaryElement = event.currentTarget;
    const detailsElement = summaryElement.parentNode;
    const parentMenuElement = detailsElement.closest('.has-submenu');
    const isOpen = detailsElement.hasAttribute('open');
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    function addTrapFocus() {
      trapFocus(summaryElement.nextElementSibling, detailsElement.querySelector('button'));
      summaryElement.nextElementSibling.removeEventListener('transitionend', addTrapFocus);
    }
    
    if (detailsElement === this.mainDetailsToggle) {
      if(isOpen) event.preventDefault();

      isOpen ? this.closeMenuDrawer(event, summaryElement) : this.openMenuDrawer(summaryElement);

      if (window.matchMedia('(max-width: 990px)')) {
        document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);
      }
    } else {
      setTimeout(() => {
        detailsElement.classList.add('menu-opening');
        summaryElement.setAttribute('aria-expanded', true);
        parentMenuElement && parentMenuElement.classList.add('submenu-open');
        !reducedMotion || reducedMotion.matches ? addTrapFocus() : summaryElement.nextElementSibling.addEventListener('transitionend', addTrapFocus);
      }, 100);
    }
  }

  openMenuDrawer(summaryElement) {
    setTimeout(() => {
      this.mainDetailsToggle.classList.add('menu-opening');
    });
    summaryElement.setAttribute('aria-expanded', true);
    trapFocus(this.mainDetailsToggle, summaryElement);
    document.body.classList.add(`overflow-hidden-${this.dataset.breakpoint}`);
  }

  closeMenuDrawer(event, elementToFocus = false) {
    if (event === undefined) return;
    
    this.mainDetailsToggle.classList.remove('menu-opening');
    this.mainDetailsToggle.querySelectorAll('details').forEach(details => {
      details.removeAttribute('open');
      details.classList.remove('menu-opening');
    });
    this.mainDetailsToggle.querySelectorAll('.submenu-open').forEach(submenu => {
      submenu.classList.remove('submenu-open');
    });
    document.body.classList.remove(`overflow-hidden-${this.dataset.breakpoint}`);
    removeTrapFocus(elementToFocus);
    this.closeAnimation(this.mainDetailsToggle);
  }

  onFocusOut(event) {
    setTimeout(() => {
      if (this.mainDetailsToggle.hasAttribute('open') && !this.mainDetailsToggle.contains(document.activeElement)) this.closeMenuDrawer();
    });
  }

  onCloseButtonClick(event) {
    const detailsElement = event.currentTarget.closest('details');
    this.closeSubmenu(detailsElement);
  }

  closeSubmenu(detailsElement) {
    const parentMenuElement = detailsElement.closest('.submenu-open');
    parentMenuElement && parentMenuElement.classList.remove('submenu-open');
    detailsElement.classList.remove('menu-opening');
    detailsElement.querySelector('summary').setAttribute('aria-expanded', false);
    removeTrapFocus(detailsElement.querySelector('summary'));
    this.closeAnimation(detailsElement);
  }

  closeAnimation(detailsElement) {
    
    let animationStart;

    const handleAnimation = (time) => {
      if (animationStart === undefined) {
        animationStart = time;
      }

      const elapsedTime = time - animationStart;

      if (elapsedTime < 400) {
        window.requestAnimationFrame(handleAnimation);
      } else {
        detailsElement.removeAttribute('open');
        if (detailsElement.closest('details[open]')) {
          trapFocus(detailsElement.closest('details[open]'), detailsElement.querySelector('summary'));
        }
      }
    }

    window.requestAnimationFrame(handleAnimation);
  }
}

customElements.define('menu-drawer', MenuDrawer);

class HeaderDrawer extends MenuDrawer {
  constructor() {
    super();
  }

  openMenuDrawer(summaryElement) {
    this.header = this.header || document.querySelector('.section-header');
    this.borderOffset = this.borderOffset || this.closest('.header-wrapper').classList.contains('header-wrapper--border-bottom') ? 1 : 0;
    document.documentElement.style.setProperty('--header-bottom-position', `${parseInt(this.header.getBoundingClientRect().bottom - this.borderOffset)}px`);
    this.header.classList.add('menu-open');

    setTimeout(() => {
      this.mainDetailsToggle.classList.add('menu-opening');
    });

    summaryElement.setAttribute('aria-expanded', true);
    trapFocus(this.mainDetailsToggle, summaryElement);
    document.body.classList.add(`overflow-hidden-${this.dataset.breakpoint}`);
  }

  closeMenuDrawer(event, elementToFocus) {
    super.closeMenuDrawer(event, elementToFocus);
    this.header.classList.remove('menu-open');
  }
}

customElements.define('header-drawer', HeaderDrawer);

class ModalDialog extends HTMLElement {
  constructor() {
    super();
    this.querySelector('[id^="ModalClose-"]').addEventListener(
      'click',
      this.hide.bind(this, false)
    );
    this.addEventListener('keyup', (event) => {
      if (event.code.toUpperCase() === 'ESCAPE') this.hide();
    });
    if (this.classList.contains('media-modal')) {
      this.addEventListener('pointerup', (event) => {
        if (event.pointerType === 'mouse' && !event.target.closest('deferred-media, product-model')) this.hide();
      });
    } else {
      this.addEventListener('click', (event) => {
        if (event.target === this) this.hide();
      });
    }
  }

  connectedCallback() {
    if (this.moved) return;
    this.moved = true;
    document.body.appendChild(this);
  }

  show(opener) {
    this.openedBy = opener;
    const popup = this.querySelector('.template-popup');
    document.body.classList.add('overflow-hidden');
    this.setAttribute('open', '');
    if (popup) popup.loadContent();
    trapFocus(this, this.querySelector('[role="dialog"]'));
    //window.pauseAllMedia();
    setTimeout(function() {
      ChangeBroderieTextOnKeyUp();
    },1000);
  }

  hide() {
    document.body.classList.remove('overflow-hidden');
    document.body.dispatchEvent(new CustomEvent('modalClosed'));
    this.removeAttribute('open');
    removeTrapFocus(this.openedBy);
    window.pauseAllMedia();
  }
}
customElements.define('modal-dialog', ModalDialog);

class ModalOpener extends HTMLElement {
  constructor() {
    super();

    const button = this.querySelector('button');

    if (!button) return;
    button.addEventListener('click', () => {
      const modal = document.querySelector(this.getAttribute('data-modal'));
      if (modal) modal.show(button);
    });
  }
}
customElements.define('modal-opener', ModalOpener);

class SliderComponent extends HTMLElement {
  constructor() {
    super();
    this.slider = this.querySelector('[id^="Slider-"]');

    this.sliderItems = this.querySelectorAll('[id^="Slide-"]');
    this.sliderMedias = this.querySelectorAll('.deferred-media');
    this.enableSliderLooping = false;
    this.currentPageElement = this.querySelector('.slider-counter--current');
    this.pageTotalElement = this.querySelector('.slider-counter--total');
    this.prevButton = this.querySelector('button[name="previous"]');
    this.nextButton = this.querySelector('button[name="next"]');

    if (!this.slider || !this.nextButton) return;

    this.initPages();
    const resizeObserver = new ResizeObserver(entries => this.initPages());
    resizeObserver.observe(this.slider);

    this.slider.addEventListener('scroll', this.update.bind(this));
    this.prevButton.addEventListener('click', this.onButtonClick.bind(this));
    this.nextButton.addEventListener('click', this.onButtonClick.bind(this));
  }

  initPages() {
    this.sliderItemsToShow = Array.from(this.sliderItems).filter(element => element.clientWidth > 0);
    if (this.sliderItemsToShow.length < 2) return;
    this.sliderItemOffset = this.sliderItemsToShow[1].offsetLeft - this.sliderItemsToShow[0].offsetLeft;
    this.slidesPerPage = Math.floor((this.slider.clientWidth - this.sliderItemsToShow[0].offsetLeft) / this.sliderItemOffset);    
    this.totalPages = this.sliderItemsToShow.length - this.slidesPerPage + 1;
    this.update();
  }

  resetPages() {
    this.sliderItems = this.querySelectorAll('[id^="Slide-"]');
    this.initPages();
  }

  update() {
    // Temporarily prevents unneeded updates resulting from variant changes
    // This should be refactored as part of https://github.com/Shopify/dawn/issues/2057
    if (!this.slider || !this.nextButton) return;

    const previousPage = this.currentPage;
    this.currentPage = Math.round(this.slider.scrollLeft / this.sliderItemOffset) + 1;
    
    if (this.currentPageElement && this.pageTotalElement) {
      this.currentPageElement.textContent = this.currentPage;
      this.pageTotalElement.textContent = this.totalPages;
    }
    
    if (this.currentPage != previousPage) {
      this.dispatchEvent(new CustomEvent('slideChanged', { detail: {
        currentPage: this.currentPage,
        currentElement: this.sliderItemsToShow[this.currentPage - 1]
      }}));
    }

    if (this.enableSliderLooping) return;

    if (this.isSlideVisible(this.sliderItemsToShow[0]) && this.slider.scrollLeft === 0) {
      this.prevButton.setAttribute('disabled', 'disabled');
    } else {
      this.prevButton.removeAttribute('disabled');
    }

    if (this.isSlideVisible(this.sliderItemsToShow[this.sliderItemsToShow.length - 1])) {
      this.nextButton.setAttribute('disabled', 'disabled');
    } else {
      this.nextButton.removeAttribute('disabled');
    }
  }

  isSlideVisible(element, offset = 0) {
    const lastVisibleSlide = this.slider.clientWidth + this.slider.scrollLeft - offset;
    return (element.offsetLeft + element.clientWidth) <= lastVisibleSlide && element.offsetLeft >= this.slider.scrollLeft;
  }

  onButtonClick(event) {
    event.preventDefault();
    const step = event.currentTarget.dataset.step || 1;
    this.slideScrollPosition = event.currentTarget.name === 'next' ? this.slider.scrollLeft + (step * this.sliderItemOffset) : this.slider.scrollLeft - (step * this.sliderItemOffset);
    this.slider.scrollTo({
      left: this.slideScrollPosition
    });
  }
}

customElements.define('slider-component', SliderComponent);

class SlideshowComponent extends SliderComponent {
  constructor() {
    super();
    this.sliderControlWrapper = this.querySelector('.slider-buttons');
    this.enableSliderLooping = true;

    if (!this.sliderControlWrapper) return;

    this.sliderFirstItemNode = this.slider.querySelector('.slideshow__slide');
    if (this.sliderItemsToShow.length > 0) this.currentPage = 1;

    this.sliderControlLinksArray = Array.from(this.sliderControlWrapper.querySelectorAll('.slider-counter__link'));
    this.sliderControlLinksArray.forEach(link => link.addEventListener('click', this.linkToSlide.bind(this)));
    this.slider.addEventListener('scroll', this.setSlideVisibility.bind(this));
    this.setSlideVisibility();
    
    if (this.slider.getAttribute('data-autoplay') === 'true') this.setAutoPlay();
  }

  setAutoPlay() {
    this.sliderAutoplayButton = this.querySelector('.slideshow__autoplay');
    this.autoplaySpeed = this.slider.dataset.speed * 1000;
    this.sliderAutoplayButton.addEventListener('click', this.autoPlayToggle.bind(this));
    this.addEventListener('mouseover', this.focusInHandling.bind(this));
    this.addEventListener('mouseleave', this.focusOutHandling.bind(this));
    this.addEventListener('focusin', this.focusInHandling.bind(this));
    this.addEventListener('focusout', this.focusOutHandling.bind(this));
    this.play();
    this.autoplayButtonIsSetToPlay = true;
  }

  onButtonClick(event) {
    super.onButtonClick(event);
    const isFirstSlide = this.currentPage === 1;
    const isLastSlide = this.currentPage === this.sliderItemsToShow.length;
    if (!isFirstSlide && !isLastSlide) return;
    if (isFirstSlide && event.currentTarget.name === 'previous') {
      this.slideScrollPosition = this.slider.scrollLeft + this.sliderFirstItemNode.clientWidth * this.sliderItemsToShow.length;
    } else if (isLastSlide && event.currentTarget.name === 'next') {
      this.slideScrollPosition = 0;
    }
    this.slider.scrollTo({
      left: this.slideScrollPosition
    });
  }

  update() {
    super.update();
    this.sliderControlButtons = this.querySelectorAll('.slider-counter__link');
    this.prevButton.removeAttribute('disabled');

    if (!this.sliderControlButtons.length) return;

    this.sliderControlButtons.forEach(link => {
      link.classList.remove('slider-counter__link--active');
      link.removeAttribute('aria-current');
    });
    this.sliderControlButtons[this.currentPage - 1].classList.add('slider-counter__link--active');
    this.sliderControlButtons[this.currentPage - 1].setAttribute('aria-current', true);
  }

  autoPlayToggle() {
    this.togglePlayButtonState(this.autoplayButtonIsSetToPlay);
    this.autoplayButtonIsSetToPlay ? this.pause() : this.play();
    this.autoplayButtonIsSetToPlay = !this.autoplayButtonIsSetToPlay;
  }

  focusOutHandling(event) {
    const focusedOnAutoplayButton = event.target === this.sliderAutoplayButton || this.sliderAutoplayButton.contains(event.target);
    if (!this.autoplayButtonIsSetToPlay || focusedOnAutoplayButton) return;
    this.play();
  }

  focusInHandling(event) {
    const focusedOnAutoplayButton = event.target === this.sliderAutoplayButton || this.sliderAutoplayButton.contains(event.target);
    if (focusedOnAutoplayButton && this.autoplayButtonIsSetToPlay) {
      this.play();
    } else if (this.autoplayButtonIsSetToPlay) {
      this.pause();
    }
  }

  play() {
    this.slider.setAttribute('aria-live', 'off');
    clearInterval(this.autoplay);
    this.autoplay = setInterval(this.autoRotateSlides.bind(this), this.autoplaySpeed);
  }

  pause() {
    this.slider.setAttribute('aria-live', 'polite');
    clearInterval(this.autoplay);
  }
 
  connectedCallback() {
    const handleIntersection = (entries, observer) => {
      const thisSlider = this.slider;
      if(thisSlider.getAttribute('data-slides-count') > 1) {
        if (!entries[0].isIntersecting) {
          this.pause();
        } else {
          this.play();
        }
      }
    }
    new IntersectionObserver(handleIntersection.bind(this)).observe(this);
  }

  togglePlayButtonState(pauseAutoplay) {
    if (pauseAutoplay) {
      this.sliderAutoplayButton.classList.add('slideshow__autoplay--paused');
      this.sliderAutoplayButton.setAttribute('aria-label', window.accessibilityStrings.playSlideshow);
    } else {
      this.sliderAutoplayButton.classList.remove('slideshow__autoplay--paused');
      this.sliderAutoplayButton.setAttribute('aria-label', window.accessibilityStrings.pauseSlideshow);
    }
  }

  autoRotateSlides() {
    const slideScrollPosition = this.currentPage === this.sliderItems.length ? 0 : this.slider.scrollLeft + this.slider.querySelector('.slideshow__slide').clientWidth;
    this.slider.scrollTo({
      left: slideScrollPosition
    });
  }

  setSlideVisibility() {
    this.sliderItemsToShow.forEach((item, index) => {
      const linkElements = item.querySelectorAll('a');
      if (index === this.currentPage - 1) {
        if (linkElements.length) linkElements.forEach(button => {
          button.removeAttribute('tabindex');
        });
        item.setAttribute('aria-hidden', 'false');
        item.removeAttribute('tabindex');
      } else {
        if (linkElements.length) linkElements.forEach(button => {
          button.setAttribute('tabindex', '-1');
        });
        item.setAttribute('aria-hidden', 'true');
        item.setAttribute('tabindex', '-1');
        
      }
    });
  }

  linkToSlide(event) {
    event.preventDefault();
    const slideScrollPosition = this.slider.scrollLeft + this.sliderFirstItemNode.clientWidth * (this.sliderControlLinksArray.indexOf(event.currentTarget) + 1 - this.currentPage);
    this.slider.scrollTo({
      left: slideScrollPosition
    });
  }
}

customElements.define('slideshow-component', SlideshowComponent);

class DeferredMedia extends HTMLElement {
  constructor() {
    super();
    const poster = this.querySelector('[id^="Deferred-Poster-"]');
    if (!poster) return;
    poster.addEventListener('click', this.loadContent.bind(this));
  }

  loadContent(focus = true) {
    window.pauseAllMedia();
    if (!this.getAttribute('loaded') && this.querySelectorAll('template').length > 0) {
      const content = document.createElement('div');
      content.appendChild(this.querySelector('template').content.firstElementChild.cloneNode(true));

      this.setAttribute('loaded', true);
      const deferredElement = this.appendChild(content.querySelector('video, model-viewer, iframe, img'));
      if (focus) deferredElement.focus();
    }
  }
  
  connectedCallback() {
    const handleIntersection = (entries, observer) => {
      const Parent = this.parentNode;
      const Deferred = entries[0];
      if (Deferred.isIntersecting && !Deferred.target.classList.contains('media-video')) {
        LoadDeferredMediaImg(Deferred.target);
      }
    }

    new IntersectionObserver(handleIntersection.bind(this)).observe(this);
  }
}

customElements.define('deferred-media', DeferredMedia);

function addLoadEvent(func) {
  var oldonload = window.onload;
  if (typeof window.onload != 'function') {
    window.onload = func;
  } else {
    window.onload = function() {
      if (oldonload) { oldonload(); }
      func(); 
    }
  }
}

addLoadEvent(ProductCardHoverandColors);

addLoadEvent(AddBodyClass);

function DeferredMediaImg(label) {
  const Product = (label instanceof Element) ? label.closest('.product') : this.closest('.product');
  const NewColor = (label instanceof Element) ? label.getAttribute('data-color') : this.getAttribute('data-color');
  const MediaGallery = Product.querySelector('.product__media-gallery').setAttribute('data-color',NewColor);
  const CardVariations = Product.querySelector('.card-variations');
  if( Product.querySelectorAll('.deferred-media').length > 0) {
    const thisNextArrow = new MediaArrow();
    thisNextArrow.GoTo(0,Product,false);
    CardVariations.querySelectorAll('.swatche-couleur').forEach((Swatche) => {
      Swatche.classList.remove('checked');
    });
    if(label instanceof Element) {
      label.querySelector('.swatche-couleur').classList.add('checked');
    } else {
      this.querySelector('.swatche-couleur').classList.add('checked');
    }
  }
}

function LoadDeferredMediaImg(media) {
  if(media != undefined && !media.classList.contains('loaded')) {
    const MediaImg = media.querySelector('img');
    setTimeout(function() {
      MediaImg.setAttribute('srcset',MediaImg.getAttribute('data-srcset'));
      MediaImg.setAttribute('src',MediaImg.getAttribute('data-src'));
      if(MediaImg.getAttribute('width') !== undefined) {
        MediaImg.setAttribute('sizes',MediaImg.getAttribute('width'));
      }
    },100);
    media.classList.add('loaded');
  }
}

function GoToNext(product) {
  const MediaWrapper = (product instanceof Element) ? product.querySelector('.product__media-list') : this.querySelector('.product__media-list');
  if(MediaWrapper != null) {
    MediaWrapper.scrollLeft = MediaWrapper.offsetWidth;
  }
}

function ResetToFirst(product) {
  const MediaWrapper = (product instanceof Element) ? product.querySelector('.product__media-list') : this.querySelector('.product__media-list');
  if(MediaWrapper != null) {
    setTimeout( function() {
      MediaWrapper.scrollLeft = 0;
    },100);
  }
}

function ProductCardHoverandColors() {
  document.querySelectorAll('.color-swatche-label').forEach((label) => {
    if(!label.classList.contains('no-link')) {
      label.addEventListener('click', DeferredMediaImg.bind(label));
    }
  });
  document.querySelectorAll('.product.product-card-wrapper').forEach((product) => {
    product.addEventListener('mouseenter', GoToNext.bind(product));
    product.addEventListener('mouseleave', ResetToFirst.bind(product));
  });
}

function AddBodyClass() {
  document.body.classList.add('loaded');
}

class MediaArrow extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('click', this.ClickArrow.bind(this));
  }

  ClickArrow(arrow) {
    const Product = this.closest('.product');
    const Direction = this.getAttribute('data-direction');
    const MediaWrapper = Product.querySelector('.product__media-list');
    const MediaPos = parseInt(MediaWrapper.getAttribute('data-media-pos'));
    this.GoTo(null,Product,Direction);
  }

  GoTo(Pos,Product,Direction) {
    const MediaWrapper = Product.querySelector('.product__media-list');
    const Medias = MediaWrapper.querySelectorAll('.product__media-item');
    const MediaW = MediaWrapper.offsetWidth;
    const ShowedMediaCount = Array.prototype.slice.call(Medias).filter(function(media) { return getComputedStyle(media).display !== "none" });
    const MediatoShow = Medias != ShowedMediaCount ? ShowedMediaCount.length : Medias.length;
    const ScrollLeftPos = (Pos) ? Math.round(Pos * MediaW) : 0;
    if(Pos != null) {
      MediaWrapper.scrollLeft = ScrollLeftPos;
    } else {
      if(Direction) {
        if(Direction == 'Next') {
          if( Math.round(MediaWrapper.scrollLeft + MediaW) >= Math.round(MediatoShow * MediaW) ) {
            MediaWrapper.scrollLeft = 0;
          } else {
            MediaWrapper.scrollLeft += MediaW;
          }
        } else {
          if( Math.round(MediaWrapper.scrollLeft - MediaW) < 0 ) {
            MediaWrapper.scrollLeft = Math.round(MediatoShow * MediaW);
          } else {
            MediaWrapper.scrollLeft -= MediaW;
          }
        }
      } 
    }
  }
}

customElements.define('media-arrow', MediaArrow);

class StickyObserver extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    const handleIntersection = (entries, observer) => {
      const Parent = this.parentNode;
      if (!entries[0].isIntersecting) {
        Parent.classList.add('is-sticky');
      } else {
        Parent.classList.remove('is-sticky');
      }
    }

    new IntersectionObserver(handleIntersection.bind(this)).observe(this);
  }
}

customElements.define('sticky-observer', StickyObserver);

class TitleAnimate extends HTMLElement {
  constructor() {
    super();
    var countup = false;
    if(this.classList.contains('marqee')) {
      const title = this.querySelector('.custom-title');
      const window_width = window.innerWidth;
      const title_width = title.offsetWidth;
      let need_els = Math.floor(window_width / title_width);
      let new_title = "";
      if(need_els !== Infinity) {
        need_els = need_els > 6 ? 6 : need_els;
        for (let ti = 0; ti <= need_els; ti++) {
          new_title += title.outerHTML;
        }
        this.querySelector('.rich-text__heading').innerHTML += new_title;
      }
    }
  }

  connectedCallback() {
    const handleIntersection = (entries, observer) => {
      const Parent = this.parentNode;
      if (!entries[0].isIntersecting) {
        Parent.classList.remove('is-on-screen');
      } else {
        Parent.classList.add('is-on-screen');
        if(this.classList.contains('countup')) {
          this.countUp(this);
        }
        if(this.classList.contains('marqee')) {
          this.textMarqee(this);
        }
      }
    }

    new IntersectionObserver(handleIntersection.bind(this)).observe(this);
  }

  textMarqee() {
    this.classList.add('animate');
  }

  countUp() {
    const animationDuration = 3000;
    const frameDuration = 500 / 60;
    const totalFrames = Math.round( animationDuration / frameDuration );
    const easeOutQuad = t => t * ( 2 - t );
    let frame = 0;
    var countNum = this.getAttribute('data-text').match(/\d+/g);
    var countString = this.getAttribute('data-text').match(/[^0-9]+/g);
    countString = (countString != null) ? countString : "";
    const countTo = parseInt( countNum, 10 );
    const counter = setInterval( () => {
        frame++;
        const progress = easeOutQuad( frame / totalFrames );
        const currentCount = Math.round( countTo * progress );
        if ( parseInt( countNum, 10 ) !== currentCount ) {
            this.querySelector('.count').innerHTML = currentCount.toLocaleString("fr-FR") + countString;
        }
        if ( frame === totalFrames ) {
            this.querySelector('.count').innerHTML = parseInt(countNum).toLocaleString("fr-FR") + countString;
            clearInterval( counter );
        }
    }, this.frameDuration );
  }
}