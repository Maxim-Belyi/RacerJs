export function hasCollision(elem1Info, elem2Info) {
    // Y-axis collision (using 80% of height centered)
    const elem1CenterY = elem1Info.coords.y + elem1Info.height / 2;
    const elem1YTop = elem1CenterY - elem1Info.height * 0.4;
    const elem1YBottom = elem1CenterY + elem1Info.height * 0.4;

    const elem2CenterY = elem2Info.coords.y + elem2Info.height / 2;
    const elem2YTop = elem2CenterY - elem2Info.height * 0.4;
    const elem2YBottom = elem2CenterY + elem2Info.height * 0.4;

    // X-axis collision (using 80% of width centered)
    const elem1CenterX = elem1Info.coords.x + elem1Info.width / 2;
    const elem1XLeft = elem1CenterX - elem1Info.width * 0.4;
    const elem1XRight = elem1CenterX + elem1Info.width * 0.4;

    const elem2CenterX = elem2Info.coords.x + elem2Info.width / 2;
    const elem2XLeft = elem2CenterX - elem2Info.width * 0.4;
    const elem2XRight = elem2CenterX + elem2Info.width * 0.4;

    if (elem1YTop > elem2YBottom || elem1YBottom < elem2YTop) {
      return false;
    }

    if (elem1XLeft > elem2XRight || elem1XRight < elem2XLeft) {
      return false;
    }

    return true;
  }