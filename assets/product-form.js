if (!customElements.get('product-form')) {
  customElements.define('product-form', class ProductForm extends HTMLElement {
    constructor() {
      super();

      this.form = this.querySelector('form');
      if( this.querySelector('[name=id]') != null )
        this.form.querySelector('[name=id]').disabled = false;
      this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
      this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
      this.submitButton = this.querySelector('[type="submit"]');
      if (document.querySelector('cart-drawer')) this.submitButton.setAttribute('aria-haspopup', 'dialog');

    }

    FormSerialize(data) {
      let obj = {};
      for (let [key, value] of data) {
        if (obj[key] !== undefined) {
          if (!Array.isArray(obj[key])) {
            obj[key] = [obj[key]];
          }
          obj[key].push(value);
        } else {
          obj[key] = value;
        }
      }
      return obj;
    }

    onSubmitHandler(evt) {      
      evt.preventDefault();
      if (this.submitButton.getAttribute('aria-disabled') === 'true') return;

      this.handleErrorMessage();

      this.submitButton.setAttribute('aria-disabled', true);
      this.submitButton.classList.add('loading');
      this.querySelector('.loading-overlay__spinner').classList.remove('hidden');

      var fetchRoutes = `${routes.cart_add_url}`;
      const formData = new FormData(this.form);
       
      const config = fetchConfig('javascript');
      config.headers['X-Requested-With'] = 'XMLHttpRequest';
      delete config.headers['Content-Type']

      var itemsData = [];
      var i = 0;
      for (const [key, value] of formData) {
        if(key.includes('items_qty') && value >= 1) {
          var key_id = key.match(/\[(.*?)\]/)[1];
          itemsData[i] = new Object();
          itemsData[i] = { id: formData.get('items_id[' + key_id + ']'), quantity: value };
          i++;
        }
        if(key.includes('product_options[') && value >= 1) {
          var key_id = key.match(/\[(.*?)\]/)[1];
          if(itemsData && itemsData.length == 0) {
            var title = document.querySelector('[name="items_id[0]"]').getAttribute('data-for-product');
          } else {
            var title = document.querySelector('[name="product_options[' + key_id + ']"]').getAttribute('data-for-product');
          }
          let product_option_details = document.querySelector('#Details-option-content-' + key_id);
          let properties = { 'Produit concerné': title };
          if(product_option_details) {
            product_option_details.querySelectorAll('[name^="product_options_properties"]').forEach((input) => {
              let option_key = input.getAttribute('name');
              let option_key_id = option_key.match(/\[(.*?)\]/)[1];
              properties[option_key_id] = input.value;
            });
          }
          itemsData[i] = new Object();
          itemsData[i] = { id: formData.get('options_id[' + key_id + ']'), quantity: formData.get('global_qty'), properties: properties };
          i++;
        }
      }
      
      if (this.cart) {
        formData.append('sections', this.cart.getSectionsToRender().map((section) => section.id));
        formData.append('sections_url', window.location.pathname);
        this.cart.setActiveElement(document.activeElement);
      }
      config.body = formData;
      

      if(itemsData.length != 0 ) {
        config.method = "POST";
        config.headers = { 'Content-Type': 'application/json' };
        config.body = JSON.stringify({'items': itemsData});
      }

      fetch(fetchRoutes, config)
        .then((response) => {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.indexOf("text/javascript") !== -1) {
            return response.json().then((response) => {
              if (response.status) {
                this.handleErrorMessage(response.description);
      
                const soldOutMessage = this.submitButton.querySelector('.sold-out-message');
                if (!soldOutMessage) return;
                this.submitButton.setAttribute('aria-disabled', true);
                this.submitButton.querySelector('span').classList.add('hidden');
                soldOutMessage.classList.remove('hidden');
                this.error = true;
                return;
              } else if (!this.cart) {
                window.location = window.routes.cart_url;
                return;
              }
              
              if (!this.error) publish(PUB_SUB_EVENTS.cartUpdate, {source: 'product-form'});
              this.error = false;
              const quickAddModal = this.closest('quick-add-modal');
              if (quickAddModal) {
                document.body.addEventListener('modalClosed', () => {
                  setTimeout(() => { this.cart.renderContents(response) });
                }, { once: true });
                quickAddModal.hide(true);
              } else {
                this.cart.renderContents(response);
              }
            })
            .catch((e) => {
              console.error(e);
            })
            .finally(() => {
              if (this.cart && this.cart.classList.contains('is-empty')) this.cart.classList.remove('is-empty');
              if (!this.error) this.submitButton.removeAttribute('aria-disabled');
              this.querySelector('.loading-overlay__spinner').classList.add('hidden');
              this.submitButton.classList.remove('loading');
            });
          } else {
            return response.text().then(text => {
              let new_response = new Object();
              new_response.html = text;
              const sectionInnerHTML = new DOMParser().parseFromString(text, 'text/html');
              const cartDrawer = sectionInnerHTML.getElementById('shopify-section-cart-drawer').outerHTML;
              const cartIconBubble = sectionInnerHTML.getElementById('cart-icon-bubble').outerHTML;
              new_response.sections = { 'cart-drawer' : cartDrawer, 'cart-icon-bubble' : cartIconBubble };
              response = new_response;
              
              if (!this.error) publish(PUB_SUB_EVENTS.cartUpdate, {source: 'product-form'});
              this.error = false;
              const quickAddModal = this.closest('quick-add-modal');
              if (quickAddModal) {
                document.body.addEventListener('modalClosed', () => {
                  setTimeout(() => { this.cart.renderContents(response) });
                }, { once: true });
                quickAddModal.hide(true);
              } else {
                this.cart.renderContents(response);
              }
            })
            .catch((e) => {
              console.error(e);
            })
            .finally(() => {
              if (this.cart && this.cart.classList.contains('is-empty')) this.cart.classList.remove('is-empty');
              if (!this.error) this.submitButton.removeAttribute('aria-disabled');
              this.querySelector('.loading-overlay__spinner').classList.add('hidden');
              this.submitButton.classList.remove('loading');
            });
          }
        });
    }

    handleErrorMessage(errorMessage = false) {
      this.errorMessageWrapper = this.errorMessageWrapper || this.querySelector('.product-form__error-message-wrapper');
      if (!this.errorMessageWrapper) return;
      this.errorMessage = this.errorMessage || this.errorMessageWrapper.querySelector('.product-form__error-message');

      this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);
      
      if (errorMessage) {
        this.errorMessage.textContent = errorMessage;
      }
    }
  });
}
