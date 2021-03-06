import test from 'ava';

import { Dynamo, signature } from '../src';

const dynamo = new Dynamo();

test('should throw an error when not providing any signatures', t => {
  t.throws(() => {
    dynamo.function(class A {});
  }, 'No signatures provided');
});

test('should throw an error when composing with an unknown type', t => {
  t.throws(() => {
    class Foo {
      name: 'foo';
    }

    class SN {
      @signature()
      s(value: Foo) {
        return 'number:' + value;
      }
    }

    const fn = dynamo.function(SN);
  }, 'Unknown type "Foo"');
});

test.skip('should throw when signatures collide', t => {
  t.throws(() => {
    class F {
      @signature()
      s(): string {
        return 'Null';
      }
    
      @signature()
      n(): number {
        return 42;
      }
    }
    
    const f = dynamo.function(F);
    t.is(f(), 'Null');

  }, 'Unknown type "Foo$0"');
});

test('can be created with no default types', t => {
  const typed2 = new Dynamo({ types: undefined });

  t.throws(() => {
    class Foo {
      name: 'foo';
    }

    class SN {
      @signature(Number)
      s(value: number) {
        return 'number:' + value;
      }
    }

    const fn = typed2.function(SN);
  }, 'Unknown type "Number"');
});
