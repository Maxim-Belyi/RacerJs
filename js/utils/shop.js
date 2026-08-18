import { Storage } from './storage.js';

export const SHOP_ITEMS = [
  {
    id: 'skin_red',
    type: 'skin',
    name: 'Red Car',
    desc: 'Stylish red paint job',
    price: 1,
    cssClass: 'shop-item__icon--red',
    carColor: 'red',
  },
  {
    id: 'skin_green',
    type: 'skin',
    name: 'Green Car',
    desc: 'Eco-friendly green paint',
    price: 1,
    cssClass: 'shop-item__icon--green',
    carColor: 'green',
  },
  {
    id: 'skin_gold',
    type: 'skin',
    name: 'Gold Car',
    desc: 'Премиум',
    price: 1,
    cssClass: 'shop-item__icon--gold',
    carColor: 'gold',
  },
  {
    id: 'upgrade_speed',
    type: 'upgrade',
    name: 'Улучшение двигателя',
    desc: 'Увеличивает манёвренность',
    price: 1,
  },
  {
    id: 'consumable_life',
    type: 'consumable',
    name: 'Дополнительная жизнь',
    desc: 'Продолжить игру после столкновения (Максимум 3)',
    price: 1,
  },
  {
    id: 'unlock_magnet',
    type: 'unlock',
    name: 'Магнит монет',
    desc: 'Добавляет на дорогу магниты!',
    price: 1,
  }
];

export function initShop() {
  const shopModal = document.querySelector('[data-js-shop-modal]');
  const shopContent = document.querySelector('[data-js-shop-content]');
  const shopCoins = document.querySelector('[data-js-shop-coins]');
  
  const openButtons = document.querySelectorAll('[data-js-open-shop]');
  const closeButton = document.querySelector('[data-js-close-shop]');

  openButtons.forEach(btn => btn.addEventListener('click', () => {
    renderShop();
    shopModal.style.display = 'flex';
  }));

  closeButton.addEventListener('click', () => {
    shopModal.style.display = 'none';
  });

  function renderShop() {
    const state = Storage.get();
    shopCoins.innerText = state.totalCoins;
    shopContent.innerHTML = '';

    SHOP_ITEMS.forEach(item => {
      const el = document.createElement('div');
      el.className = 'shop-item';
      
      let isBought = false;
      let isSelected = false;
      let buttonText = `Купить (${item.price})`;
      let canAfford = state.totalCoins >= item.price;
      let buttonClass = 'shop-item__button';
      let disabled = !canAfford;

      if (item.type === 'skin') {
        isBought = state.purchasedCars.includes(item.carColor);
        isSelected = state.selectedCar === item.carColor;
        
        if (isBought) {
          buttonText = isSelected ? 'Selected' : 'Select';
          disabled = isSelected;
          canAfford = true;
          if (isSelected) buttonClass += ' shop-item__button--selected';
        }
      } else if (item.type === 'upgrade' && item.id === 'upgrade_speed') {
        isBought = state.speedLevel > 1; 
        if (isBought) {
          buttonText = 'Максимум';
          disabled = true;
        }
      } else if (item.type === 'unlock' && item.id === 'unlock_magnet') {
        isBought = state.hasMagnet;
        if (isBought) {
          buttonText = 'Разблокировано';
          disabled = true;
        }
      } else if (item.type === 'consumable' && item.id === 'consumable_life') {
        buttonText = `Купить (${item.price}) [Имеется: ${state.extraLives}]`;
        if (state.extraLives >= 3) {
            buttonText = `Максимум [Имеется: 3]`;
            disabled = true;
        }
      }

      const iconHtml = item.type === 'skin' 
        ? `<img src="./images/car.png" class="shop-item__icon ${item.cssClass || ''}" alt="Car">`
        : `<div class="shop-item__icon" style="display:flex;align-items:center;justify-content:center;font-size:2rem;">${getIconForType(item.type)}</div>`;

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
      btn.addEventListener('click', () => handlePurchase(item, isBought));

      shopContent.appendChild(el);
    });
  }

  function getIconForType(type) {
      if (type === 'upgrade') return '⚙️';
      if (type === 'consumable') return '❤️';
      if (type === 'unlock') return '🧲';
      return '🛒';
  }

  function handlePurchase(item, isBought) {
    const state = Storage.get();

    if (item.type === 'skin' && isBought) {
      state.selectedCar = item.carColor;
      Storage.save(state);
      renderShop();
      applySkin(item.carColor);
      return;
    }

    if (Storage.spendCoins(item.price)) {
      if (item.type === 'skin') {
        state.purchasedCars.push(item.carColor);
        state.selectedCar = item.carColor;
      } else if (item.id === 'upgrade_speed') {
        state.speedLevel++;
      } else if (item.id === 'unlock_magnet') {
        state.hasMagnet = true;
      } else if (item.id === 'consumable_life') {
        state.extraLives++;
      }
      Storage.save(state);
      renderShop();
      if (item.type === 'skin') applySkin(item.carColor);
    }
  }
}

export function applySkin(carColor) {
    const carContainer = document.querySelector('.car__blue');
    if (!carContainer) return;
    
    carContainer.style.setProperty('--car-filter', 'none');
    
    if (carColor === 'red') {
        carContainer.style.setProperty('--car-filter', 'hue-rotate(150deg) saturate(1.5)');
    } else if (carColor === 'green') {
        carContainer.style.setProperty('--car-filter', 'hue-rotate(270deg) saturate(1.2)');
    } else if (carColor === 'gold') {
        carContainer.style.setProperty('--car-filter', 'sepia(1) saturate(5) hue-rotate(-20deg)');
    }
}
