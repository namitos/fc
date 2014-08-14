(function(global){
	"use strict";

	function SchemaItem(schema){
		_.merge(this, schema);
		if(schema.type == 'object'){
			for(var key in schema.properties) {
				this.properties[key] = new SchemaItem(schema.properties[key]);
			}
		} else if(schema.type == 'array') {
			this.items = new SchemaItem(this.items);

		} else if(schema.type == 'string' || schema.type == 'integer' || schema.type == 'number'){

		}
	}

	function makeEl(tagname, attributes, children){
		var el = document.createElement(tagname);
		_.forEach(attributes, function(val, key){
			el.setAttribute(key, val);
		});
		if(children){
			if(typeof children == 'string'){
				el.innerHTML = children;
			} else if(children instanceof Array){
				children.forEach(function(item){
					el.appendChild(item);
				});
			}else{
				el.appendChild(children);
			}
		}
		return el;
	}

	function makeInput(obj, schema, wrapper, name, namePrefix){
		var obj = obj instanceof Object ? '' : obj;
		wrapper.classList.add('form-group');
		wrapper.classList.add('input-' + name);
		var attributes = schema.attributes || {};
		if(schema.type == 'string' || schema.type == 'number' || schema.type == 'any'){
			if(schema.widget){
				if(schema.widget == 'textarea'){
					var el = makeEl('textarea');

				} else if(schema.widget == 'select'){
					var el = makeEl('select');
					el.appendChild(makeEl('option'));
					_.forEach(schema.options, function(val, key){
						var option = makeEl('option');
						option.setAttribute('value', key);
						option.innerHTML = val;
						el.appendChild(option);
					});

				} else if(schema.widget == 'file'){
					var el = makeEl('input', {
						type: 'file'
					});

				} else {
					var el = makeEl('div', {
						class: 'alert alert-info'
					});
					el.innerHTML = "widget type " + schema.widget + " is not supported";
				}
			} else {
				var el = makeEl('input', {
					type: 'text'
				});

			}

		} else if(schema.type == 'integer') {
			var el = makeEl('input', {
				type: 'number'
			});
		}

		attributes.name = name ? (namePrefix ? [namePrefix, name].join('.') : name) : '';
		_.forEach(attributes, function(val, key){
			el.setAttribute(key, val);
		});
		el.classList.add('form-control');
		if(schema.widget){
			el.classList.add('widget-' + schema.widget);
		}
		el.value = obj;
		el.addEventListener('change', function(){
			var parent;
			if(this.parentNode.parentNode.classList.contains('object')){
				parent = this.parentNode.parentNode;
			} else {
				parent = this.parentNode.parentNode.parentNode;
			}
			parent.obj[name] = this.value;
		});
		el.addEventListener('keyup', function(){

		});
		wrapper.appendChild(el);
	}

	function makeRow(objPart, schema, wrapper, i, namePrefix){
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
		btn.addEventListener('click', function(){
			this.parentNode.parentNode.removeChild(this.parentNode);
		}, false);
		row.appendChild(btn);
		wrapper.appendChild(row);
	}

	SchemaItem.prototype.form = function(obj, name, namePrefix) {
		var schema = this;
		if(!obj){
			if(schema.type == 'array'){
				obj = [];
			} else if (schema.type == 'object'){
				obj = {};
			} else {
				obj = '';
			}
		}
		if(schema.type == 'array' && !obj instanceof Array){
			obj = [];
		}

		var wrapper = makeEl('div');
		wrapper.obj = obj;
		if(schema.label) {
			wrapper.appendChild(makeEl('label', {}, schema.label));
		}
		if(schema.type == 'array') {
			wrapper.classList.add('array');
			wrapper.itemsCount = 0;
			wrapper.schema = schema;
			if(name) {
				wrapper.classList.add('array-' + name);
			}

			var items = makeEl('div');
			items.classList.add('items');
			if(obj instanceof Array) {
				wrapper.itemsCount = obj.length;
				obj.forEach(function(objPart, key) {
					makeRow(objPart, schema, items, key.toString(), name);
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
			btn.addEventListener("click", function() {
				var items = this.previousSibling;
				var newObj = {};
				this.parentNode.obj.push(newObj);
				makeRow(newObj, this.parentNode.schema, items, wrapper.itemsCount.toString(), name);
				wrapper.itemsCount++;
			}, false);

		} else if(schema.type == 'object'){
			wrapper.classList.add('object');
			if (name) {
				wrapper.classList.add('object-' + name);
			}
			if (namePrefix) {
				name = [namePrefix, name].join('.');
			}
			_.forEach(schema.properties, function(schemaPart, key){
				if(!obj.hasOwnProperty(key)){
					var objPart;
					if(schemaPart.type == 'array'){
						objPart = [];
					} else if(schemaPart.type == 'object'){
						objPart = {};
					}else if(schemaPart.type == 'string'){
						objPart = '';
					} else if(schemaPart.type == 'number'){
						objPart = 0;
					}
					obj[key] = objPart;
				} else {
					objPart = obj[key];
				}
				wrapper.appendChild(schemaPart.form(objPart, key, name));
			});

		} else if(schema.type == 'string' || schema.type == 'integer' || schema.type == 'number' || schema.type == 'any'){
			makeInput(obj, schema, wrapper, name, namePrefix);
		} else {
			wrapper.classList.add('alert');
			wrapper.classList.add('alert-info');
			wrapper.innerHTML = JSON.stringify(schema);
		}
		return wrapper;
	};

	var defineAsGlobal = true;
	if(typeof exports === 'object') {
	    module.exports = SchemaItem;
	    defineAsGlobal = false;
	}
	if(typeof define === 'function') {
		define(function(require, exports, module) {
			module.exports = SchemaItem;
		});
		defineAsGlobal = false;
	}
	defineAsGlobal && (global.SchemaItem = SchemaItem);
})(this);
