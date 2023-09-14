const { roundNumber } = require('./util');

// const precision = Math.pow(10, 3);

class KD {
  constructor(value, decimals, lowestDenomination) {
    this.decimals = parseInt(decimals, 10);
    this.lowestDenomination = parseFloat(lowestDenomination);
    if (!this.decimals) {
      throw new Error('decimals is required!');
    }
    if (!this.lowestDenomination) {
      throw new Error('lowestDenomination is required!');
    }
    this.precision = Math.pow(10, this.decimals);
    if (value) {
      this.value = parseFloat(parseFloat(value).toFixed(this.decimals));
      this.intValue = Math.round(this.value * this.precision);
    } else {
      this.value = 0;
      this.intValue = 0;
    }
  }

  add(input) {
    return toKD(
      this.parse(input) + this.intValue,
      this.decimals,
      this.lowestDenomination,
      this.precision
    );
  }

  sub(input) {
    return toKD(
      this.intValue - this.parse(input),
      this.decimals,
      this.lowestDenomination,
      this.precision
    );
  }

  mult(num) {
    return toKD(
      this.intValue * Number(num),
      this.decimals,
      this.lowestDenomination,
      this.precision
    );
  }

  div(num) {
    return toKD(
      this.intValue / Number(num),
      this.decimals,
      this.lowestDenomination,
      this.precision
    );
  }

  // KD -> intValue
  // Number -> * 1000
  // string -> Number(string) * 1000
  parse(input) {
    if (input instanceof KD) {
      return input.intValue;
    }

    if (input instanceof Number) {
      return input * this.precision;
    }

    return (
      parseFloat(parseFloat(input).toFixed(this.decimals)) * this.precision
    );
  }

  toString() {
    return this.value.toFixed(this.decimals);
  }

  round() {
    let value = roundNumber(this.value, this.decimals);
    value *= this.precision;
    const x = this.lowestDenomination * this.precision;
    return toKD(
      Math.round(value / x) * x,
      this.decimals,
      this.lowestDenomination,
      this.precision
    );
  }

  toCurrencyValue() {
    return this.round().value.toFixed(this.decimals);
  }
}

function toKD(intValue, decimals, lowestDenomination, precision) {
  return new KD(intValue / precision, decimals, lowestDenomination);
}

module.exports = KD;
