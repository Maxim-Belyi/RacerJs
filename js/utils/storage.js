const STORAGE_KEY = 'racerjs_save';

const defaultState = {
  totalCoins: 0,
  selectedCar: 'default',
  purchasedCars: ['default'], 
  hasMagnet: false,
  extraLives: 0,
  speedLevel: 1,
  gameLevel: 1
};

export const Storage = {
  get() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.selectedCar === 'blue') parsed.selectedCar = 'default';
        if (parsed.purchasedCars) {
          parsed.purchasedCars = parsed.purchasedCars.map(c => c === 'blue' ? 'default' : c);
        }
        return { ...defaultState, ...parsed };
      }
    } catch (e) {
      console.error('Error reading from localStorage', e);
    }
    return { ...defaultState };
  },

  save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Error saving to localStorage', e);
    }
  },

  addCoins(amount) {
    const state = this.get();
    state.totalCoins += amount;
    this.save(state);
  },

  spendCoins(amount) {
    const state = this.get();
    if (state.totalCoins >= amount) {
      state.totalCoins -= amount;
      this.save(state);
      return true;
    }
    return false;
  }
};
