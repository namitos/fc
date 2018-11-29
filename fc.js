import { BaseComponent, html } from './BaseComponent.js';

let widgets = {};

class FCPrimitive extends BaseComponent {
  static get is() {
    return 'fc-primitive';
  }

  static get properties() {
    return {
      value: {},
      required: {
        type: Boolean
      }
    };
  }

  static get primitives() {
    return {
      string: 'text',
      number: 'number',
      integer: 'number',
      boolean: 'checkbox',
      any: 'text'
    };
  }

  prepareValue(v) {
    if (this.type === 'number') {
      return parseFloat(v);
    } else if (this.type === 'integer') {
      return parseInt(v);
    } else if (this.type === 'boolean') {
      return !!v;
    } else {
      return v;
    }
  }

  _onChange(e) {
    this.value = this.prepareValue(e.target.value);
    if (this.onChange) {
      this.onChange(this);
    }
  }

  template() {
    let type = this.constructor.primitives[this.type];
    return html`
      <label ?hidden="${!this.label}">${this.label}</label> <input type="${type}" value="${this.value}" ?required="${this.required}" @change="${this._onChange.bind(this)}" />
    `;
  }
}

class FCSelect extends FCPrimitive {
  constructor() {
    super(...arguments);
    if (this.multiple) {
      if (!(this.value instanceof Array) && this.value) {
        this.value = [this.value];
      }
    }
    if (!this.items && this.options) {
      let items = [];
      Object.keys(this.options).forEach((k) => {
        items.push({ _id: k, name: this.options[k] });
      });
      this.items = items;
      this.render();
    }
  }

  static get is() {
    return 'fc-select';
  }

  _onChange(e) {
    if (this.multiple) {
      let value = [];
      let options = e.target.options;
      for (let i = 0, iL = options.length; i < iL; i++) {
        let option = options[i];
        if (option.selected && (option.value || option.text)) {
          value.push(option.value || option.text);
        }
      }
      this.value = value;
    } else {
      this.value = this.prepareValue(e.target.value);
    }
    if (this.onChange) {
      this.onChange(this);
    }
  }

  _selected(item) {
    if (this.value instanceof Array) {
      return this.value.includes(item._id.toString());
    } else {
      return (this.value || '').toString() === item._id.toString();
    }
  }

  template() {
    return html`
      <label ?hidden="${!this.label}">${this.label}</label>
      <select @change="${this._onChange.bind(this)}" ?required="${this.required}" ?multiple="${this.multiple}" ?novalue="${!this.value}">
        ${
          this.multiple
            ? ''
            : html`
                <option value="" placeholder>${this.placeholder || ''}</option>
              `
        }
        ${
          (this.items || []).map(
            (item) =>
              html`
                <option value="${item._id}" ?selected="${this._selected(item)}">${item.title || item.name}</option>
              `
          )
        }
      </select>
    `;
  }
}

class FCObject extends BaseComponent {
  static get is() {
    return 'fc-object';
  }

  constructor() {
    super(...arguments);
    let fields = [];
    if (!this.schema || !this.schema.properties) {
      console.log(this);
    }
    let propNames = Object.keys(this.schema.properties);
    let startValue = this.value || {};
    this.value = Object.assign({}, startValue); //переопределяем стартовое значение, чтоб не модифицировать оригинал: там геттеры-сеттеры создаются. и при удалении формы могут быть утечки памяти из-за ссылок на "удалённые" инпуты. если закомментить, будет редактировать оригинальный объект.

    for (let i = 0; i < propNames.length; ++i) {
      let propName = propNames[i];
      let schema = this.schema.properties[propName];
      if (!schema.readOnlyIo) {
        let value = startValue[propName];
        if (!value) {
          if (['number', 'integer'].includes(schema.type)) {
            value = 0;
          } else if (schema.type === 'string') {
            value = '';
          } else if (schema.type === 'boolean') {
            value = false;
          } else if (schema.type === 'object') {
            value = {};
          } else if (schema.type === 'array') {
            value = [];
          }
        }
        let wInstance = {};
        let objProps = { schema, value };
        if (schema.attributes) {
          Object.assign(objProps, schema.attributes);
        }
        ['label', 'labels', 'placeholder', 'placeholders', 'type', 'model', 'items', 'options', 'required', 'multiple'].forEach((k) => {
          if (schema[k]) {
            objProps[k] = schema[k];
          }
        });

        let whatToCreate = 'webcomponent';
        if (schema.widget) {
          if (widgets[schema.widget]) {
            whatToCreate = widgets[schema.widget];
          }
        } else if (Object.keys(FCPrimitive.primitives).includes(schema.type)) {
          whatToCreate = FCPrimitive;
        } else if (schema.type === 'object') {
          whatToCreate = FCObject;
        } else if (schema.type === 'array') {
          whatToCreate = FCObject; //TODO: create array
        }

        if (whatToCreate === 'webcomponent') {
          //if no widget definition, trying webcomponent
          if (['textarea'].includes(schema.widget)) {
            delete objProps.type;
          }
          wInstance = Object.assign(document.createElement(schema.widget), objProps);
          wInstance.el = wInstance; //crutch for rendering
        } else {
          wInstance = new whatToCreate(objProps);
        }

        fields.push(wInstance);

        Object.defineProperty(this.value, propName, {
          get() {
            return wInstance.value;
          },
          set(v) {
            wInstance.value = v;
          },
          enumerable: true
        });
      }
    }
    this.fields = fields;
    this.render();
  }

  template() {
    return html`
      <label ?hidden="${!this.label}">${this.label}</label>
      <div>${(this.fields || []).map((i) => i.el)}</div>
    `;
  }

  get valueClone() {
    return JSON.parse(JSON.stringify(this.value));
  }
}

Object.assign(widgets, { FCPrimitive, FCSelect, FCObject });

function fc() {
  return new FCObject(...arguments).el;
}

export { widgets, fc };
