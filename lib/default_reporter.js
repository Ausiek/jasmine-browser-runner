import jasmine from 'jasmine';
import util from 'util';

export default function DefaultReporter(options) {
  options = options || {};
  jasmine.ConsoleReporter.call(this);

  this.setOptions({
    print: function() {
      process.stdout.write(util.format.apply(this, arguments));
    },
    randomSeedReproductionCmd: function(seed) {
      return 'jasmine-browser-runner runSpecs --seed=' + seed;
    },
    showColors: options.color === 'undefined' ? true : options.color,
  });
}
