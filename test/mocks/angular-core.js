// Mock @angular/core for testing Angular services in isolation
function Injectable() {
  return function (target) { return target; };
}

module.exports = { Injectable };
