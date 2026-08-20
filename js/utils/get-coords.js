  export function getCoords(element) {
    const matrix = window.getComputedStyle(element).transform;
    let numericX = 0;
    let numericY = -1000; // Default off-screen so it comes down
    
    if (matrix && matrix !== 'none') {
        const array = matrix.split(",");
        if (array.length >= 6) {
            const y = array[array.length - 1];
            const x = array[array.length - 2];
            const parsedY = parseFloat(y);
            const parsedX = parseFloat(x);
            numericY = isNaN(parsedY) ? numericY : parsedY;
            numericX = isNaN(parsedX) ? numericX : parsedX;
        }
    }

    return { x: numericX, y: numericY };
  }