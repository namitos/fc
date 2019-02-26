import { BaseComponentMixin } from '../webcomponents-collection/BaseComponentMixin.js';
import { render, html } from '../lit-html/lit-html.js';

export { html };

export class BaseComponent extends BaseComponentMixin() {
  template() {
    throw { name: 'BaseComponentError', text: 'template() method required' };
  }

  render() {
    render(this.template(), this._content);
    return this;
  }
}
