export const CAR_CLASSES = {
  default: { label: 'Default', modifier: 1.0,  color: '#4a90d9' },
  porshe:  { label: 'Porsche', modifier: 1.0,  color: '#9e9e9e' },
  race:    { label: 'Race',    modifier: 1.1,  color: '#f44336' },
  sport:   { label: 'Sport',  modifier: 1.2,  color: '#ff9800' },
};

export const CAR_CATALOG = [
  { id: 'default',             class: 'default', name: 'Blue',       img: null,                           price: 0,   free: true },

  { id: 'car_porse_gold',      class: 'porshe',  name: 'Gold',       img: 'cars/car_porse_gold.png',      price: 50  },
  { id: 'car_porshe_black2',   class: 'porshe',  name: 'Black',      img: 'cars/car_porshe_black2.png',   price: 50  },
  { id: 'car_porshe_silver',   class: 'porshe',  name: 'Silver',     img: 'cars/car_porshe_silver.png',   price: 50  },

  { id: 'car_race_red',        class: 'race',    name: 'Red',        img: 'cars/car_race_red.png',        price: 150 },
  { id: 'car_race_blue',       class: 'race',    name: 'Blue',       img: 'cars/car_race_blue.png',       price: 150 },
  { id: 'car_race_green',      class: 'race',    name: 'Green',      img: 'cars/car_race_green.png',      price: 150 },
  { id: 'car_race_yellow',     class: 'race',    name: 'Yellow',     img: 'cars/car_race_yellow.png',     price: 150 },
  { id: 'car_race_orange',     class: 'race',    name: 'Orange',     img: 'cars/car_race_orange.png',     price: 150 },
  { id: 'car_race_black',      class: 'race',    name: 'Black',      img: 'cars/car_race_black.png',      price: 150 },
  { id: 'car_race_red2',       class: 'race',    name: 'Dark Red',   img: 'cars/car_race_red2.png',       price: 150 },

  { id: 'car_sport_black',     class: 'sport',   name: 'Black',      img: 'cars/car_sport_black.png',     price: 300 },
  { id: 'car_sport_gold',      class: 'sport',   name: 'Gold',       img: 'cars/car_sport_gold.png',      price: 300 },
  { id: 'car_sport_silver',    class: 'sport',   name: 'Silver',     img: 'cars/car_sport_silver.png',    price: 300 },
];

export function getCarById(id) {
  return CAR_CATALOG.find(c => c.id === id) ?? CAR_CATALOG[0];
}

export function getCarClass(id) {
  const car = getCarById(id);
  return CAR_CLASSES[car.class] ?? CAR_CLASSES.default;
}
