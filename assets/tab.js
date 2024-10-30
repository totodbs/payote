class TabButton extends HTMLElement {
  constructor() {
    super();
    const button = this.querySelector('button');
    button.addEventListener('click', (event) => {
      this.expandTab(event);
      const nextElementToFocus = event.target.closest('.parent-wrap').querySelector('.tab-content-item')
      if (nextElementToFocus && !nextElementToFocus.classList.contains('hidden')) {
        nextElementToFocus.focus();
      }
    });
  }
  expandTab(event) {
    const parentWrap = event.target.closest('.parent-wrap');
    const tabButton = event.target.closest('tab-button');
    const forRow = tabButton.getAttribute('for');
    parentWrap.querySelectorAll('tab-button').forEach(item => item.classList.remove('active'));
    parentWrap.querySelectorAll('.tab-content-item').forEach(item => item.classList.add('hidden'));
    tabButton.classList.add('active');
    parentWrap.querySelector('#'+forRow).classList.remove('hidden');
  }
}

customElements.define('tab-button', TabButton);
