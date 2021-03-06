import test from 'ava';
import { IsExact, assert } from 'conditional-type-checks';

import { signature, Dynamo, guard, conversion } from '../src';

// Create a new, isolated instance of Dynamo.
const dynamo = new Dynamo();

// This is a typical TypeScript class definition
class Complex {

  // A guard is used to detrmine idenity of this class at runtime
  // By default a guard is a test for the containing class
  // in this case this is a test for the Complex type
  @guard()
  static isComplex(a: any): a is Complex {
    return a instanceof Complex;
  }

  // A conversion defines a method for converting one type into another
  // Dynamo uses the TypeScript types to determine the conversion
  // in this case from a number to a Complex
  @conversion()
  static fromNumber(a: number): Complex {
    return new Complex(a, 0);
  }

  constructor(public re: number, public im: number) {}

  times(b: Complex): Complex {
    return new Complex(this.re * b.re - this.im * b.im, this.re * b.im + this.im * b.re);
  }
}

// Once added to the Dynamo instance the type and conversions are defined
dynamo.add(Complex);

// This class is a Dynamo function definition
class Times {
  // the resulting function will have this name
  name: 'times';

  // A `@signature` defines an implementation within the dynamo function
  // The types are determined by the TypeScript type definitions
  // This method is only invoked if both inputs are `number`.
  @signature()
  number(a: number, b: number): number {
    return a * b;
  }

  // this is a TypeScript override for the `complex` method defined below
  // This is necessary to get a properly typed function
  complex(a: number | Complex, b: number | Complex): Complex;

  // This methdod is envoked if either of the inputs are Complex
  // `numbers` are converted to Complex before this is invoked
  @signature()
  complex(a: Complex, b: Complex): Complex {
    return a.times(b);
  }
}

// Generates the dynamo function
// The TypeScript defintion of this function is the intersection of all methods on the `Times` class
// in this case `((a: number, b: number) => number) & (a: number | Complex, b: number | Complex) => Complex)`
// the runtime implementation is determined by the `@signature()`s
// in this case `number, number` and `Complex, Complex`.
const times = dynamo.function(Times);

test('times has the correct signiture', t => {
  type T1 = (a: number, b: number) => number;
  type T2 = (a: number | Complex, b: number | Complex) => Complex;

  assert<IsExact<typeof times, T1 & T2>>(true);

  t.is(times.name, 'Times');
  t.is(times.length, 2);
});

test('using the dynamo function', t => {
  const a = times(3, 6); // returns 18
  const b = times(new Complex(3, 0), new Complex(0, 6));  // returns the complex number (18i)

  assert<IsExact<typeof a, number>>(true);
  assert<IsExact<typeof b, Complex>>(true);

  t.is(a, 18);
  t.deepEqual(b, new Complex(0, 18));
});

test('conversion', t => {
  const c = times(3, new Complex(0, 6));  // returns the complex number (18i)
  assert<IsExact<typeof c, Complex>>(true);
  t.deepEqual(c, new Complex(0, 18));        // 6 is upconverted to a complex
});

test('errors', t => {
  // Typescript doesn't allow comparing a number (restult of times(3, 6)) to a complex value
  // t.is(times(3, 6), new Complex(18, 0));

  // Typescript doesn't allow passing a string to the times function
  // t.is(times(3, '6'), 18);

  // Typescript doesn't allow comparing a number (restult of times(3, 6)) to a complex value
  // t.is(times(3, 6), new Complex(18, 0));

  t.throws(() => {
    // typed-funtion throws at runtime
    // @ts-ignore
    times(3, '6');
  }, 'Unexpected type of arguments. Expected [Number,Number] or [Complex|Number,Complex|Number].');
});
