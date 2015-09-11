(function (global) {
	"use strict";

	//IE 10-11 events polyfill
	if (navigator.userAgent.toLowerCase().match(/trident/)) {
		var CustomEvent = function (event, params) {
			params = params || {bubbles: false, cancelable: false, detail: undefined};
			var evt = document.createEvent('CustomEvent');
			evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
			return evt;
		};
		CustomEvent.prototype = window.Event.prototype;
	} else {
		var CustomEvent = global.CustomEvent;
	}

	var primitivesToInputs = {
		string: 'text',
		number: 'number',
		integer: 'number',
		boolean: 'checkbox',
		any: 'text'
	};

	function forEach(obj, fn) {
		if (obj) {
			Object.keys(obj).forEach(function (key) {
				fn(obj[key], key);
			});
		}
	}

	function merge(obj, otherObj) {
		forEach(otherObj, function (val, key) {
			obj[key] = val;
		});
	}

	function containsAnyClass(elem, classList) {
		var contains = false;
		if (classList instanceof Array) {
			classList.forEach(function (cls) {
				if (!contains) {
					contains = elem.classList.contains(cls);
				}
			});
		} else {
			contains = elem.classList.contains(classList);
		}
		return contains;
	}

	function closest(elem, cls) {
		while (elem) {
			if (containsAnyClass(elem, cls)) {
				return elem;
			} else {
				elem = elem.parentNode;
			}
		}
		return false;
	}

	function makeEl(tagname, attributes, children) {
		var el = document.createElement(tagname);
		forEach(attributes, function (val, key) {
			el.setAttribute(key, val);
		});
		if (children) {
			if (typeof children == 'string') {
				el.innerHTML = children;
			} else if (children instanceof Array) {
				children.forEach(function (item) {
					el.appendChild(item);
				});
			} else {
				el.appendChild(children);
			}
		}
		return el;
	}

	function toNumber(str, parseFn) {
		str = str.trim();
		return !str || isNaN(str) ? 0 : parseFn(str);
	}

	function changeField() {
		var input = this;
		var parent = closest(input, ['object', 'array']);
		var nameParts = input.name.split('.');
		var namePart = nameParts[nameParts.length - 1];

		if (input.convertValue) {
			parent.obj[namePart] = input.convertValue(input.value);
			closest(input, 'object-root').changeObj();
		} else if (input.schema.widget && input.schema.widget == 'base64File') {
			var filesLoadCounter = 0;
			var filesLoaded = [];
			var filesCount = input.files.length;
			for (var i = 0; i < input.files.length; ++i) {
				(function () {
					var file = input.files[i];
					var reader = new FileReader();
					reader.onload = function (a) {
						filesLoaded[filesLoadCounter] = a.target.result;
						filesLoadCounter++;
						if (filesLoadCounter == filesCount) {
							parent.obj[namePart] = filesLoaded;
							closest(input, 'object-root').changeObj();
						}
					};
					reader.readAsDataURL(file);
				})()
			}
		} else if (input.schema.type == 'boolean') {
			parent.obj[namePart] = input.checked;
			closest(input, 'object-root').changeObj();
		} else if (input.schema.type == 'integer') {
			parent.obj[namePart] = toNumber(input.value, parseInt);
			closest(input, 'object-root').changeObj();
		} else if (input.schema.type == 'number') {
			parent.obj[namePart] = toNumber(input.value, parseFloat);
			closest(input, 'object-root').changeObj();
		} else {
			parent.obj[namePart] = input.value;
			closest(input, 'object-root').changeObj();
		}
	}

	var widgets = {
		select: function (obj, schema) {
			var el = makeEl('div');
			var input = makeEl('select');
			el.appendChild(input);

			input.appendChild(makeEl('option'));
			var kv = [];
			forEach(schema.options, function (val, key) {
				kv.push({
					key: key,
					val: val
				});
			});
			kv.sort(function (a, b) {
				if (a.val > b.val) return 1;
				if (a.val < b.val) return -1;
				return 0;
			}).forEach(function (row) {
				var option = makeEl('option');
				option.setAttribute('value', row.key);
				if (row.key == obj) {
					option.setAttribute('selected', true);
				}
				option.innerHTML = row.val;
				input.appendChild(option);
			});
			return {
				wrapper: el,
				input: input
			};
		},
		base64File: function (obj, schema) {
			var el = makeEl('div');

			var input = makeEl('input', {
				type: 'file'
			});
			el.appendChild(input);

			var list = makeEl('div', {
				'class': 'list'
			});
			el.appendChild(list);

			if (obj instanceof Array) {
				if (schema.fileView instanceof Function) {
					var fileView = schema.fileView;
				} else {
					var fileView = function (item) {
						var nameParts = item.split('/');
						return makeEl('a', {
							'href': '/' + item,
							target: '_blank'
						}, nameParts[nameParts.length - 1].slice(0, 10));
					}
				}
				obj.forEach(function (item, i) {
					var removeBtn = makeEl('button', {
						type: 'button',
						'class': 'btn remove'
					}, [
						makeEl('span', {
							'class': 'glyphicon glyphicon-remove'
						}),
						makeEl('span', {
							'class': 'text'
						}, 'Remove file')
					]);
					removeBtn.addEventListener('click', function () {
						var itemEl = closest(this, 'item');
						var objEl = closest(this, 'object');
						var nameParts = input.name.split('.');
						var namePart = nameParts[nameParts.length - 1];
						delete objEl.obj[namePart][itemEl.i];
						itemEl.parentNode.removeChild(itemEl);
						closest(this, 'object-root').changeObj();
					}, false);
					var itemEl = makeEl('span', {
						'class': 'item'
					}, [
						makeEl('span', {'class': 'content'}, fileView(item)),
						removeBtn
					]);
					itemEl.i = i;
					list.appendChild(itemEl);
				});
			}
			return {
				wrapper: el,
				input: input
			};
		},
		textarea: function (obj, schema) {
			var el = makeEl('div');
			var input = makeEl('textarea');
			input.value = obj;
			el.appendChild(input);
			return {
				wrapper: el,
				input: input
			};
		},
		input: function (obj, schema) {
			var el = makeEl('div');
			var input = makeEl('input', {
				type: primitivesToInputs[schema.type]
			});
			el.appendChild(input);
			if (schema.type == 'number') {
				input.setAttribute('step', 'any');
			}
			if (input.type != 'file') {
				input.value = obj;
			}
			if (input.type == 'checkbox') {
				input.checked = obj;
			}
			return {
				wrapper: el,
				input: input
			}
		},
		unixDate: function (obj, schema) {
			if (window.moment) {
				var el = makeEl('div');
				var input = makeEl('input', {
					type: 'date'
				});
				el.appendChild(input);
				input.value = obj ? moment(obj).format("YYYY-MM-DD") : '';
				input.convertValue = function (value) {
					return value ? moment(value, "YYYY-MM-DD").toDate().valueOf() : 0;
				};
				return {
					wrapper: el,
					input: input
				}
			} else {
				console.error('unixDate widget requires momentjs');
			}
		}
	};

	function makeInput(obj, schema, wrapper, name, namePrefix) {
		wrapper.classList.add('form-group');
		wrapper.classList.add('input-' + name);
		var attributes = schema.attributes || {};

		var widgetName = schema.widget || 'input';
		var widget = widgets[widgetName](obj, schema);
		var el = widget.wrapper;
		var input = widget.input;

		attributes.name = name ? (namePrefix ? [namePrefix, name].join('.') : name) : '';
		forEach(attributes, function (val, key) {
			input.setAttribute(key, val);
		});
		if (schema.hasOwnProperty('required') && schema.required) {
			input.setAttribute('required', true);
		}
		input.classList.add('form-control');
		input.classList.add('widget-' + widgetName);

		input.changeField = changeField;
		if (input.nodeName == 'SELECT' || input.type == 'file' || input.type == 'checkbox') {
			input.addEventListener('change', function () {
				this.changeField();
			});
		} else {
			input.addEventListener('input', function () {
				this.changeField();
			});
		}

		input.schema = schema;

		wrapper.appendChild(el);
	}

	function makeRow(objPart, schema, i, namePrefix) {
		var row = schema.items.form(objPart, i, namePrefix);
		row.i = i;
		var btn = makeEl('button', {
			'class': 'btn remove',
			'type': 'button'
		}, [
			makeEl('span', {
				'class': 'glyphicon glyphicon-remove'
			}),
			makeEl('span', {
				'class': 'text'
			}, 'Remove item')
		]);
		btn.addEventListener('click', function () {
			var root = closest(this, 'object-root');
			delete this.parentNode.parentNode.parentNode.obj[this.parentNode.i];
			this.parentNode.parentNode.removeChild(this.parentNode);
			root.changeObj();
		}, false);
		row.appendChild(btn);
		return row;
	}

	function Schema(schema) {
		merge(this, schema);
		var instance = this;
		if (schema.type == 'object') {
			forEach(schema.properties, function (fieldSchema, key) {
				instance.properties[key] = new Schema(fieldSchema);
			});
		} else if (schema.type == 'array') {
			this.items = new Schema(this.items);
		}
	}

	Schema.prototype.form = function (obj, name, namePrefix) {
		var schema = this;
		if (schema.type == 'array' && !obj instanceof Array) {
			obj = [];
		}
		var wrapper = makeEl('div');
		wrapper.obj = obj;
		if (schema.label) {
			wrapper.appendChild(makeEl('label', {}, schema.label));
		}
		if (!name) {
			wrapper.classList.add('object-root');
			wrapper.changeObj = function () {
				var event = new CustomEvent('changeObj', {detail: wrapper.obj});
				this.dispatchEvent(event);
			};
			wrapper.changeObjArrayAdd = function (data) {
				var event = new CustomEvent('changeObjArrayAdd', {detail: data});
				this.dispatchEvent(event);
			};
		}
		if (schema.type == 'array') {
			wrapper.classList.add('array');
			wrapper.itemsCount = 0;
			wrapper.schema = schema;
			if (name) {
				wrapper.classList.add('array-' + name);
			}

			var items = makeEl('div');
			items.classList.add('items');
			if (obj instanceof Array) {
				wrapper.itemsCount = obj.length;
				obj.forEach(function (objPart, key) {
					var row = makeRow(objPart, schema, key.toString(), name);
					items.appendChild(row);
				});
			}
			wrapper.appendChild(items);

			var btn = makeEl('button', {
				'class': 'btn add',
				'type': 'button'
			}, [
				makeEl('span', {
					'class': 'glyphicon glyphicon-plus'
				}),
				makeEl('span', {
					'class': 'text'
				}, 'Add item')
			]);
			wrapper.appendChild(btn);
			btn.addEventListener("click", function () {
				var items = this.previousSibling;
				var newObj = '';
				if (this.parentNode.schema.items.type == 'array') {
					newObj = [];
				} else if (this.parentNode.schema.items.type == 'object') {
					newObj = {};
				}
				this.parentNode.obj.push(newObj);
				var row = makeRow(newObj, this.parentNode.schema, wrapper.itemsCount.toString(), name);
				wrapper.itemsCount++;
				items.appendChild(row);
				closest(this, 'object-root').changeObjArrayAdd(row);
			}, false);

		} else if (schema.type == 'object') {
			wrapper.classList.add('object');
			if (name) {
				wrapper.classList.add('object-' + name);
			}
			if (namePrefix) {
				name = [namePrefix, name].join('.');
			}
			forEach(schema.properties, function (schemaPart, key) {
				if (!obj.hasOwnProperty(key)) {
					var objPart;
					if (schemaPart.type == 'array') {
						objPart = [];
					} else if (schemaPart.type == 'object') {
						objPart = {};
					} else if (schemaPart.type == 'string') {
						objPart = '';
					} else if (schemaPart.type == 'number' || schemaPart.type == 'integer') {
						objPart = 0;
					} else if (schemaPart.type == 'boolean') {
						objPart = false;
					}
					obj[key] = objPart;
				} else {
					objPart = obj[key];
				}
				wrapper.appendChild(schemaPart.form(objPart, key, name));
			});

		} else if (Object.keys(primitivesToInputs).indexOf(schema.type) != -1) {
			makeInput(obj, schema, wrapper, name, namePrefix);
		} else {
			wrapper.classList.add('alert');
			wrapper.classList.add('alert-info');
			wrapper.innerHTML = JSON.stringify(schema);
		}
		return wrapper;
	};

	function fc(schema, obj) {
		return (new Schema(schema)).form(obj || {});
	}

	fc.widgets = widgets;

	var defineAsGlobal = true;
	if (typeof exports === 'object') {
		module.exports = fc;
		defineAsGlobal = false;
	}
	if (typeof define === 'function') {
		define(function (require, exports, module) {
			module.exports = fc;
		});
		defineAsGlobal = false;
	}
	defineAsGlobal && (global.fc = fc);
})(this);
