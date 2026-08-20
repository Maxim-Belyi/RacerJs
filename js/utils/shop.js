import { Storage } from './storage.js';
import { CAR_CATALOG, CAR_CLASSES, getCarById } from './car-catalog.js';

export const UPGRADES = [
  {
    id: 'unlock_magnet',
    type: 'unlock',
    name: 'Магнит монет',
    desc: 'Добавляет на дорогу магниты!',
    price: 300,
  },
  {
    id: 'consumable_life',
    type: 'consumable',
    name: 'Дополнительная жизнь',
    desc: 'Продолжить игру после столкновения (Максимум 3)',
    price: 150,
  }
];

export function initShop() {
  const shopModal = document.querySelector('[data-js-shop-modal]');
  const shopContent = document.querySelector('[data-js-shop-content]');
  const shopCoins = document.querySelector('[data-js-shop-coins]');
  
  const openButtons = document.querySelectorAll('[data-js-open-shop]');
  const closeButton = document.querySelector('[data-js-close-shop]');
  const tabButtons = document.querySelectorAll('[data-js-shop-tab]');

  let activeTab = 'garage';

  openButtons.forEach(btn => btn.addEventListener('click', () => {
    renderShop();
    shopModal.style.display = 'flex';
  }));

  closeButton.addEventListener('click', () => {
    shopModal.style.display = 'none';
  });

  tabButtons.forEach(btn => btn.addEventListener('click', (e) => {
    activeTab = e.target.getAttribute('data-js-shop-tab');
    tabButtons.forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    renderShop();
  }));

  function renderShop() {
    const state = Storage.get();
    shopCoins.innerText = state.totalCoins;
    shopContent.innerHTML = '';

    if (activeTab === 'garage') {
      shopContent.classList.add('shop-modal__content--grid');
      renderGarage(state);
    } else {
      shopContent.classList.remove('shop-modal__content--grid');
      renderUpgrades(state);
    }
  }

  function renderGarage(state) {
    let currentClass = null;

    CAR_CATALOG.forEach(car => {
      if (car.class !== currentClass) {
        currentClass = car.class;
        const clsInfo = CAR_CLASSES[currentClass];
        const titleEl = document.createElement('div');
        titleEl.className = 'shop-category-title';
        titleEl.innerHTML = `
          <span>${clsInfo.label} Class</span>
          <span class="modifier">Скорость x${clsInfo.modifier}</span>
        `;
        shopContent.appendChild(titleEl);
      }

      const el = document.createElement('div');
      
      let isBought = car.free || state.purchasedCars.includes(car.id);
      let isSelected = state.selectedCar === car.id;
      let buttonText = car.free ? 'Бесплатно' : `Купить (${car.price})`;
      let canAfford = state.totalCoins >= car.price;
      let buttonClass = 'shop-item__button';
      let disabled = !canAfford;

      if (isBought) {
        buttonText = isSelected ? 'Выбрано' : 'Выбрать';
        disabled = isSelected;
        canAfford = true;
        if (isSelected) buttonClass += ' shop-item__button--selected';
      }

      el.className = `shop-item shop-item--card ${isSelected ? 'shop-item--selected' : ''}`;
      
      const iconHtml = car.img 
        ? `<img src="./images/${car.img}" class="shop-item__icon" alt="${car.name}">`
        : `<img src="./images/car.png" class="shop-item__icon" alt="Default">`;

      el.innerHTML = `
        <div class="shop-item__info">
            ${iconHtml}
            <div class="shop-item__text">
                <span class="shop-item__name">${car.name}</span>
            </div>
        </div>
        <div class="shop-item__action">
            <button class="${buttonClass}" ${disabled ? 'disabled' : ''}>${buttonText}</button>
        </div>
      `;

      const btn = el.querySelector('button');
      btn.addEventListener('click', () => {
        if (isBought) {
          state.selectedCar = car.id;
          Storage.save(state);
          renderShop();
          applySkin(car.id);
        } else if (Storage.spendCoins(car.price)) {
          state.purchasedCars.push(car.id);
          state.selectedCar = car.id;
          Storage.save(state);
          renderShop();
          applySkin(car.id);
        }
      });

      shopContent.appendChild(el);
    });
  }

  function renderUpgrades(state) {
    UPGRADES.forEach(item => {
      const el = document.createElement('div');
      el.className = 'shop-item';
      
      let isBought = false;
      let buttonText = `Купить (${item.price})`;
      let canAfford = state.totalCoins >= item.price;
      let buttonClass = 'shop-item__button';
      let disabled = !canAfford;

      if (item.id === 'unlock_magnet') {
        isBought = state.hasMagnet;
        if (isBought) {
          buttonText = 'Разблокировано';
          disabled = true;
        }
      } else if (item.id === 'consumable_life') {
        buttonText = `Купить (${item.price}) [Имеется: ${state.extraLives}]`;
        if (state.extraLives >= 3) {
            buttonText = `Максимум [Имеется: 3]`;
            disabled = true;
        }
      }

      const iconHtml = `<div class="shop-item__icon" style="display:flex;align-items:center;justify-content:center;font-size:2rem;">${item.type === 'unlock' ? '🧲' : '❤️'}</div>`;

      el.innerHTML = `
        <div class="shop-item__info">
            ${iconHtml}
            <div class="shop-item__text">
                <span class="shop-item__name">${item.name}</span>
                <span class="shop-item__desc">${item.desc}</span>
            </div>
        </div>
        <div class="shop-item__action">
            <button class="${buttonClass}" ${disabled ? 'disabled' : ''}>${buttonText}</button>
        </div>
      `;

      const btn = el.querySelector('button');
      btn.addEventListener('click', () => {
        if (Storage.spendCoins(item.price)) {
          if (item.id === 'unlock_magnet') {
            state.hasMagnet = true;
          } else if (item.id === 'consumable_life') {
            state.extraLives++;
          }
          Storage.save(state);
          renderShop();
        }
      });

      shopContent.appendChild(el);
    });
  }
}

export function applySkin(carId) {
    const carContainer = document.querySelector('.car__blue');
    if (!carContainer) return;
    
    const carImg = carContainer.querySelector('img:not(.car-magnet-indicator)');
    if (!carImg) return;

    const carData = getCarById(carId);
    
    if (carData.img) {
      carImg.src = `./images/${carData.img}`;
      carContainer.style.setProperty('--car-filter', 'none');
    } else {
      carImg.src = `./images/car.png`;
      carContainer.style.setProperty('--car-filter', 'none');
    }
}
