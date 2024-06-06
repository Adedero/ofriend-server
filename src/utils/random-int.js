const randomInteger = (min, max) => {
  const num = Math.floor(min + Math.random() * max);
  return num;
}

module.exports = randomInteger;