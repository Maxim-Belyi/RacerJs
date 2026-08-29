export const CAR_CLASSES = {
  default: {
    label: "Стандарт",
    desc: "Базовая комплектация",
    modifier: 1.0,
    color: "#4a90d9",
  },
  porshe: {
    label: "Порше",
    desc: "+10% скорость и маневренность",
    modifier: 1.1,
    color: "#9e9e9e",
  },
  race: {
    label: "Гоночные",
    desc: "+20% скорость и маневренность",
    modifier: 1.2,
    color: "#f44336",
  },
  sport: {
    label: "Спорткары",
    desc: "+30% скорость и маневренность",
    modifier: 1.3,
    color: "#ff9800",
  },
};

export const CAR_CATALOG = [
  {
    id: "default",
    class: "default",
    name: "Синяя",
    img: null,
    price: 0,
    free: true,
  },

  {
    id: "car_porse_gold",
    class: "porshe",
    name: "Золотой",
    img: "cars/car_porse_gold.png",
    price: 150,
  },
  {
    id: "car_porshe_black2",
    class: "porshe",
    name: "Черный",
    img: "cars/car_porshe_black2.png",
    price: 150,
  },
  {
    id: "car_porshe_silver",
    class: "porshe",
    name: "Серебристый",
    img: "cars/car_porshe_silver.png",
    price: 150,
  },

  {
    id: "car_race_red",
    class: "race",
    name: "Красный",
    img: "cars/car_race_red.png",
    price: 250,
  },
  {
    id: "car_race_blue",
    class: "race",
    name: "Синий",
    img: "cars/car_race_blue.png",
    price: 250,
  },
  {
    id: "car_race_green",
    class: "race",
    name: "Зеленый",
    img: "cars/car_race_green.png",
    price: 250,
  },
  {
    id: "car_race_yellow",
    class: "race",
    name: "Желтый",
    img: "cars/car_race_yellow.png",
    price: 250,
  },
  {
    id: "car_race_orange",
    class: "race",
    name: "Оранжевый",
    img: "cars/car_race_orange.png",
    price: 250,
  },
  {
    id: "car_race_black",
    class: "race",
    name: "Черный",
    img: "cars/car_race_black.png",
    price: 250,
  },

  {
    id: "car_sport_black",
    class: "sport",
    name: "Черный",
    img: "cars/car_sport_black.png",
    price: 450,
  },
  {
    id: "car_sport_gold",
    class: "sport",
    name: "Золотой",
    img: "cars/car_sport_gold.png",
    price: 450,
  },
  {
    id: "car_sport_silver",
    class: "sport",
    name: "Серебристый",
    img: "cars/car_sport_silver.png",
    price: 450,
  },
];

export function getCarById(id) {
  return CAR_CATALOG.find((c) => c.id === id) ?? CAR_CATALOG[0];
}

export function getCarClass(id) {
  const car = getCarById(id);
  return CAR_CLASSES[car.class] ?? CAR_CLASSES.default;
}
