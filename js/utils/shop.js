import { Storage } from './storage.js';

export const SHOP_ITEMS = [
  {
    id: 'skin_red',
    type: 'skin',
    name: 'Red Car',
    desc: 'Stylish red paint job',
    price: 50,
    cssClass: 'shop-item__icon--red',
    carColor: 'red',
  },
  {
    id: 'skin_green',
    type: 'skin',
    name: 'Green Car',
    desc: 'Eco-friendly green paint',
    price: 100,
    cssClass: 'shop-item__icon--green',
    carColor: 'green',
  },
  {
    id: 'skin_gold',
    type: 'skin',
    name: 'Gold Car',
    desc: 'Premium gold finish',
    price: 250,
    cssClass: 'shop-item__icon--gold',
    carColor: 'gold',
  },
  {
    id: 'upgrade_speed',
    type: 'upgrade',
    name: 'Engine Tuning',
    desc: 'Increases maneuverability (Left/Right speed)',
    price: 150,
  },
  {
    id: 'consumable_life',
    type: 'consumable',
    name: 'Extra Life',
    desc: 'Continue game after a crash (Max 3)',
    price: 100,
  },
  {
    id: 'unlock_magnet',
    type: 'unlock',
    name: 'Coin Magnet',
    desc: 'Spawns magnets on the road. Collecting it gives x3 coins!',
    price: 300,
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
      let buttonText = `Buy (${item.price})`;
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
        isBought = state.speedLevel > 1; // Simplify to 1 upgrade for now
        if (isBought) {
          buttonText = 'Maxed';
          disabled = true;
        }
      } else if (item.type === 'unlock' && item.id === 'unlock_magnet') {
        isBought = state.hasMagnet;
        if (isBought) {
          buttonText = 'Unlocked';
          disabled = true;
        }
      } else if (item.type === 'consumable' && item.id === 'consumable_life') {
        buttonText = `Buy (${item.price}) [Owned: ${state.extraLives}]`;
        if (state.extraLives >= 3) {
            buttonText = `Maxed [Owned: 3]`;
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
      // Select skin
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
    const carImg = document.querySelector('.car__blue img');
    if (!carImg) return;
    
    // Reset filters
    carImg.style.filter = 'none';
    
    if (carColor === 'red') {
        carImg.style.filter = 'hue-rotate(150deg) saturate(1.5)';
    } else if (carColor === 'green') {
        carImg.style.filter = 'hue-rotate(270deg) saturate(1.2)';
    } else if (carColor === 'gold') {
        carImg.style.filter = 'sepia(1) saturate(5) hue-rotate(-20deg)';
    }
}
