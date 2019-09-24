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
      },
      items: {
        type: Array,
        value: () => []
      },
      options: {
        type: Object
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
    let { value, checked } = e.target;
    this.value = this.prepareValue(this.type === 'boolean' ? checked : value);
    if (this.onChange) {
      this.onChange(this);
    }
  }

  template() {
    let attributes = (this.schema && this.schema.attributes) || {};
    let type = attributes.type ? attributes.type : this.constructor.primitives[this.type];
    return html`
      ${this.type === 'boolean'
        ? html`
            <input type="checkbox" .checked="${this.value}" ?required="${this.required}" @change="${this._onChange.bind(this)}" />
          `
        : html`
            <input type="${type}" .value="${this.value}" ?required="${this.required}" .step="${this.step || 1}" @change="${this._onChange.bind(this)}" />
          `}
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
    if ((!this.items || !this.items.length) && this.options) {
      let items = [];
      Object.keys(this.options).forEach((k) => {
        items.push({ _id: k, name: this.options[k] });
      });
      this.items = items;
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
      <select @change="${this._onChange.bind(this)}" ?required="${this.required}" ?multiple="${this.multiple}" ?novalue="${!this.value}" ?disabled="${this.schema && this.schema.attributes && this.schema.attributes.disabled}">
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

class DateTime extends BaseComponent {
  static get is() {
    return 'fc-date-time';
  }

  static get properties() {
    return {
      value: {
        type: Number,
        value: 0,
        notify: true
      }
    };
  }

  template() {
    let attributes = (this.schema && this.schema.attributes) || {};
    let v = this.value - new Date().getTimezoneOffset() * 60 * 1000;
    return html`
      <input type="datetime-local" .valueAsNumber="${v}" @change="${(e) => this._onChange(e)}" .min="${attributes.min || ''}" .max="${attributes.max || ''}" />
    `;
  }

  _onChange(e) {
    this.value = e.target.valueAsNumber + new Date().getTimezoneOffset() * 60 * 1000;
  }
}

function getInputInstance({ schema, value, externalStyles }) {
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
  let objProps = { schema, value, externalStyles };
  [
    //
    'labels',
    'placeholder',
    'placeholders',
    'type',
    'modelName',
    'items',
    'images',
    'options',
    'required',
    'multiple',
    'buttonText',
    'dropzoneText',
    'urlPrefix',
    'accept',
    'disabled',
    'step'
  ].forEach((k) => {
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
      let wInstance = this._initWInstance(valueItem, i);
      fields.push(wInstance);
    });
    this.fields = fields;
    this.render();
  }

  _initWInstance(value, i) {
    let wInstance = getInputInstance({ schema: this.schema.items, value, externalStyles: this.externalStyles });
    Object.defineProperty(this.value, typeof i === 'number' ? i : this.value.length, {
      get() {
        return wInstance.value;
      },
      set(v) {
        wInstance.value = v;
      },
      enumerable: true,
      configurable: true
    });
    return wInstance;
  }

  _add() {
    let wInstance = this._initWInstance();
    this.fields.push(wInstance);
    this.render();
  }

  _remove(i) {
    this.value.splice(i, 1);
    this.fields.splice(i, 1);
    this.render();
  }

  template() {
    return html`
      <div>
        ${(this.fields || []).map(
          (item, i) =>
            html`
              <div class="fc-array-item">
                ${item.el instanceof HTMLElement ? item.el : item}
                <a class="fc-array-item-remove" @click="${() => this._remove(i)}"><span>⨯</span></a>
              </div>
            `
        )}
        <a class="fc-array-item-add" @click="${() => this._add()}"><span>+</span></a>
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
        let wInstance = getInputInstance({ schema, value, externalStyles: this.externalStyles });
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
      <div>
        ${(this.fields || []).map(
          (item) =>
            html`
              <div class="fc-object-item">
                <label ?hidden="${!item.schema.label}">${item.schema.label}</label>
                ${item.el instanceof HTMLElement ? item.el : item}
              </div>
            `
        )}
      </div>
    `;
  }

  get valueClone() {
    return JSON.parse(JSON.stringify(this.value));
  }
}

//class names started with "FC" are for internal widgets
Object.assign(widgets, { FCObject, FCArray, FCPrimitive, FCSelect, DateTime });

function fc() {
  return new FCObject(...arguments).el;
}

export { getInputInstance, widgets, fc };
