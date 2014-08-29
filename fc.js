(function (global) {
	"use strict";

	function closest(elem, cls) {
		while (elem) {
			if (elem.classList.contains(cls)) {
				return elem;
			} else {
				elem = elem.parentNode;
			}
		}
		return false;
	}

	function Schema(schema) {
		_.merge(this, schema);
		if (schema.type == 'object') {
			for (var key in schema.properties) {
				this.properties[key] = new Schema(schema.properties[key]);
			}
		} else if (schema.type == 'array') {
			this.items = new Schema(this.items);
		}
	}

	function makeEl(tagname, attributes, children) {
		var el = document.createElement(tagname);
		_.forEach(attributes, function (val, key) {
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

	function changeField() {
		var parent;
		var input = this;
		var nameParts = input.name.split('.');
		var namePart = nameParts[nameParts.length - 1];
		if (input.parentNode.parentNode.classList.contains('object')) {
			parent = input.parentNode.parentNode;
		} else {
			parent = input.parentNode.parentNode.parentNode;
		}
		if(input.schema.widget && input.schema.widget == 'base64File'){
			var filesLoadCounter = 0;
			var filesLoaded = [];
			var filesCount = input.files.length;
			for (var i = 0; i < input.files.length; ++i) {
				(function(){
					var file = input.files[i];
					var reader = new FileReader();
					reader.onload = function (a) {
						filesLoaded[filesLoadCounter] = a.target.result;
						filesLoadCounter++;
						if(filesLoadCounter == filesCount){
							parent.obj[namePart] = filesLoaded;
							closest(input, 'object-root').changeObj();
						}
					};
					reader.readAsDataURL(file);
				})()
			}
		} else {
			parent.obj[namePart] = input.value;
			closest(input, 'object-root').changeObj();
		}
	}

	function makeInput(obj, schema, wrapper, name, namePrefix) {
		var obj = obj instanceof Object ? '' : obj;
		wrapper.classList.add('form-group');
		wrapper.classList.add('input-' + name);
		var attributes = schema.attributes || {};
		var primitivesToInputs = {
			string: 'text',
			number: 'number',
			integer: 'number',
			any: 'file'
		};
		if (schema.type == 'string' || schema.type == 'number' || schema.type == 'integer' || schema.type == 'any') {
			if (schema.widget) {
				if (schema.widget == 'textarea') {
					var el = makeEl('textarea');

				} else if (schema.widget == 'select') {
					var el = makeEl('select');
					el.appendChild(makeEl('option'));
					_.forEach(schema.options, function (val, key) {
						var option = makeEl('option');
						option.setAttribute('value', key);
						option.innerHTML = val;
						el.appendChild(option);
					});

				} else if (schema.widget == 'file' || schema.widget == 'base64File') {
					var el = makeEl('input', {
						type: 'file'
					});

				} else {
					var el = makeEl('div', {
						'class': 'alert alert-info'
					});
					el.innerHTML = "widget type " + schema.widget + " is not supported";
				}
			} else {
				var el = makeEl('input', {
					type: primitivesToInputs[schema.type]
				});
			}
		} else {
			var el = makeEl('div', {
				'class': 'alert alert-info'
			});
			el.innerHTML = "data type " + schema.type + " is not supported";
		}

		attributes.name = name ? (namePrefix ? [namePrefix, name].join('.') : name) : '';
		_.forEach(attributes, function (val, key) {
			el.setAttribute(key, val);
		});
		el.classList.add('form-control');
		if (schema.widget) {
			el.classList.add('widget-' + schema.widget);
		}
		el.value = obj;
		el.changeField = changeField;
		el.addEventListener('change', function () {
			this.changeField();
		});
		el.schema = schema;
		wrapper.appendChild(el);
	}

	function makeRow(objPart, schema, i, namePrefix) {
		var row = schema.items.form(objPart, i, namePrefix);
		var btn = makeEl('button', {
			'class': 'btn remove'
		}, [
			makeEl('span', {
				'class': 'glyphicon glyphicon-remove'
			}),
			makeEl('span', {
				'class': 'text'
			}, 'Remove item')
		]);
		btn.addEventListener('click', function () {
			this.parentNode.parentNode.removeChild(this.parentNode);
		}, false);
		row.appendChild(btn);
		return row;
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
				var event = new CustomEvent('changeObj', { detail: wrapper.obj });
				this.dispatchEvent(event);
			};
			wrapper.changeObjArrayAdd = function (data) {
				var event = new CustomEvent('changeObjArrayAdd', { detail: data });
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
				'class': 'btn add'
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
				var newObj = {};
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
			_.forEach(schema.properties, function (schemaPart, key) {
				if (!obj.hasOwnProperty(key)) {
					var objPart;
					if (schemaPart.type == 'array') {
						objPart = [];
					} else if (schemaPart.type == 'object') {
						objPart = {};
					} else if (schemaPart.type == 'string') {
						objPart = '';
					} else if (schemaPart.type == 'number' || schemaPart.type == 'integer' || schemaPart.type == 'boolean') {
						objPart = 0;
					}
					obj[key] = objPart;
				} else {
					objPart = obj[key];
				}
				wrapper.appendChild(schemaPart.form(objPart, key, name));
			});

		} else if (schema.type == 'string' || schema.type == 'integer' || schema.type == 'number' || schema.type == 'any') {
			makeInput(obj, schema, wrapper, name, namePrefix);
		} else {
			wrapper.classList.add('alert');
			wrapper.classList.add('alert-info');
			wrapper.innerHTML = JSON.stringify(schema);
		}
		return wrapper;
	};

	function fc(schema, obj) {
		if(typeof obj == 'undefined') {
			obj = {};
		}
		return (new Schema(schema)).form(obj);
	}

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