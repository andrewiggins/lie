(function () {
'use strict';

'use strict';
var immediate = setTimeout;

/* istanbul ignore next */
function INTERNAL() { }

var REJECTED = 1;
var FULFILLED = 2;
var PENDING = 3;

function Promise(resolver) {
  if (typeof resolver !== 'function') {
    throw new TypeError('resolver must be a function');
  }
  this.state = PENDING;
  this.queue = [];
  this.outcome = void 0;
  if (resolver !== INTERNAL) {
    safelyResolveThenable(this, resolver);
  }
}

Promise.prototype.catch = function (onRejected) {
  return this.then(null, onRejected);
};
Promise.prototype.then = function (onFulfilled, onRejected) {
  if (typeof onFulfilled !== 'function' && this.state === FULFILLED ||
    typeof onRejected !== 'function' && this.state === REJECTED) {
    return this;
  }
  var promise = new Promise(INTERNAL);
  if (this.state !== PENDING) {
    var resolver = this.state === FULFILLED ? onFulfilled : onRejected;
    unwrap(promise, resolver, this.outcome);
  } else {
    this.queue.push(createQueueItem(promise, onFulfilled, onRejected));
  }

  return promise;
};

function createQueueItem(promise, onFulfilled, onRejected) {
  return {
    fulfill: function (value) {
      if (typeof onFulfilled === 'function') {
        unwrap(promise, onFulfilled, value);
      }
      else {
        resolveHandler(promise, value);
      }
    },
    reject: function (reason) {
      if (typeof onRejected === 'function') {
        unwrap(promise, onRejected, reason);
      }
      else {
       rejectHandler(promise, reason);
      }
    }
  };
}

function unwrap(promise, func, value) {
  immediate(function () {
    var returnValue;
    try {
      returnValue = func(value);
    } catch (e) {
      return rejectHandler(promise, e);
    }
    if (returnValue === promise) {
      rejectHandler(promise, new TypeError('Cannot resolve promise with itself'));
    } else {
      resolveHandler(promise, returnValue);
    }
  });
}

function resolveHandler(self, value) {
  var result = tryCatch(getThen, value);
  if (result.status === 'error') {
    return rejectHandler(self, result.value);
  }
  var thenable = result.value;

  if (thenable) {
    safelyResolveThenable(self, thenable);
  } else {
    self.state = FULFILLED;
    self.outcome = value;
    var i = -1;
    var len = self.queue.length;
    while (++i < len) {
      self.queue[i].fulfill(value);
    }
  }
  return self;
}
function rejectHandler(self, error) {
  self.state = REJECTED;
  self.outcome = error;
  var i = -1;
  var len = self.queue.length;
  while (++i < len) {
    self.queue[i].reject(error);
  }
  return self;
}

function getThen(obj) {
  // Make sure we only access the accessor once as required by the spec
  var then = obj && obj.then;
  if (obj && (typeof obj === 'object' || typeof obj === 'function') && typeof then === 'function') {
    return function appyThen() {
      then.apply(obj, arguments);
    };
  }
}

function safelyResolveThenable(self, thenable) {
  // Either fulfill, reject or reject with error
  var called = false;
  function onError(value) {
    if (called) {
      return;
    }
    called = true;
    rejectHandler(self, value);
  }

  function onSuccess(value) {
    if (called) {
      return;
    }
    called = true;
    resolveHandler(self, value);
  }

  function tryToUnwrap() {
    thenable(onSuccess, onError);
  }

  var result = tryCatch(tryToUnwrap);
  if (result.status === 'error') {
    onError(result.value);
  }
}

function tryCatch(func, value) {
  var out = {};
  try {
    out.value = func(value);
    out.status = 'success';
  } catch (e) {
    out.status = 'error';
    out.value = e;
  }
  return out;
}

Promise.resolve = staticResolver;
function staticResolver(value) {
  if (value instanceof this) {
    return value;
  }
  return resolveHandler(new this(INTERNAL), value);
}

Promise.reject = staticRejector;
function staticRejector(reason) {
  var promise = new this(INTERNAL);
  return rejectHandler(promise, reason);
}

Promise.all = all;
function all(iterable) {
  var self = this;
  if (Object.prototype.toString.call(iterable) !== '[object Array]') {
    return this.reject(new TypeError('must be an array'));
  }

  var len = iterable.length;
  var called = false;
  if (!len) {
    return this.resolve([]);
  }

  var values = new Array(len);
  var resolved = 0;
  var i = -1;
  var promise = new this(INTERNAL);

  while (++i < len) {
    allResolver(iterable[i], i);
  }
  return promise;
  function allResolver(value, i) {
    self.resolve(value).then(function (outValue) {
      values[i] = outValue;
      if (++resolved === len && !called) {
        called = true;
        resolveHandler(promise, values);
      }
    }, function (error) {
      if (!called) {
        called = true;
        rejectHandler(promise, error);
      }
    });
  }
}

Promise.race = race;
function race(iterable) {
  var self = this;
  if (Object.prototype.toString.call(iterable) !== '[object Array]') {
    return this.reject(new TypeError('must be an array'));
  }

  var len = iterable.length;
  var called = false;
  if (!len) {
    return this.resolve([]);
  }

  var i = -1;
  var promise = new this(INTERNAL);

  while (++i < len) {
    resolver(iterable[i]);
  }
  return promise;
  function resolver(value) {
    self.resolve(value).then(function (response) {
      if (!called) {
        called = true;
        resolveHandler(promise, response);
      }
    }, function (error) {
      if (!called) {
        called = true;
        rejectHandler(promise, error);
      }
    });
  }
}

'use strict';
if (typeof window.Promise !== 'function') {
  window.Promise = Promise;
}

}());
