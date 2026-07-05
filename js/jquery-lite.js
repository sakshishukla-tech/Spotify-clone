(function (window) {
  "use strict";

  function MiniQuery(selector) {
    if (typeof selector === "function") {
      if (document.readyState !== "loading") selector();
      else document.addEventListener("DOMContentLoaded", selector);
      return this;
    }

    if (selector instanceof MiniQuery) return selector;

    if (selector === window || selector === document || selector instanceof Element) {
      this.elements = [selector];
    } else if (selector instanceof NodeList || Array.isArray(selector)) {
      this.elements = Array.prototype.slice.call(selector);
    } else {
      this.elements = Array.prototype.slice.call(document.querySelectorAll(selector || ""));
    }
    this.length = this.elements.length;
    for (var i = 0; i < this.elements.length; i += 1) this[i] = this.elements[i];
  }

  MiniQuery.prototype.each = function (callback) {
    this.elements.forEach(function (element, index) {
      callback.call(element, index, element);
    });
    return this;
  };

  MiniQuery.prototype.on = function (eventName, selector, handler) {
    if (typeof selector === "function") {
      handler = selector;
      selector = null;
    }
    return this.each(function () {
      this.addEventListener(eventName, function (event) {
        if (!selector) {
          handler.call(this, event);
          return;
        }
        var match = event.target.closest(selector);
        if (match && this.contains(match)) handler.call(match, event);
      });
    });
  };

  MiniQuery.prototype.addClass = function (name) {
    return this.each(function () { this.classList.add(name); });
  };

  MiniQuery.prototype.removeClass = function (name) {
    return this.each(function () { this.classList.remove(name); });
  };

  MiniQuery.prototype.toggleClass = function (name, force) {
    return this.each(function () {
      if (force === undefined) this.classList.toggle(name);
      else this.classList.toggle(name, !!force);
    });
  };

  MiniQuery.prototype.hasClass = function (name) {
    return !!(this.elements[0] && this.elements[0].classList.contains(name));
  };

  MiniQuery.prototype.text = function (value) {
    if (value === undefined) return this.elements[0] ? this.elements[0].textContent : "";
    return this.each(function () { this.textContent = value; });
  };

  MiniQuery.prototype.html = function (value) {
    if (value === undefined) return this.elements[0] ? this.elements[0].innerHTML : "";
    return this.each(function () { this.innerHTML = value; });
  };

  MiniQuery.prototype.empty = function () {
    return this.each(function () { this.innerHTML = ""; });
  };

  MiniQuery.prototype.prepend = function (content) {
    return this.each(function () {
      if (typeof content === "string") this.insertAdjacentHTML("afterbegin", content);
      else if (content instanceof Element) this.insertBefore(content, this.firstChild);
    });
  };

  MiniQuery.prototype.show = function () {
    return this.each(function () { this.style.display = ""; });
  };

  MiniQuery.prototype.hide = function () {
    return this.each(function () { this.style.display = "none"; });
  };

  MiniQuery.prototype.attr = function (name, value) {
    if (value === undefined) return this.elements[0] ? this.elements[0].getAttribute(name) : undefined;
    return this.each(function () { this.setAttribute(name, value); });
  };

  MiniQuery.prototype.data = function (name) {
    if (!this.elements[0]) return undefined;
    return this.elements[0].dataset[name];
  };

  MiniQuery.prototype.css = function (name, value) {
    if (value === undefined) return this.elements[0] ? getComputedStyle(this.elements[0])[name] : undefined;
    return this.each(function () { this.style[name] = value; });
  };

  MiniQuery.prototype.find = function (selector) {
    var found = [];
    this.each(function () {
      found = found.concat(Array.prototype.slice.call(this.querySelectorAll(selector)));
    });
    return $(found);
  };

  MiniQuery.prototype.closest = function (selector) {
    return $(this.elements[0] ? this.elements[0].closest(selector) : []);
  };

  MiniQuery.prototype.siblings = function () {
    if (!this.elements[0] || !this.elements[0].parentElement) return $([]);
    return $(Array.prototype.filter.call(this.elements[0].parentElement.children, function (child) {
      return child !== this.elements[0];
    }, this));
  };

  MiniQuery.prototype.val = function (value) {
    if (value === undefined) return this.elements[0] ? this.elements[0].value : undefined;
    return this.each(function () { this.value = value; });
  };

  MiniQuery.prototype.trigger = function (eventName) {
    return this.each(function () {
      this.dispatchEvent(new Event(eventName, { bubbles: true }));
    });
  };

  function $(selector) {
    return new MiniQuery(selector);
  }

  window.jQuery = window.$ = $;
})(window);
