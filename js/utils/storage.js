const STORAGE_KEY = 'racerjs_save';

const defaultState = {
  totalCoins: 0,
  selectedCar: 'blue',
  purchasedCars: ['blue'], 
  hasMagnet: false,
  extraLives: 0,
  speedLevel: 1
};

export const Storage = {
  get() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...defaultState, ...JSON.parse(saved) };
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
