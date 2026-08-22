import { getCoords } from "./get-coords.js";

export function createElementInfo(element) {
    const w = element.clientWidth;
    const h = element.clientHeight;
    return {
      width: w > 0 ? w : 50,
      height: h > 0 ? h : 100,
      coords: getCoords(element),
      visible: true,
    };
  }