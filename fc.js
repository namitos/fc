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
    let type = this.schema && this.schema.attributes && this.schema.attributes.type ? this.schema.attributes.type : this.constructor.primitives[this.type];
    return html`
      <label ?hidden="${!this.label}">${this.label}</label> <input type="${type}" .value="${this.value}" ?required="${this.required}" @change="${this._onChange.bind(this)}" />
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
        ${this.multiple
          ? ''
          : html`
              <option value="" placeholder>${this.placeholder || ''}</option>
            `}
        ${(this.items || []).map(
          (item) =>
            html`
              <option value="${item._id}" ?selected="${this._selected(item)}">${item.title || item.name}</option>
            `
        )}
      </select>
    `;
  }
}

function getInputInstance({ schema, value }) {
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
  ['label', 'labels', 'placeholder', 'placeholders', 'type', 'model', 'items', 'options', 'required', 'multiple'].forEach((k) => {
    if (schema[k]) {
      objProps[k] = schema[k];
    }
  });

  let whatToCreate = 'webcomponent';
  if (schema.widget === 'select') {
    whatToCreate = FCSelect;
  } else if (schema.widget) {
    if (widgets[schema.widget]) {
      whatToCreate = widgets[schema.widget];
    }
  } else if (Object.keys(FCPrimitive.primitives).includes(schema.type)) {
    whatToCreate = FCPrimitive;
  } else if (schema.type === 'object') {
    whatToCreate = FCObject;
  } else if (schema.type === 'array') {
    whatToCreate = FCArray;
  }

  if (whatToCreate === 'webcomponent') {
    //if no widget definition, trying webcomponent
    if (['textarea'].includes(schema.widget)) {
      delete objProps.type;
    }
    wInstance = Object.assign(document.createElement(schema.widget), objProps);
  } else {
    wInstance = new whatToCreate(objProps);
  }

  return wInstance;
}

class FCArray extends BaseComponent {
  static get is() {
    return 'fc-array';
  }

  constructor() {
    super(...arguments);
    if (!this.schema || !this.schema.items) {
      console.error(`!this.schema || !this.schema.items`, this);
    }

    let fields = [];
    this.value.forEach((valueItem, i) => {
      let wInstance = getInputInstance({ schema: this.schema.items, value: valueItem });
      Object.defineProperty(this.value, i, {
        get() {
          return wInstance.value;
        },
        set(v) {
          wInstance.value = v;
        },
        enumerable: true
      });
      fields.push(wInstance);
    });
    this.fields = fields;
    this.render();
  }

  add() {
    let wInstance = getInputInstance({ schema: this.schema.items });
    Object.defineProperty(this.value, this.value.length, {
      get() {
        return wInstance.value;
      },
      set(v) {
        wInstance.value = v;
      },
      enumerable: true
    });
    this.fields.push(wInstance);
    this.render();
  }

  template() {
    return html`
      <label ?hidden="${!this.label}">${this.label}</label>
      <div>
        ${(this.fields || []).map(
          (i) =>
            html`
              <div class="fc-array-item">${i.el instanceof HTMLElement ? i.el : i}</div>
            `
        )}
        <a class="fc-array-add" @click="${() => this.add()}"><span>Add new</span></a>
      </div>
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
      console.error(`!this.schema || !this.schema.properties`, this);
    }
    let propNames = Object.keys(this.schema.properties);
    let startValue = this.value || {};
    this.value = Object.assign({}, startValue); //переопределяем стартовое значение, чтоб не модифицировать оригинал: там геттеры-сеттеры создаются. и при удалении формы могут быть утечки памяти из-за ссылок на "удалённые" инпуты. если закомментить, будет редактировать оригинальный объект.
    this.el.value = this.value;

    for (let i = 0; i < propNames.length; ++i) {
      let propName = propNames[i];
      let schema = this.schema.properties[propName];
      if (!schema.readOnlyIo) {
        let value = startValue[propName];
        let wInstance = getInputInstance({ schema, value });
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
      <div>${(this.fields || []).map((i) => (i.el instanceof HTMLElement ? i.el : i))}</div>
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
