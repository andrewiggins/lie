'use strict';
import Promise from "./lib/index";

if (typeof window.Promise !== 'function') {
  window.Promise = Promise;
}
